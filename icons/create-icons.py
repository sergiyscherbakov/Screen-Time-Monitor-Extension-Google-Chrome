#!/usr/bin/env python3
"""
Скрипт для створення іконок PNG з SVG файлу
Потребує: pip install Pillow cairosvg
"""

try:
    from PIL import Image, ImageDraw
    import os
except ImportError:
    print("❌ Помилка: Потрібна бібліотека Pillow")
    print("   Встановіть: pip install Pillow")
    exit(1)

def create_icon(size, output_path):
    """Створює іконку заданого розміру"""
    # Створення нового зображення з білим фоном
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Градієнт (наближений через прямокутник)
    # Колір #667eea
    color1 = (102, 126, 234, 255)
    # Колір #764ba2
    color2 = (118, 75, 162, 255)

    # Малюємо фон з градієнтом (спрощено - середній колір)
    avg_color = tuple((c1 + c2) // 2 for c1, c2 in zip(color1, color2))

    # Округлений прямокутник для фону
    draw.rounded_rectangle(
        [(0, 0), (size, size)],
        radius=int(size * 0.15),
        fill=avg_color
    )

    # Параметри годинника
    center_x = size // 2
    center_y = size // 2
    radius = int(size * 0.35)

    # Коло годинника
    circle_width = max(2, size // 20)
    draw.ellipse(
        [center_x - radius, center_y - radius,
         center_x + radius, center_y + radius],
        outline=(255, 255, 255, 255),
        width=circle_width
    )

    # Годинна стрілка (під кутом)
    import math
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

    # Хвилинна стрілка (вертикально вгору)
    min_len = radius * 0.7
    min_x = center_x
    min_y = center_y - min_len
    min_width = max(1, size // 30)
    draw.line(
        [(center_x, center_y), (min_x, min_y)],
        fill=(255, 255, 255, 255),
        width=min_width
    )

    # Центральна точка
    dot_radius = max(2, size // 25)
    draw.ellipse(
        [center_x - dot_radius, center_y - dot_radius,
         center_x + dot_radius, center_y + dot_radius],
        fill=(255, 255, 255, 255)
    )

    # Збереження
    img.save(output_path, 'PNG')
    print(f"✓ Створено: {output_path} ({size}x{size})")

def main():
    """Основна функція"""
    print("\n🎨 Генерація іконок для розширення Chrome...")
    print("━" * 50)

    # Отримання шляху до папки скрипта
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Створення іконок
    sizes = [16, 48, 128]
    for size in sizes:
        output_path = os.path.join(script_dir, f"icon{size}.png")
        create_icon(size, output_path)

    print("\n✅ Всі іконки успішно створено!")
    print(f"📁 Розташування: {script_dir}")
    print("\n💡 Тепер можна встановити розширення в Chrome!")

if __name__ == "__main__":
    main()
