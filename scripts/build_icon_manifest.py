import os
import shutil
import re
import json

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCS_DIR = os.path.join(BASE_DIR, "docs")
TARGET_DIR = os.path.join(BASE_DIR, "frontend", "public", "icons")
MANIFEST_PATH = os.path.join(BASE_DIR, "frontend", "src", "lib", "iconManifest.ts")

# Category mapping from docs/ subdirectories to target public/icons subdirectories
CATEGORY_MAP = {
    "Heroes": "heroes",
    "Hero Equipment": "equipment",  # contains subfolders Archer Queen, Barbarian King, etc.
    "Pets": "pets",
    "Elixir Troops": "troops",
    "Dark Elixir Troops": "dark-troops",
    "Elixir Spells": "spells",
    "Dark Spells": "spells",
    "Siege Machines": "siege",
    "Super Troops": "super-troops",
    "Builder Base Heroes": "builder",
    "Builder Base Troops": "builder",
}

EXCEPTIONS = {
    "p.e.k.k.a": "pekka",
    "p.e.k.k.a.": "pekka",
    "pekka": "pekka",
    "power p.e.k.k.a": "power-pekka",
    "power p.e.k.k.a.": "power-pekka",
    "super p.e.k.k.a": "super-pekka",
    "l.a.s.s.i": "lassi",
    "l.a.s.s.i.": "lassi",
    "lassi": "lassi",
    "b.a.b.y dragon": "baby-dragon",
}

def normalize_key(name: str, village: str = None) -> str:
    if not name:
        return ""
    s = str(name).strip().lower()
    
    # Handle builder base Baby Dragon disambiguation
    if village and village.lower() in ("builderbase", "builder") and ("baby dragon" in s or s == "baby-dragon"):
        return "builder-baby-dragon"
    
    if s in EXCEPTIONS:
        return EXCEPTIONS[s]
        
    s = s.replace("'", "").replace(".", "")
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')

def clean_file_stem(stem: str) -> str:
    s = stem
    if s.startswith("Avatar_Hero_"):
        s = s[len("Avatar_Hero_"):]
    elif s.startswith("Avatar_"):
        s = s[len("Avatar_"):]
    
    if s.endswith("_info"):
        s = s[:-len("_info")]
    elif s.endswith("_Equipment"):
        s = s[:-len("_Equipment")]
    
    # PascalCase to spaced words (e.g. SuperWallBreaker -> Super Wall Breaker)
    if "_" not in s and re.search(r'[a-z][A-Z]', s):
        s = re.sub(r'([a-z])([A-Z])', r'\1 \2', s)
    
    s = s.replace("_", " ")
    return s.strip()

