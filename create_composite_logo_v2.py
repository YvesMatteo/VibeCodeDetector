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

    # Create 'C' icon by rotating or transforming the original icon
    # The original icon is a Checkmark in a triangle/shield.
    # Rotating -90deg? 
    # Let's try to make it look like a C.
    icon_c = icon.rotate(90, expand=True) # rotate 90 counter-clockwise -> points left? 
    # Or rotate -90 (270) -> points right?
    # User said "icon on the left" for V. "C should be replaced with something similar".
    # I'll try rotating 90 degrees clockwise (which is -90 in PIL? No, rotate arg is CCW).
    # rotate(-90) -> Clockwise 90deg. Top becomes Right.
    # rotate(90) -> CCW 90deg. Top becomes Left.
    
    # Let's assume rotating 90 degrees CCW (pointing left) might look like a 'C' if the original points down?
    # Actually, simpler is just to use the icon as is but maybe flipped horizontally?
    # Or just use the icon twice.
    # Let's try rotating -90 (270) -> pointing Right? A 'C' is open on the right.
    # So if the shape is like a V (open top), rotating it 90 deg clockwise (point right) makes it open left? No, V points down. Open top.
    # Rotate 90 deg clockwise -> Open Right. -> 'C'.
    # So rotate(-90).
    
    icon_c = icon.rotate(-90, expand=True)

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

    # Font size
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
    
    # Text parts
    # [C-icon] + "heck" + [V-icon] + "ibe"
    
    # t1: "heck"
    t1_bbox = draw.textbbox((0, 0), "heck", font=font)
    t1_w = t1_bbox[2] - t1_bbox[0]
    t1_h = t1_bbox[3] - t1_bbox[1]
    
    # t2: "ibe"
    t2_bbox = draw.textbbox((0, 0), "ibe", font=font)
    t2_w = t2_bbox[2] - t2_bbox[0]
    t2_h = t2_bbox[3] - t2_bbox[1]
    
    gap = int(icon_w * 0.1) 
    
    # Layout:
    # [icon_c] [gap] [heck] [gap] [icon_v] [gap] [ibe]
    
    total_w = icon_c.width + gap + t1_w + gap + icon_w + gap + t2_w
    canvas_h = max(icon_h, icon_c.height, t1_h, t2_h)
    
    img = Image.new('RGBA', (int(total_w), int(canvas_h)), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    current_x = 0
    
    # Draw C-icon
    icon_c_y = int((canvas_h - icon_c.height) / 2)
    img.paste(icon_c, (current_x, icon_c_y), icon_c)
    current_x += icon_c.width + gap
    
    # Draw "heck"
    d.text((current_x, canvas_h/2), "heck", font=font, fill="white", anchor="lm")
    current_x += t1_w + gap
    
    # Draw V-icon
    icon_v_y = int((canvas_h - icon_h) / 2)
    img.paste(icon, (current_x, icon_v_y), icon)
    current_x += icon_w + gap
    
    # Draw "ibe"
    d.text((current_x, canvas_h/2), "ibe", font=font, fill="white", anchor="lm")
    
    img.save(output_path)
    print(f"Saved revised logo to {output_path}")

create_composite()
