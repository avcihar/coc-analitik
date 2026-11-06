import os
import json
import re
from pathlib import Path
from PIL import Image
import cv2
import numpy as np
from process_measurements import analyze_and_compute_diamond

SCENERIES_DIR = Path("frontend/public/sceneries")
ICONS_DIR = Path("frontend/public/sceneries/icons")
ASSETS_TS_PATH = Path("frontend/src/lib/assetsConfig.ts")
MEASUREMENTS_JSON_PATH = Path("scripts/scenery_measurements.json")
DEBUG_DIR = Path("scripts/debug_sceneries")
DEBUG_DIR.mkdir(parents=True, exist_ok=True)

# 1. Read existing assetsConfig.ts to extract existing names, ids, thumbs
with open(ASSETS_TS_PATH, "r", encoding="utf-8") as f:
    ts_code = f.read()

# Pattern to extract scenery objects
pattern = re.compile(
    r'\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*src:\s*"([^"]+)",\s*thumb:\s*"([^"]+)"',
    re.MULTILINE
)

sceneries = []
seen_ids = set()
for match in pattern.finditer(ts_code):
    sc_id, name, src, thumb = match.groups()
    if sc_id in seen_ids:
        continue
    seen_ids.add(sc_id)
    filename = Path(src).name
    img_path = Path("frontend/public") / src.lstrip("/")
    if not img_path.exists():
        print(f"Warning: {img_path} does not exist!")
        continue
    im = Image.open(img_path)
    w, h = im.size
    sceneries.append({
        "id": sc_id,
        "name": name,
        "src": src,
        "thumb": thumb,
        "filename": filename,
        "width": w,
        "height": h,
    })

print(f"Loaded {len(sceneries)} sceneries from assetsConfig.ts.")

# 2. Process each scenery
measurements_list = []
updated_sceneries = []

for sc in sceneries:
    res = analyze_and_compute_diamond(sc["id"], sc["name"], sc["filename"], sc["width"], sc["height"])
    m_entry = {
        "id": sc["id"],
        "name": sc["name"],
        "file": sc["filename"],
        "width": sc["width"],
        "height": sc["height"],
        "status": res["status"],
        "verified": res["verified"],
        "method": res["method"],
        "top": res["top"],
        "right": res["right"],
        "bottom": res["bottom"],
        "left": res["left"],
        "cell_step": res["cell_step"],
        "ratio": res["ratio"],
        "note": res.get("note"),
        "reason": res.get("reason"),
    }
    measurements_list.append(m_entry)

    updated_sceneries.append({
        "id": sc["id"],
        "name": sc["name"],
        "src": sc["src"],
        "thumb": sc["thumb"],
        "naturalWidth": sc["width"],
        "naturalHeight": sc["height"],
        "buildArea": {
            "top": res["top"],
            "right": res["right"],
            "bottom": res["bottom"],
            "left": res["left"],
        },
        "wall": "wall19",
        "verified": res["verified"],
        "status": res["status"],
        "method": res["method"],
        "reason": res.get("reason"),
    })

