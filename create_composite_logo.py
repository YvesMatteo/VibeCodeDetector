from PIL import Image, ImageDraw, ImageFont
import os
import sys

def create_composite():
    icon_path = 'dashboard/public/logo.png'
    output_path = 'dashboard/public/logo-composite.png'
    
    if not os.path.exists(icon_path):
        print(f"Error: {icon_path} not found")
        sys.exit(1)

    icon = Image.open(icon_path).convert('RGBA')
    icon_w, icon_h = icon.size
    print(f"Icon size: {icon_w}x{icon_h}")

    # Use a rounded font if possible
    font_paths = [
        '/System/Library/Fonts/SFNSRounded.ttf',
        '/System/Library/Fonts/SFCompactRounded.ttf',
        '/Library/Fonts/Arial Unicode.ttf',
        '/System/Library/Fonts/Helvetica.ttc'
    ]
    
    font_path = None
    for p in font_paths:
        if os.path.exists(p):
            font_path = p
            print(f"Using font: {p}")
            break
            
    if not font_path:
        print("No suitable font found")
        sys.exit(1)

    # Font size matching icon height roughly
    # Try to make Cap height match icon height
    font_size = int(icon_h * 1.0)
    try:
        font = ImageFont.truetype(font_path, font_size)
    except:
        try:
            font = ImageFont.truetype(font_path, font_size, index=0)
        except Exception as e:
            print(f"Font load error: {e}")
            sys.exit(1)

    dummy_img = Image.new('RGBA', (1, 1))
    draw = ImageDraw.Draw(dummy_img)
    
    # Text 1: "Check"
    t1_bbox = draw.textbbox((0, 0), "Check", font=font)
    t1_w = t1_bbox[2] - t1_bbox[0]
    t1_h = t1_bbox[3] - t1_bbox[1]
    
    # Text 2: "ibe"
    t2_bbox = draw.textbbox((0, 0), "ibe", font=font)
    t2_w = t2_bbox[2] - t2_bbox[0]
    t2_h = t2_bbox[3] - t2_bbox[1]
    
    gap = int(icon_w * 0.1) 
    
    total_w = t1_w + gap + icon_w + gap + t2_w
    canvas_h = max(icon_h, t1_h, t2_h)
    # Add a bit of vertical padding around canvas_h if needed, or align based on baseline
    # Let's align vertically center.
    
    img = Image.new('RGBA', (int(total_w), int(canvas_h)), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    # Draw "Check"
    # Vertical center: canvas_h / 2
    # Adjust for ascent/descent? Pillow anchors handle it well usually. 'lm' = Left Middle
    
    d.text((0, canvas_h/2), "Check", font=font, fill="white", anchor="lm")
    
    icon_x = int(t1_w + gap)
    icon_y = int((canvas_h - icon_h) / 2)
    img.paste(icon, (icon_x, icon_y), icon)
    
    text2_x = icon_x + icon_w + gap
    d.text((text2_x, canvas_h/2), "ibe", font=font, fill="white", anchor="lm")
    
    img.save(output_path)
    print(f"Saved to {output_path}")

create_composite()
