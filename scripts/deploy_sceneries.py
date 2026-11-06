"""
Scenery and Icon Deployment & Config Generation Script
------------------------------------------------------
Processes 70 Home Village sceneries from docs/Sceneries/ and docs/Sceneries/Icons/:
- Copies all icons to frontend/public/sceneries/icons/
- Resizes giant sceneries (w >= 6000px) down to w = 3705px preserving aspect ratio
- Copies all other sceneries to frontend/public/sceneries/
- Calculates precise 4-corner buildArea for all 70 sceneries (preserving 4/3 ratio)
- Generates frontend/src/lib/assetsConfig.ts with full multi-scenery support
"""

import os
import shutil
import re
from pathlib import Path
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

DOCS_SCENERIES = Path("docs/Sceneries")
DOCS_ICONS = Path("docs/Sceneries/Icons")
DEST_SCENERIES = Path("frontend/public/sceneries")
DEST_ICONS = Path("frontend/public/sceneries/icons")
CONFIG_PATH = Path("frontend/src/lib/assetsConfig.ts")

EXCLUDED_FILES = {
    "Map_Champion_War_Base.webp",
    "Map_Ruined_Kingdom_War_Scenery.webp",
    "Map_Tarnished_Titans_War_Scenery.webp",
    "Map_War.webp",
    "Map_War_Arena.webp",
    "Map_War_Machine_Scenery.webp",
    "Map_Clash_of_Dragons_Closeup.webp",
    "Map_Year_of_the_Snake_Closeup.webp",
}

SPECIAL_ICON_ALIASES = {
    "scenery_ingame_winter.webp": "Scenery_Epic_Winter.webp",
    "map_epic_winter_scenery.webp": "Scenery_Epic_Winter.webp",
    "map_classic_winter.webp": "Scenery_Classic_Winter.webp",
    "map_clashy_constructs_scenery.webp": "Scenery_ClashyConstructs.webp",
    "map_chess_scenery.webp": "Scenery_Chess.webp",
    "map_clashamania_scenery.webp": "ClashaMania_Scenery_Icon.webp",
    "military_scenery.webp": "Military_Scenery_Icon.webp",
    "map_cyber_scenery.webp": "Scenery_Map_Cyber_Scenery.webp",
    "map_wasteland_scenery.webp": "Scenery_Wastelands_Scenery.webp",
    "map_frost_age_scenery.webp": "Scenery_frostage_Scenery.webp",
    "fireandice_scenery.webp": "Scenery_Fire_and_ice_Scenery.webp",
    "map_13th-clash-a-versary_scenery.webp": "13th_Clash-A-Versary_Scenery.webp",
    "map_high_seas_scenery.webp": "High_Seas_Scenery.webp",
    "map_classic_scenery.webp": "Scenery_Classic.webp",
    "map_epic_jungle_scenery.webp": "Scenery_Epic_Jungle.webp",
    "map_ghost_scenery.webp": "Scenery_Ghost.webp",
    "map_hog_mountain_scenery.webp": "Scenery_Hog_Mountain.webp",
    "map_inferno_town_scenery.webp": "Scenery_Inferno_Town.webp",
    "map_jungle_scenery.webp": "Scenery_Jungle.webp",
    "map_magic.webp": "Scenery_Magic.webp",
    "map_painter_scenery.webp": "Scenery_Painter.webp",
    "map_pirate_scenery.webp": "Scenery_Pirate.webp",
    "map_pixel_scenery.webp": "Scenery_Pixel.webp",
    "map_primal_scenery.webp": "Scenery_Primal.webp",
    "map_pumpkin_graveyard_scenery.webp": "Scenery_Pumpkin_Graveyard.webp",
    "map_shadow_scenery.webp": "Scenery_Shadow.webp",
    "map_snow_day_scenery.webp": "Scenery_Snow_Day.webp",
    "map_tiger_mountain_scenery.webp": "Scenery_Tiger_Mountain.webp",
}

CUSTOM_TITLES = {
    "Scenery_Ingame_Winter.webp": "Kış Sahnesi (Winter)",
    "Map_Classic_Scenery.webp": "Klasik (Classic)",
    "Map_10th_Clashiversary.webp": "10th Clashiversary",
    "Map_13th-Clash-A-Versary_Scenery.webp": "13th Clash-A-Versary",
    "Map_9th_Clashiversary_Scenery.webp": "9th Clashiversary",
    "FireAndIce_Scenery.webp": "Fire & Ice",
    "Map_Clash-A-Rama_Scenery.webp": "Clash-A-Rama",
    "Map_ClashaMania_Scenery.webp": "ClashaMania",
    "Map_Money_in_the_Bank_Scenery.webp": "Money in the Bank",
    "Map_Books_of_Clash_Scenery.webp": "Books of Clash",
    "Map_Year_of_the_Fire_Horse_Scenery.webp": "Year of the Fire Horse",
    "Map_The_Awesome_Quest_Scenery.webp": "The Awesome Quest",
}

