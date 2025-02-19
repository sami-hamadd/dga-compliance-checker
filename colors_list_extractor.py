def hex_to_rgb(hex_color):
    """Convert hex color (e.g., FFFFFF) to an RGB tuple."""
    hex_color = hex_color.strip()  # Remove any whitespace or newline characters
    if len(hex_color) != 6:
        raise ValueError(f"Invalid hex color: {hex_color}")
    
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    return f"rgb({r}, {g}, {b})"

def process_colors(file_path):
    """Read hex colors from a file and convert them to an RGB list."""
    with open(file_path, 'r') as file:
        hex_colors = file.readlines()

    rgb_colors = [hex_to_rgb(color) for color in hex_colors if color.strip()]  # Remove empty lines
    return rgb_colors

def main():
    file_path = "allowed_colors.txt"
    rgb_colors = process_colors(file_path)

    # Format the output as required
    output = "ALLOWED_COLORS: [\n"
    output += ",\n".join(f"    '{color}'" for color in rgb_colors)
    output += "\n],"

    print(output)

if __name__ == "__main__":
    main()
