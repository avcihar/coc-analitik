import os
import json
from pathlib import Path
import cv2
import numpy as np

OUTPUT_DIR = Path("scripts/debug_priority_5")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 1. Load assetsConfig.ts or scenery_measurements.json
with open("scripts/scenery_measurements.json", "r", encoding="utf-8") as f:
    measurements = json.load(f)

m_dict = {m["id"]: m for m in measurements}

priority_ids = ["winter", "fireandice", "barbarian_odyssey", "glory_arena", "9th_clashiversary"]

# COC 44x44 wall art coordinates (from WallArtView bitmap engine with "COC" centered)
# Let's define simple "COC" bitmap in 44x44 grid:
# 'C': cols 8..15, rows 16..28
# 'O': cols 18..26, rows 16..28
# 'C': cols 29..36, rows 16..28
coc_cells = []
# 'C' (left)
for r in range(16, 29):
    coc_cells.append((r, 8))
    coc_cells.append((r, 9))
    if r in [16, 17, 27, 28]:
        for c in range(10, 16):
            coc_cells.append((r, c))

# 'O' (center)
for r in range(16, 29):
    coc_cells.append((r, 18))
    coc_cells.append((r, 19))
    coc_cells.append((r, 25))
    coc_cells.append((r, 26))
    if r in [16, 17, 27, 28]:
        for c in range(20, 25):
            coc_cells.append((r, c))

# 'C' (right)
for r in range(16, 29):
    coc_cells.append((r, 29))
    coc_cells.append((r, 30))
    if r in [16, 17, 27, 28]:
        for c in range(31, 37):
            coc_cells.append((r, c))

wall_img_path = Path("frontend/public/walls/Wall19.webp")
wall_sprite = cv2.imread(str(wall_img_path), cv2.IMREAD_UNCHANGED)

for sc_id in priority_ids:
    data = m_dict[sc_id]
    sc_path = Path("frontend/public") / data["file"].lstrip("/")
    if not sc_path.exists():
        sc_path = Path("frontend/public/sceneries") / data["file"]
    
    img = cv2.imread(str(sc_path))
    h, w, _ = img.shape
    
    top = data["top"]
    right = data["right"]
    bottom = data["bottom"]
    left = data["left"]
    
    # --- 1. Alignment Debug Image ---
    vis_align = img.copy()
    
    # Draw 44x44 grid
    p_top = np.array([top["x"], top["y"]])
    p_right = np.array([right["x"], right["y"]])
    p_bottom = np.array([bottom["x"], bottom["y"]])
    p_left = np.array([left["x"], left["y"]])
    
    poly = np.array([p_top, p_right, p_bottom, p_left], np.int32)
    
    if data["verified"]:
        cv2.polylines(vis_align, [poly], True, (0, 255, 0), 4) # Green for verified
    else:
        cv2.polylines(vis_align, [poly], True, (0, 0, 255), 4) # Red for unverified
    
    # Grid lines
    for i in range(45):
        u = i / 44.0
        p0 = (1 - u) * p_top + u * p_right
        p1 = (1 - u) * p_left + u * p_bottom
        cv2.line(vis_align, (int(round(p0[0])), int(round(p0[1]))), (int(round(p1[0])), int(round(p1[1]))), (255, 255, 255), 1)
        
        v = i / 44.0
        q0 = (1 - v) * p_top + v * p_left
        q1 = (1 - v) * p_right + v * p_bottom
        cv2.line(vis_align, (int(round(q0[0])), int(round(q0[1]))), (int(round(q1[0])), int(round(q1[1]))), (255, 255, 255), 1)
        
    # Mark corners with circles & labels
    cv2.circle(vis_align, (int(round(p_top[0])), int(round(p_top[1]))), 10, (0, 255, 255), -1)
    cv2.circle(vis_align, (int(round(p_right[0])), int(round(p_right[1]))), 10, (0, 255, 255), -1)
    cv2.circle(vis_align, (int(round(p_bottom[0])), int(round(p_bottom[1]))), 10, (0, 255, 255), -1)
    cv2.circle(vis_align, (int(round(p_left[0])), int(round(p_left[1]))), 10, (0, 255, 255), -1)
    
    # Status banner
    banner_text = f"{data['name']} - Status: {data['status']} ({data['method']})"
    cv2.putText(vis_align, banner_text, (50, 80), cv2.FONT_HERSHEY_SIMPLEX, 1.8, (0, 255, 255), 4)
    if not data["verified"]:
        cv2.putText(vis_align, "GUVENILMEZ - STANDART DISI STADYUM / ELMAS YOK (SECICIDEN GIZLENDI)", (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0, 0, 255), 3)

    scale = 1200.0 / w
    preview_align = cv2.resize(vis_align, (1200, int(h * scale)))
    out_align_path = OUTPUT_DIR / f"alignment_{sc_id}.png"
    cv2.imwrite(str(out_align_path), preview_align)
    print(f"Saved {out_align_path}")

    # --- 2. In-Game Preview Simulation (COC in Level 19 walls) ---
    vis_coc = img.copy()
    if data["verified"] and wall_sprite is not None:
        dw = p_right[0] - p_left[0]
        dh = p_bottom[1] - p_top[1]
        cell_w = dw / 44.0
        cell_h = dh / 44.0
        
        # Sort cells in painter's order
        sorted_cells = sorted(coc_cells, key=lambda rc: (rc[0] + rc[1], rc[0]))
        
        sprite_w = int(round(cell_w * 1.05))
        sprite_h = int(round(sprite_w * (73.0 / 58.0)))
        if sprite_w > 0 and sprite_h > 0:
            scaled_wall = cv2.resize(wall_sprite, (sprite_w, sprite_h), interpolation=cv2.INTER_AREA)
            
            ux = p_right[0] - p_top[0]
            uy = p_right[1] - p_top[1]
            vx = p_left[0] - p_top[0]
            vy = p_left[1] - p_top[1]
            
            for r, c in sorted_cells:
                u = (c + 0.5) / 44.0
                v = (r + 0.5) / 44.0
                cx = p_top[0] + u * ux + v * vx
                cy = p_top[1] + u * uy + v * vy
                
                # anchor point (x=center, y=60/73)
                anchor_x = sprite_w // 2
                anchor_y = int(sprite_h * (60.0 / 73.0))
                
                x1 = int(round(cx - anchor_x))
                y1 = int(round(cy - anchor_y))
                x2 = x1 + sprite_w
                y2 = y1 + sprite_h
                
                if x1 < 0 or y1 < 0 or x2 >= w or y2 >= h:
                    continue
                
                # Alpha blend
                alpha = scaled_wall[:, :, 3] / 255.0
                for ch in range(3):
                    vis_coc[y1:y2, x1:x2, ch] = (
                        alpha * scaled_wall[:, :, ch] + (1 - alpha) * vis_coc[y1:y2, x1:x2, ch]
                    )

    preview_coc = cv2.resize(vis_coc, (1200, int(h * scale)))
    out_coc_path = OUTPUT_DIR / f"preview_coc_{sc_id}.png"
    cv2.imwrite(str(out_coc_path), preview_coc)
    print(f"Saved {out_coc_path}")

print("All priority test images generated successfully.")