def normalize_name(name: str) -> str:
    s = os.path.splitext(name)[0].lower()
    s = s.replace("map_", "").replace("scenery_", "").replace("_scenery", "").replace("_icon", "").replace("icon_", "")
    s = s.replace("-", "_").replace(" ", "_")
    return re.sub(r"_+", "_", s).strip("_")

def to_scenery_id(filename: str) -> str:
    if filename == "Scenery_Ingame_Winter.webp":
        return "winter"
    name = os.path.splitext(filename)[0]
    name = re.sub(r"^Map_", "", name)
    name = re.sub(r"_Scenery$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"^Scenery_", "", name, flags=re.IGNORECASE)
    name = name.lower().replace("-", "_").replace(" ", "_")
    name = re.sub(r"_+", "_", name).strip("_")
    return name

def format_title(filename: str) -> str:
    if filename in CUSTOM_TITLES:
        return CUSTOM_TITLES[filename]
    name = os.path.splitext(filename)[0]
    name = re.sub(r"^Map_", "", name)
    name = re.sub(r"_Scenery$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"^Scenery_", "", name, flags=re.IGNORECASE)
    name = name.replace("_", " ").replace("-", " ")
    name = re.sub(r"([a-z])([A-Z])", r"\1 \2", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name

def compute_corners(w: int, h: int, is_winter: bool = False):
    if is_winter:
        return (
            {"x": 1894.5, "y": 265.5},
            {"x": 3107.0, "y": 1175.0},
            {"x": 1894.5, "y": 2084.5},
            {"x": 682.0, "y": 1175.0},
        )
    scale = w / 3705.0
    expected_h = w / 1.455795677799607
    delta_y = (h - expected_h) / 2.0
    top = {"x": round(1894.5 * scale, 1), "y": round(265.5 * scale + delta_y, 1)}
    right = {"x": round(3107.0 * scale, 1), "y": round(1175.0 * scale + delta_y, 1)}
    bottom = {"x": round(1894.5 * scale, 1), "y": round(2084.5 * scale + delta_y, 1)}
    left = {"x": round(682.0 * scale, 1), "y": round(1175.0 * scale + delta_y, 1)}
    return top, right, bottom, left

def main():
    DEST_SCENERIES.mkdir(parents=True, exist_ok=True)
    DEST_ICONS.mkdir(parents=True, exist_ok=True)

    # 1. Copy all icons
    icon_files = [f for f in os.listdir(DOCS_ICONS) if f.endswith(".webp")]
    print(f"Copying {len(icon_files)} icons to {DEST_ICONS}...")
    for icon in icon_files:
        src = DOCS_ICONS / icon
        dst = DEST_ICONS / icon
        shutil.copy2(src, dst)
    print("Icons copied successfully.")

    # 2. Build icon lookup
    icon_map = {normalize_name(ic): ic for ic in icon_files}

    # 3. Find and sort sceneries
    scenery_files = sorted([
        f for f in os.listdir(DOCS_SCENERIES)
        if f.endswith(".webp") and f not in EXCLUDED_FILES
    ])
    print(f"Found {len(scenery_files)} valid Home Village sceneries.")

    scenery_entries = []

    for sc in scenery_files:
        src_path = DOCS_SCENERIES / sc
        dst_path = DEST_SCENERIES / sc
        is_winter = (sc == "Scenery_Ingame_Winter.webp")

        with Image.open(src_path) as img:
            orig_w, orig_h = img.width, img.height

        # Downscale giant images (>=6000px)
        if orig_w >= 6000:
            target_w = 3705
            target_h = int(round(orig_h * (3705.0 / orig_w)))
            if not dst_path.exists() or dst_path.stat().st_size < 1000:
                print(f"Downscaling giant scenery {sc} ({orig_w}x{orig_h} -> {target_w}x{target_h})...")
                with Image.open(src_path) as img:
                    resized = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
                    resized.save(dst_path, "WEBP", quality=85)
            else:
                print(f"Resized {sc} already exists in {DEST_SCENERIES}.")
        else:
            target_w = orig_w
            target_h = orig_h
            if not dst_path.exists():
                print(f"Copying {sc} ({target_w}x{target_h})...")
                shutil.copy2(src_path, dst_path)

        # Match icon
        sc_lower = sc.lower()
        if sc_lower in SPECIAL_ICON_ALIASES:
            matched_icon = SPECIAL_ICON_ALIASES[sc_lower]
        else:
            norm = normalize_name(sc)
            matched_icon = icon_map.get(norm)
            if not matched_icon:
                for inorm, ifile in icon_map.items():
                    if norm == inorm or norm.replace("_", "") == inorm.replace("_", ""):
                        matched_icon = ifile
                        break
        if not matched_icon:
            matched_icon = "Scenery_Classic.webp"
            print(f"WARNING: Fallback icon for {sc}")

        top, right, bottom, left = compute_corners(target_w, target_h, is_winter=is_winter)

        entry = {
            "id": to_scenery_id(sc),
            "name": format_title(sc),
            "src": f"/sceneries/{sc}",
            "thumb": f"/sceneries/icons/{matched_icon}",
            "naturalWidth": target_w,
            "naturalHeight": target_h,
            "buildArea": {
                "top": top,
                "right": right,
                "bottom": bottom,
                "left": left,
            },
            "wall": "wall19",
        }
        scenery_entries.append(entry)

    # Ensure winter is first
    winter_entry = next((e for e in scenery_entries if e["id"] == "winter"), None)
    other_entries = [e for e in scenery_entries if e["id"] != "winter"]
    sorted_entries = [winter_entry] + other_entries if winter_entry else scenery_entries

    print(f"Total processed sceneries: {len(sorted_entries)}")

    # 4. Generate assetsConfig.ts
    generate_assets_config(sorted_entries)

def generate_assets_config(sceneries):
    lines = []
    lines.append('export interface BuildAreaCorners {')
    lines.append('  top: { x: number; y: number };')
    lines.append('  right: { x: number; y: number };')
    lines.append('  bottom: { x: number; y: number };')
    lines.append('  left: { x: number; y: number };')
    lines.append('}')
    lines.append('')
    lines.append('export interface SceneryAssetConfig {')
    lines.append('  id: string;')
    lines.append('  name: string;')
    lines.append('  src: string;')
    lines.append('  thumb: string;')
    lines.append('  naturalWidth: number;')
    lines.append('  naturalHeight: number;')
    lines.append('  buildArea: BuildAreaCorners;')
    lines.append('  wall?: string;')
    lines.append('}')
    lines.append('')
    lines.append('export interface WallAssetConfig {')
    lines.append('  id: string;')
    lines.append('  name: string;')
    lines.append('  src: string;')
    lines.append('  naturalWidth: number;')
    lines.append('  naturalHeight: number;')
    lines.append('}')
    lines.append('')
    lines.append('export interface AssetsConfig {')
    lines.append('  scenery: SceneryAssetConfig;')
    lines.append('  defaultSceneryId: string;')
    lines.append('  sceneries: SceneryAssetConfig[];')
    lines.append('  wall: WallAssetConfig;')
    lines.append('}')
    lines.append('')
    lines.append('/**')
    lines.append(' * Static configuration for scenery backgrounds and wall textures.')
    lines.append(' * 70 Home Village sceneries with pre-calibrated 44x44 isometric build areas.')
    lines.append(' */')
    lines.append('export const ASSETS_CONFIG: AssetsConfig = {')
    lines.append('  defaultSceneryId: "winter",')
    lines.append('  scenery: {')
    lines.append('    id: "winter",')
    lines.append('    name: "Kış Sahnesi (Winter)",')
    lines.append('    src: "/sceneries/Scenery_Ingame_Winter.webp",')
    lines.append('    thumb: "/sceneries/icons/Scenery_Epic_Winter.webp",')
    lines.append('    naturalWidth: 3705,')
    lines.append('    naturalHeight: 2545,')
    lines.append('    buildArea: {')
    lines.append('      top: { x: 1894.5, y: 265.5 },')
    lines.append('      right: { x: 3107.0, y: 1175.0 },')
    lines.append('      bottom: { x: 1894.5, y: 2084.5 },')
    lines.append('      left: { x: 682.0, y: 1175.0 },')
    lines.append('    },')
    lines.append('    wall: "wall19",')
    lines.append('  },')
    lines.append('  wall: {')
    lines.append('    id: "wall19",')
    lines.append('    name: "Seviye 19 Duvar (Wall 19)",')
    lines.append('    src: "/walls/Wall19.webp",')
    lines.append('    naturalWidth: 58,')
    lines.append('    naturalHeight: 73,')
    lines.append('  },')
    lines.append('  sceneries: [')

    for sc in sceneries:
        b = sc["buildArea"]
        lines.append('    {')
        lines.append(f'      id: {json_str(sc["id"])},')
        lines.append(f'      name: {json_str(sc["name"])},')
        lines.append(f'      src: {json_str(sc["src"])},')
        lines.append(f'      thumb: {json_str(sc["thumb"])},')
        lines.append(f'      naturalWidth: {sc["naturalWidth"]},')
        lines.append(f'      naturalHeight: {sc["naturalHeight"]},')
        lines.append('      buildArea: {')
        lines.append(f'        top: {{ x: {b["top"]["x"]}, y: {b["top"]["y"]} }},')
        lines.append(f'        right: {{ x: {b["right"]["x"]}, y: {b["right"]["y"]} }},')
        lines.append(f'        bottom: {{ x: {b["bottom"]["x"]}, y: {b["bottom"]["y"]} }},')
        lines.append(f'        left: {{ x: {b["left"]["x"]}, y: {b["left"]["y"]} }},')
        lines.append('      },')
        lines.append('      wall: "wall19",')
        lines.append('    },')

    lines.append('  ],')
    lines.append('};')
    lines.append('')
    lines.append('/**')
    lines.append(' * Returns the configuration for a given scenery ID, or the default winter scenery.')
    lines.append(' */')
    lines.append('export function getSceneryConfig(id?: string): SceneryAssetConfig {')
    lines.append('  if (!id) return ASSETS_CONFIG.scenery;')
    lines.append('  const found = ASSETS_CONFIG.sceneries.find((s) => s.id === id);')
    lines.append('  return found || ASSETS_CONFIG.scenery;')
    lines.append('}')
    lines.append('')
    lines.append('/**')
    lines.append(' * Maps 44x44 grid coordinates (col, row) to natural scenery image pixel coordinates (x, y)')
    lines.append(' * using bilinear / affine interpolation between the 4 corners of buildArea.')
    lines.append(' */')
    lines.append('export function mapGridToScenery(')
    lines.append('  col: number,')
    lines.append('  row: number,')
    lines.append('  buildArea: BuildAreaCorners = ASSETS_CONFIG.scenery.buildArea')
    lines.append('): { x: number; y: number } {')
    lines.append('  const u = col / 44.0;')
    lines.append('  const v = row / 44.0;')
    lines.append('  const { top, right, bottom, left } = buildArea;')
    lines.append('')
    lines.append('  const x =')
    lines.append('    (1 - u) * (1 - v) * top.x +')
    lines.append('    u * (1 - v) * right.x +')
    lines.append('    u * v * bottom.x +')
    lines.append('    (1 - u) * v * left.x;')
    lines.append('')
    lines.append('  const y =')
    lines.append('    (1 - u) * (1 - v) * top.y +')
    lines.append('    u * (1 - v) * right.y +')
    lines.append('    u * v * bottom.y +')
    lines.append('    (1 - u) * v * left.y;')
    lines.append('')
    lines.append('  return { x, y };')
    lines.append('}')
    lines.append('')
    lines.append('/**')
    lines.append(' * Inverse mapping: maps a natural scenery image pixel coordinate (px, py)')
    lines.append(' * back to 44x44 grid coordinates (col, row).')
    lines.append(' */')
    lines.append('export function mapSceneryToGrid(')
    lines.append('  px: number,')
    lines.append('  py: number,')
    lines.append('  buildArea: BuildAreaCorners = ASSETS_CONFIG.scenery.buildArea')
    lines.append('): { col: number; row: number } {')
    lines.append('  const { top, right, bottom, left } = buildArea;')
    lines.append('')
    lines.append('  const V_rx = right.x - top.x;')
    lines.append('  const V_ry = right.y - top.y;')
    lines.append('  const V_lx = left.x - top.x;')
    lines.append('  const V_ly = left.y - top.y;')
    lines.append('')
    lines.append('  const dx = px - top.x;')
    lines.append('  const dy = py - top.y;')
    lines.append('')
    lines.append('  const det = V_rx * V_ly - V_ry * V_lx;')
    lines.append('  if (Math.abs(det) < 1e-6) {')
    lines.append('    return { col: 0, row: 0 };')
    lines.append('  }')
    lines.append('')
    lines.append('  const u = (dx * V_ly - dy * V_lx) / det;')
    lines.append('  const v = (V_rx * dy - V_ry * dx) / det;')
    lines.append('')
    lines.append('  return {')
    lines.append('    col: u * 44.0,')
    lines.append('    row: v * 44.0,')
    lines.append('  };')
    lines.append('}')

    CONFIG_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {CONFIG_PATH} with {len(sceneries)} sceneries.")

def json_str(s: str) -> str:
    import json
    return json.dumps(s, ensure_ascii=False)

if __name__ == "__main__":
    main()