# 3. Save scenery_measurements.json
with open(MEASUREMENTS_JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(measurements_list, f, indent=2, ensure_ascii=False)
print(f"Saved {MEASUREMENTS_JSON_PATH}.")

# 4. Generate updated assetsConfig.ts
# Find winter scenery for the default ASSETS_CONFIG.scenery
winter = next(s for s in updated_sceneries if s["id"] == "winter")

ts_content = f'''export interface BuildAreaCorners {{
  top: {{ x: number; y: number }};
  right: {{ x: number; y: number }};
  bottom: {{ x: number; y: number }};
  left: {{ x: number; y: number }};
}}

export interface SceneryAssetConfig {{
  id: string;
  name: string;
  src: string;
  thumb: string;
  naturalWidth: number;
  naturalHeight: number;
  buildArea: BuildAreaCorners;
  wall?: string;
  verified?: boolean;
  status?: "Doğrulandı" | "Elle düzeltildi" | "Güvenilmez";
  method?: "calibrated" | "tile-pattern" | "manual" | "none";
  reason?: string;
}}

export interface WallAssetConfig {{
  id: string;
  name: string;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}}

export interface AssetsConfig {{
  scenery: SceneryAssetConfig;
  defaultSceneryId: string;
  sceneries: SceneryAssetConfig[];
  wall: WallAssetConfig;
}}

/**
 * Static configuration for scenery backgrounds and wall textures.
 * 70 Home Village sceneries with individually measured 44x44 isometric build areas.
 */
export const ASSETS_CONFIG: AssetsConfig = {{
  defaultSceneryId: "winter",
  scenery: {{
    id: "{winter['id']}",
    name: "{winter['name']}",
    src: "{winter['src']}",
    thumb: "{winter['thumb']}",
    naturalWidth: {winter['naturalWidth']},
    naturalHeight: {winter['naturalHeight']},
    buildArea: {{
      top: {{ x: {winter['buildArea']['top']['x']}, y: {winter['buildArea']['top']['y']} }},
      right: {{ x: {winter['buildArea']['right']['x']}, y: {winter['buildArea']['right']['y']} }},
      bottom: {{ x: {winter['buildArea']['bottom']['x']}, y: {winter['buildArea']['bottom']['y']} }},
      left: {{ x: {winter['buildArea']['left']['x']}, y: {winter['buildArea']['left']['y']} }},
    }},
    wall: "wall19",
    verified: true,
    status: "Doğrulandı",
    method: "calibrated",
  }},
  wall: {{
    id: "wall19",
    name: "Seviye 19 Duvar (TH17)",
    src: "/walls/Wall19.webp",
    naturalWidth: 115,
    naturalHeight: 115,
  }},
  sceneries: [\n'''

for s in updated_sceneries:
    ts_content += f"""    {{
      id: "{s['id']}",
      name: "{s['name']}",
      src: "{s['src']}",
      thumb: "{s['thumb']}",
      naturalWidth: {s['naturalWidth']},
      naturalHeight: {s['naturalHeight']},
      buildArea: {{
        top: {{ x: {s['buildArea']['top']['x']}, y: {s['buildArea']['top']['y']} }},
        right: {{ x: {s['buildArea']['right']['x']}, y: {s['buildArea']['right']['y']} }},
        bottom: {{ x: {s['buildArea']['bottom']['x']}, y: {s['buildArea']['bottom']['y']} }},
        left: {{ x: {s['buildArea']['left']['x']}, y: {s['buildArea']['left']['y']} }},
      }},
      wall: "wall19",
      verified: {str(s['verified']).lower()},
      status: "{s['status']}",
      method: "{s['method']}",{f'''
      reason: "{s['reason']}",''' if s.get('reason') else ''}
    }},\n"""

ts_content += '''  ],
};

/**
 * Returns the configuration for a given scenery ID, or the default winter scenery.
 */
export function getSceneryConfig(id?: string): SceneryAssetConfig {
  if (!id) return ASSETS_CONFIG.scenery;
  const found = ASSETS_CONFIG.sceneries.find((s) => s.id === id);
  return found || ASSETS_CONFIG.scenery;
}

/**
 * Maps 44x44 grid coordinates (col, row) to natural scenery image pixel coordinates (x, y)
 * using bilinear / affine interpolation between the 4 corners of buildArea.
 *
 * u = col / 44.0 (0.0 to 1.0 along the top->right / left->bottom axis)
 * v = row / 44.0 (0.0 to 1.0 along the top->left / right->bottom axis)
 *
 * Point(u, v) = (1 - u - v + u*v) * Top + u * (1 - v) * Right + (1 - u) * v * Left + u * v * Bottom
 * For an affine parallelogram where Top + Bottom = Right + Left, this reduces to:
 * Point(u, v) = Top + u * (Right - Top) + v * (Left - Top)
 */
export function mapGridToScenery(
  col: number,
  row: number,
  corners: BuildAreaCorners = ASSETS_CONFIG.scenery.buildArea
): { x: number; y: number } {
  const u = col / 44.0;
  const v = row / 44.0;

  // Affine basis vectors from top corner
  const ux = corners.right.x - corners.top.x;
  const uy = corners.right.y - corners.top.y;
  const vx = corners.left.x - corners.top.x;
  const vy = corners.left.y - corners.top.y;

  return {
    x: corners.top.x + u * ux + v * vx,
    y: corners.top.y + u * uy + v * vy,
  };
}

/**
 * Inverse mapping: Maps scenery pixel coordinates (x, y) back to 44x44 grid coordinates (col, row).
 * Solves the 2x2 linear system:
 *   [ux vx] [u]   [x - Top.x]
 *   [uy vy] [v] = [y - Top.y]
 */
export function mapSceneryToGrid(
  pixelX: number,
  pixelY: number,
  corners: BuildAreaCorners = ASSETS_CONFIG.scenery.buildArea
): { col: number; row: number } {
  const ux = corners.right.x - corners.top.x;
  const uy = corners.right.y - corners.top.y;
  const vx = corners.left.x - corners.top.x;
  const vy = corners.left.y - corners.top.y;

  const dx = pixelX - corners.top.x;
  const dy = pixelY - corners.top.y;

  const det = ux * vy - uy * vx;
  if (Math.abs(det) < 1e-6) {
    return { col: 0, row: 0 };
  }

  const u = (dx * vy - dy * vx) / det;
  const v = (ux * dy - uy * dx) / det;

  return {
    col: u * 44.0,
    row: v * 44.0,
  };
}
'''

with open(ASSETS_TS_PATH, "w", encoding="utf-8") as f:
    f.write(ts_content)

print(f"Generated {ASSETS_TS_PATH} successfully.")
