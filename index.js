const puppeteer = require('puppeteer');
const fs = require('fs');
const { ALLOWED_COLORS } = require('./config');

async function runComplianceCheck(url) {
    console.log(`\n🔍 Checking color compliance for: ${url}`);

    // Launch Puppeteer with extra options for compatibility
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set a standard user agent for better compatibility
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/58.0.3029.110 Safari/537.36'
    );

    // Navigate with extended timeout and error handling
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('body', { timeout: 60000 });
    } catch (error) {
        console.error(`Error loading page: ${error.message}`);
        await browser.close();
        return;
    }

    // Select all elements
    const elements = await page.$$('*');

    let violations = [];
    let logOutput = `Color Compliance Report for: ${url}\n\n`;

    // Extract computed styles for every element
    const elementData = await Promise.all(elements.map(async (element) => {
        return await page.evaluate(el => {
            const computedStyle = window.getComputedStyle(el);
            return {
                tagName: el.tagName.toLowerCase(),
                className: el.className || 'no-class',
                textContent: el.innerText ? el.innerText.trim().substring(0, 50) : 'No text',
                color: computedStyle.color,
                backgroundColor: computedStyle.backgroundColor,
                borderColor: computedStyle.borderColor,
                display: computedStyle.display,
                visibility: computedStyle.visibility,
                opacity: computedStyle.opacity
            };
        }, element);
    }));

    // Filter out hidden elements
    const visibleElements = elementData.filter(el =>
        el.display !== 'none' && el.visibility !== 'hidden' && parseFloat(el.opacity) > 0
    );

    // Process each visible element and group only the properties that are non-compliant
    visibleElements.forEach(el => {
        let elementViolations = {};

        if (!ALLOWED_COLORS.includes(el.color)) {
            elementViolations.color = el.color;
        }
        if (
            !ALLOWED_COLORS.includes(el.backgroundColor) &&
            el.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
            el.backgroundColor !== 'transparent'
        ) {
            elementViolations.backgroundColor = el.backgroundColor;
        }
        if (
            !ALLOWED_COLORS.includes(el.borderColor) &&
            el.borderColor !== 'rgba(0, 0, 0, 0)' &&
            el.borderColor !== 'transparent'
        ) {
            elementViolations.borderColor = el.borderColor;
        }

        if (Object.keys(elementViolations).length > 0) {
            violations.push({
                tagName: el.tagName,
                className: el.className,
                textContent: el.textContent,
                violations: elementViolations
            });
        }
    });

    await browser.close();

    // Build the final log report (one report per element with only the failing properties)
    if (violations.length > 0) {
        violations.forEach(v => {
            logOutput += `🚨 Violation Found: <${v.tagName} class="${v.className}"> "${v.textContent}"\n`;
            Object.entries(v.violations).forEach(([property, value]) => {
                logOutput += `   - ❌ ${property}: ${value}\n`;
            });
            logOutput += '\n';
        });

        // Calculate total count of property violations (if an element has >1 violation, count them all)
        const totalViolations = violations.reduce(
            (acc, cur) => acc + Object.keys(cur.violations).length, 0
        );
        logOutput += `=== 🚨 COLOR VIOLATIONS DETECTED (${totalViolations}) ===\n`;
        logOutput += `\n❌ Total Violations: ${totalViolations}\n`;
    } else {
        logOutput += '\n✅ No color violations found!\n';
    }

    // Write the results to a file
    fs.writeFileSync('results.txt', logOutput);
    console.log(`\n✅ Results saved to results.txt`);
}

(async () => {
    const argIndex = process.argv.indexOf('--url');

    // Validate that the --url flag is provided and has an accompanying value
    if (argIndex === -1 || !process.argv[argIndex + 1]) {
        console.error('❌ Error: You must provide a URL using the --url flag.');
        console.error('Usage: npm start -- --url https://example.com');
        process.exit(1); // Exit with a non-zero status to indicate error
    }

    const url = process.argv[argIndex + 1];
    console.log(`🔎 Checking: ${url}`);

    // Run compliance check
    await runComplianceCheck(url);
})();

