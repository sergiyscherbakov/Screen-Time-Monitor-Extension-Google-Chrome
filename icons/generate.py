#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Create PNG icons from scratch"""

try:
    from PIL import Image, ImageDraw
    import os
    import math
except ImportError:
    print("Error: Need Pillow library")
    print("Install: pip install Pillow")
    exit(1)

def create_icon(size, output_path):
    """Create icon of specified size"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background color (gradient average)
    color = (110, 100, 198, 255)  # Average of #667eea and #764ba2

    # Rounded rectangle background
    draw.rounded_rectangle(
        [(0, 0), (size, size)],
        radius=int(size * 0.15),
        fill=color
    )

    # Clock parameters
    center_x = size // 2
    center_y = size // 2
    radius = int(size * 0.35)

    # Clock circle
    circle_width = max(2, size // 20)
    draw.ellipse(
        [center_x - radius, center_y - radius,
         center_x + radius, center_y + radius],
        outline=(255, 255, 255, 255),
        width=circle_width
    )

    # Hour hand
    hour_len = radius * 0.5
    hour_angle = math.pi / 3 - math.pi / 2
    hour_x = center_x + hour_len * math.cos(hour_angle)
    hour_y = center_y + hour_len * math.sin(hour_angle)
    hour_width = max(2, size // 25)
    draw.line(
        [(center_x, center_y), (hour_x, hour_y)],
        fill=(255, 255, 255, 255),
        width=hour_width
    )

    # Minute hand
    min_len = radius * 0.7
    min_x = center_x
    min_y = center_y - min_len
    min_width = max(1, size // 30)
    draw.line(
        [(center_x, center_y), (min_x, min_y)],
        fill=(255, 255, 255, 255),
        width=min_width
    )

    # Center dot
    dot_radius = max(2, size // 25)
    draw.ellipse(
        [center_x - dot_radius, center_y - dot_radius,
         center_x + dot_radius, center_y + dot_radius],
        fill=(255, 255, 255, 255)
    )

    # Save
    img.save(output_path, 'PNG')
    print(f"Created: {output_path} ({size}x{size})")

def main():
    print("\nGenerating Chrome extension icons...")
    print("-" * 50)

    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Create icons
    for size in [16, 48, 128]:
        output_path = os.path.join(script_dir, f"icon{size}.png")
        create_icon(size, output_path)

    print("\nAll icons created successfully!")
    print(f"Location: {script_dir}")

if __name__ == "__main__":
    main()