def build():
    print(f"Docs source: {DOCS_DIR}")
    print(f"Target icons: {TARGET_DIR}")
    
    os.makedirs(TARGET_DIR, exist_ok=True)
    
    manifest_entries = {}
    copied_count = 0
    cat_counts = {}

    for root, dirs, files in os.walk(DOCS_DIR):
        webps = [f for f in files if f.endswith(".webp")]
        if not webps:
            continue
            
        rel_folder = os.path.relpath(root, DOCS_DIR)
        parts = rel_folder.split(os.sep)
        top_folder = parts[0]
        
        target_cat = CATEGORY_MAP.get(top_folder)
        if not target_cat:
            print(f"Warning: Unknown category folder '{top_folder}' in {rel_folder}")
            target_cat = top_folder.lower().replace(" ", "-")

        target_cat_dir = os.path.join(TARGET_DIR, target_cat)
        os.makedirs(target_cat_dir, exist_ok=True)

        for f in sorted(webps):
            src_file = os.path.join(root, f)
            dest_file = os.path.join(target_cat_dir, f)
            
            # Copy file (never delete original)
            shutil.copy2(src_file, dest_file)
            copied_count += 1
            cat_counts[target_cat] = cat_counts.get(target_cat, 0) + 1
            
            stem = os.path.splitext(f)[0]
            canonical_name = clean_file_stem(stem)
            
            # Special handling for builder base baby dragon
            if target_cat == "builder" and "Baby_Dragon" in f:
                norm_key = "builder-baby-dragon"
            else:
                norm_key = normalize_key(canonical_name)
                
            web_path = f"/icons/{target_cat}/{f}"
            manifest_entries[norm_key] = web_path
            
            # Also register aliases for convenience
            if norm_key.endswith("-spell"):
                base_spell = norm_key[:-len("-spell")]
                if base_spell not in manifest_entries:
                    manifest_entries[base_spell] = web_path
            elif target_cat == "spells":
                spell_alias = f"{norm_key}-spell"
                if spell_alias not in manifest_entries:
                    manifest_entries[spell_alias] = web_path
                    
            if norm_key == "fireball":
                manifest_entries["fireball-equipment"] = web_path
            if norm_key == "henchmen-puppet":
                manifest_entries["henchman-puppet"] = web_path

    print(f"Successfully copied {copied_count} icon files into {len(cat_counts)} categories:")
    for cat, count in sorted(cat_counts.items()):
        print(f"  - {cat}: {count} files")

    # Generate TypeScript manifest
    ts_code = []
    ts_code.append('// Generated automatically by scripts/build_icon_manifest.py')
    ts_code.append('// Do not edit manually. Run `python scripts/build_icon_manifest.py` to regenerate.\n')
    
    ts_code.append('export const ICON_EXCEPTIONS: Record<string, string> = {')
    for k, v in sorted(EXCEPTIONS.items()):
        ts_code.append(f'  "{k}": "{v}",')
    ts_code.append('};\n')
    
    ts_code.append('/**')
    ts_code.append(' * Normalizes a unit, hero, equipment, pet or spell name to match manifest keys.')
    ts_code.append(' */')
    ts_code.append('export function normalizeIconKey(name?: string | null, village?: string | null): string {')
    ts_code.append('  if (!name) return "";')
    ts_code.append('  const raw = name.trim().toLowerCase();')
    ts_code.append('  if (village && village.toLowerCase().includes("builder") && (raw === "baby dragon" || raw === "baby-dragon")) {')
    ts_code.append('    return "builder-baby-dragon";')
    ts_code.append('  }')
    ts_code.append('  if (ICON_EXCEPTIONS[raw]) {')
    ts_code.append('    return ICON_EXCEPTIONS[raw];')
    ts_code.append('  }')
    ts_code.append('  const cleaned = raw.replace(/[\'\\.]/g, "").replace(/[^a-z0-9]+/g, "-");')
    ts_code.append('  return cleaned.replace(/^-+|-+$/g, "");')
    ts_code.append('}\n')

    ts_code.append('/**')
    ts_code.append(' * Manifest mapping normalized unit keys to public icon URLs.')
    ts_code.append(' */')
    ts_code.append('export const ICON_MANIFEST: Record<string, string> = {')
    for k in sorted(manifest_entries.keys()):
        ts_code.append(f'  "{k}": "{manifest_entries[k]}",')
    ts_code.append('};\n')

    ts_code.append('/**')
    ts_code.append(' * Resolves the relative icon URL for a given unit/equipment/spell name.')
    ts_code.append(' * Returns null if no matching icon file is found.')
    ts_code.append(' */')
    ts_code.append('export function getIconPath(name?: string | null, village?: string | null): string | null {')
    ts_code.append('  if (!name) return null;')
    ts_code.append('  const key = normalizeIconKey(name, village);')
    ts_code.append('  if (ICON_MANIFEST[key]) return ICON_MANIFEST[key];')
    ts_code.append('  // Fallback check with/without -spell')
    ts_code.append('  if (ICON_MANIFEST[`${key}-spell`]) return ICON_MANIFEST[`${key}-spell`];')
    ts_code.append('  if (key.endsWith("-spell") && ICON_MANIFEST[key.slice(0, -6)]) {')
    ts_code.append('    return ICON_MANIFEST[key.slice(0, -6)];')
    ts_code.append('  }')
    ts_code.append('  return null;')
    ts_code.append('}\n')

    os.makedirs(os.path.dirname(MANIFEST_PATH), exist_ok=True)
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(ts_code))
    
    print(f"Generated manifest: {MANIFEST_PATH} with {len(manifest_entries)} mapped keys.")

if __name__ == "__main__":
    build()

