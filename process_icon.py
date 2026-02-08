from PIL import Image
import os

def process_image(input_path, output_paths):
    img = Image.open(input_path)
    
    # 1. Detect bbox of non-white content or just assume center crop if it's huge
    # But better approach given the prompt: "Texture of a solid deep navy blue surface"
    # It likely generated a full square. The issue might be the previous generation had a frame.
    # We will crop the center square to be safe, removing 5% from edges if there's a frame.
    
    width, height = img.size
    
    # Check if there is a white border (approx white)
    # Simple heuristic: Crop 10 pixels from edges to remove potential white lines
    # Then resize to target sizes.
    
    # Reduced crop to 50px: enough to remove rounded corners (usually ~30-40px) 
    # but safe enough to keep the crown and pillars intact.
    crop_amount = 50 
    img = img.crop((crop_amount, crop_amount, width - crop_amount, height - crop_amount))
    
    # Resize to 512x512
    icon_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    
    # Resize to 192x192
    icon_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    
    for path in output_paths:
        if '192' in path:
            icon_192.save(path)
        else:
            icon_512.save(path)
            
    print("Images processed and saved.")

input_img = "/home/achat/.gemini/antigravity/brain/8d18175a-084d-4540-a6fa-0079d8e16d1e/alcance_victoria_logo_crown_pillars_1770588859021.png"
outputs = [
    "/home/achat/code/alcance-victoria-honra/public/pwa-512x512.png",
    "/home/achat/code/alcance-victoria-honra/public/pwa-192x192.png",
    "/home/achat/code/alcance-victoria-honra/public/favicon.png",
    "/home/achat/code/alcance-victoria-honra/public/favicon.ico"
]

process_image(input_img, outputs)
