const puppeteer = require('puppeteer');
const fs = require('fs');
const { ALLOWED_COLORS } = require('./config');

async function runComplianceCheck(url) {
    console.log(`\n🔍 Checking color compliance for: ${url}`);

    // Launch Puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Navigate to URL and wait until it's fully loaded
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForSelector('body');

    // Select all elements
    const elements = await page.$$('*');

    let violations = [];
    let logOutput = `Color Compliance Report for: ${url}\n\n`;

    // Extract computed styles
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

    // Process visible elements and check for violations
    visibleElements.forEach(el => {
        let violated = false;

        if (!ALLOWED_COLORS.includes(el.color)) {
            violations.push({
                element: el.tagName,
                className: el.className,
                textContent: el.textContent,
                property: 'color',
                value: el.color
            });
            violated = true;
        }

        if (!ALLOWED_COLORS.includes(el.backgroundColor) && el.backgroundColor !== 'rgba(0, 0, 0, 0)' && el.backgroundColor !== 'transparent') {
            violations.push({
                element: el.tagName,
                className: el.className,
                textContent: el.textContent,
                property: 'background-color',
                value: el.backgroundColor
            });
            violated = true;
        }

        if (!ALLOWED_COLORS.includes(el.borderColor) && el.borderColor !== 'rgba(0, 0, 0, 0)' && el.borderColor !== 'transparent') {
            violations.push({
                element: el.tagName,
                className: el.className,
                textContent: el.textContent,
                property: 'border-color',
                value: el.borderColor
            });
            violated = true;
        }

        // Append violations to the log output
        if (violated) {
            logOutput += `🚨 Violation Found: <${el.tagName} class="${el.className}"> "${el.textContent}"\n`;
            logOutput += `   - ❌ Color: ${el.color}\n`;
            logOutput += `   - ❌ Background: ${el.backgroundColor}\n`;
            logOutput += `   - ❌ Border: ${el.borderColor}\n\n`;
        }
    });

    await browser.close();

    // Report Results
    if (violations.length > 0) {
        logOutput += `=== 🚨 COLOR VIOLATIONS DETECTED (${violations.length}) ===\n`;
        violations.forEach((v, idx) => {
            logOutput += `${idx + 1}. <${v.element} class="${v.className}"> "${v.textContent}" has disallowed ${v.property}: ${v.value}\n`;
        });
        logOutput += `\n❌ Total Violations: ${violations.length}\n`;
    } else {
        logOutput += '\n✅ No color violations found!\n';
    }

    // Write results to a file
    fs.writeFileSync('results.txt', logOutput);
    console.log(`\n✅ Results saved to results.txt`);
}

(async () => {
    const argIndex = process.argv.indexOf('--url');
    let url = 'https://example.com'; // Default URL

    if (argIndex > -1 && process.argv[argIndex + 1]) {
        url = process.argv[argIndex + 1];
    }

    console.log(`🔎 Checking: ${url}`);

    // Run compliance check
    await runComplianceCheck(url);
})();
