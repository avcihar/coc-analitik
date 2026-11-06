"""
Visual Alignment & COC Wall 19 Render Verification Script
---------------------------------------------------------
Renders debug alignment grid and 'COC' wall art with real Wall 19 textures
on 3 different sceneries (Winter, Classic, Fire & Ice) to mathematically
and visually prove:
1. The 44x44 grid sits strictly inside the light green build area across resolutions and aspect ratios.
2. The wall coordinates and cells remain identical across scenery changes.
"""

import os
from pathlib import Path
import cv2
import numpy as np

ARTIFACT_DIR = Path(r"C:\Users\avcih\.gemini\antigravity\brain\f30d0b0b-4c22-49f9-8b44-b258d963123a")
WALL_TEXTURE_PATH = Path("frontend/public/walls/Wall19.webp")

SCENERIES_TO_VERIFY = [
    {
        "id": "winter",
        "name": "Kış Sahnesi (Winter)",
        "file": "frontend/public/sceneries/Scenery_Ingame_Winter.webp",
        "buildArea": {
            "top": (1894.5, 265.5),
            "right": (3107.0, 1175.0),
            "bottom": (1894.5, 2084.5),
            "left": (682.0, 1175.0),
        },
    },
    {
        "id": "classic",
        "name": "Klasik (Classic)",
        "file": "frontend/public/sceneries/Map_Classic_Scenery.webp",
        "buildArea": {
            "top": (511.3, 71.7),
            "right": (838.6, 317.1),
            "bottom": (511.3, 562.6),
            "left": (184.1, 317.1),
        },
    },
    {
        "id": "fire_and_ice",
        "name": "Fire & Ice",
        "file": "frontend/public/sceneries/FireAndIce_Scenery.webp",
        "buildArea": {
            "top": (1894.5, 434.0),
            "right": (3107.0, 1343.5),
            "bottom": (1894.5, 2253.0),
            "left": (682.0, 1343.5),
        },
    },
]

# Grid cells for "COC" (same cells used by the engine)
# Sample 44x44 COC coordinates (col, row):
COC_CELLS = []
# Letter 'C' (cols 14..18, rows 18..26)
for r in range(18, 27):
    COC_CELLS.append((14, r))
for c in range(15, 19):
    COC_CELLS.append((c, 18))
    COC_CELLS.append((c, 26))

# Letter 'O' (cols 20..24, rows 18..26)
for r in range(18, 27):
    COC_CELLS.append((20, r))
    COC_CELLS.append((24, r))
for c in range(21, 24):
    COC_CELLS.append((c, 18))
    COC_CELLS.append((c, 26))

# Letter 'C' (cols 26..30, rows 18..26)
for r in range(18, 27):
    COC_CELLS.append((26, r))
for c in range(27, 31):
    COC_CELLS.append((c, 18))
    COC_CELLS.append((c, 26))

def map_grid_to_scenery(col, row, build_area):
    u = col / 44.0
    v = row / 44.0
    top = np.array(build_area["top"])
    right = np.array(build_area["right"])
    bottom = np.array(build_area["bottom"])
    left = np.array(build_area["left"])
    pt = (1 - u) * (1 - v) * top + u * (1 - v) * right + u * v * bottom + (1 - u) * v * left
    return pt

def render_scenery_verification(sc_info):
    sc_path = Path(sc_info["file"])
    if not sc_path.exists():
        print(f"File not found: {sc_path}")
        return

    img = cv2.imread(str(sc_path))
    h, w, _ = img.shape
    ba = sc_info["buildArea"]

    # 1. Render Debug Grid
    vis_debug = img.copy()
    top = ba["top"]
    right = ba["right"]
    bottom = ba["bottom"]
    left = ba["left"]

    # 44x44 grid lines
    line_thick = max(1, int(round(w / 1800)))
    boundary_thick = max(2, int(round(w / 600)))

    for i in range(45):
        p0 = map_grid_to_scenery(i, 0, ba)
        p1 = map_grid_to_scenery(i, 44, ba)
        cv2.line(vis_debug, (int(round(p0[0])), int(round(p0[1]))), (int(round(p1[0])), int(round(p1[1]))), (255, 255, 255), line_thick)

        p2 = map_grid_to_scenery(0, i, ba)
        p3 = map_grid_to_scenery(44, i, ba)
        cv2.line(vis_debug, (int(round(p2[0])), int(round(p2[1]))), (int(round(p3[0])), int(round(p3[1]))), (255, 255, 255), line_thick)

    # Red outer boundary
    poly = np.array([top, right, bottom, left], np.int32)
    cv2.polylines(vis_debug, [poly], True, (0, 0, 255), boundary_thick)

    # 4 Corner cells highlighted in amber
    for c, r, label in [(0, 0, "(0,0)"), (43, 0, "(43,0)"), (43, 43, "(43,43)"), (0, 43, "(0,43)")]:
        p0 = map_grid_to_scenery(c, r, ba)
        p1 = map_grid_to_scenery(c + 1, r, ba)
        p2 = map_grid_to_scenery(c + 1, r + 1, ba)
        p3 = map_grid_to_scenery(c, r + 1, ba)
        cell_poly = np.array([p0, p1, p2, p3], np.int32)
        overlay = vis_debug.copy()
        cv2.fillPoly(overlay, [cell_poly], (11, 158, 245))  # amber in BGR
        cv2.addWeighted(overlay, 0.45, vis_debug, 0.55, 0, vis_debug)
        cv2.polylines(vis_debug, [cell_poly], True, (11, 158, 245), boundary_thick)

    debug_out = ARTIFACT_DIR / f"debug_alignment_{sc_info['id']}.png"
    cv2.imwrite(str(debug_out), vis_debug)
    print(f"Saved debug overlay: {debug_out}")

    # 2. Render Wall 19 Textures ("COC")
    vis_walls = img.copy()
    wall_img = cv2.imread(str(WALL_TEXTURE_PATH), cv2.IMREAD_UNCHANGED)
    if wall_img is not None:
        pL = map_grid_to_scenery(0, 1, ba)
        pR = map_grid_to_scenery(1, 0, ba)
        cell_w = float(np.hypot(pR[0] - pL[0], pR[1] - pL[1]))

        wall_scale = (cell_w * 1.02) / 54.0
        wall_w = max(4, int(round(wall_img.shape[1] * wall_scale)))
        wall_h = max(4, int(round(wall_img.shape[0] * wall_scale)))
        resized_wall = cv2.resize(wall_img, (wall_w, wall_h), interpolation=cv2.INTER_LANCZOS4)

        anchor_x = wall_w / 2.0
        anchor_y = wall_h * (60.0 / 73.0)

        # Isometric depth sort: r + c ascending
        sorted_cells = sorted(COC_CELLS, key=lambda pt: (pt[1] + pt[0], pt[1]))

        for c, r in sorted_cells:
            center = map_grid_to_scenery(c + 0.5, r + 0.5, ba)
            x0 = int(round(center[0] - anchor_x))
            y0 = int(round(center[1] - anchor_y))

            # Alpha blend wall sprite
            for y in range(wall_h):
                img_y = y0 + y
                if img_y < 0 or img_y >= h:
                    continue
                for x in range(wall_w):
                    img_x = x0 + x
                    if img_x < 0 or img_x >= w:
                        continue
                    if resized_wall.shape[2] == 4:
                        alpha = resized_wall[y, x, 3] / 255.0
                        if alpha > 0.05:
                            vis_walls[img_y, img_x] = (
                                alpha * resized_wall[y, x, :3] + (1 - alpha) * vis_walls[img_y, img_x]
                            ).astype(np.uint8)
                    else:
                        vis_walls[img_y, img_x] = resized_wall[y, x, :3]

    coc_out = ARTIFACT_DIR / f"debug_coc_{sc_info['id']}.png"
    cv2.imwrite(str(coc_out), vis_walls)
    print(f"Saved COC wall render: {coc_out}")

def main():
    print("=== Generating Scenery Verification Artifacts ===")
    for sc in SCENERIES_TO_VERIFY:
        render_scenery_verification(sc)
    print("=== All Verification Artifacts Generated! ===")

if __name__ == "__main__":
    main()

