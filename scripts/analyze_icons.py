import os
import sys
import re
import json
import asyncio

sys.path.insert(0, os.path.abspath('.'))

from services.api.client import CoCAPIClient
from schemas.pydantic.coc_models import HeroName, PetName
from services.army_parser.inference import EQUIPMENT_TO_HERO_AND_RARITY

docs_dir = 'docs'

def clean_file_stem(stem: str) -> str:
    s = stem
    if s.startswith('Avatar_Hero_'):
        s = s[len('Avatar_Hero_'):]
    elif s.startswith('Avatar_'):
        s = s[len('Avatar_'):]
    
    if s.endswith('_info'):
        s = s[:-len('_info')]
    elif s.endswith('_Equipment'):
        s = s[:-len('_Equipment')]
    
    if '_' not in s and re.search(r'[a-z][A-Z]', s):
        s = re.sub(r'([a-z])([A-Z])', r'\1 \2', s)
    
    s = s.replace('_', ' ')
    return s.strip()

def normalize_key(name: str) -> str:
    s = name.strip().lower()
    exceptions = {
        'p.e.k.k.a': 'pekka',
        'p.e.k.k.a.': 'pekka',
        'power p.e.k.k.a': 'power-pekka',
        'power p.e.k.k.a.': 'power-pekka',
        'super p.e.k.k.a': 'super-pekka',
        'l.a.s.s.i': 'lassi',
        'l.a.s.s.i.': 'lassi',
        'b.a.b.y dragon': 'baby-dragon',
    }
    if s in exceptions:
        return exceptions[s]
    s = s.replace("'", "").replace(".", "")
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')

files_mapped = {}
for root, dirs, files in os.walk(docs_dir):
    for f in sorted(files):
        if not f.endswith('.webp'):
            continue
        rel_folder = os.path.relpath(root, docs_dir).replace('\\', '/')
        stem = os.path.splitext(f)[0]
        derived_name = clean_file_stem(stem)
        norm_k = normalize_key(derived_name)
        # Store relative path for public/icons
        web_path = f"/icons/{rel_folder}/{f}"
        files_mapped[norm_k] = (derived_name, web_path)

async def check():
    client = CoCAPIClient()
    try:
        player = await client.get_player('P89PCUPUQ')
    finally:
        await client.close()

    api_names = set()
    for cat in ['heroes', 'builderHeroes', 'heroEquipment', 'troops', 'spells']:
        for item in player.get(cat, []):
            if isinstance(item, dict) and 'name' in item:
                api_names.add(item['name'])

    # Also add known heroes and pets
    for h in HeroName:
        api_names.add(h.value)
    for p in PetName:
        api_names.add(p.value)
    for eq in EQUIPMENT_TO_HERO_AND_RARITY.keys():
        api_names.add(eq)

    matched = []
    unmatched = []

    for name in sorted(api_names):
        nk = normalize_key(name)
        # Check direct or special aliases (e.g. spells with or without 'Spell')
        if nk in files_mapped:
            matched.append((name, nk, files_mapped[nk][1]))
        elif f"{nk}-spell" in files_mapped:
            matched.append((name, f"{nk}-spell", files_mapped[f"{nk}-spell"][1]))
        elif nk.endswith('-spell') and nk[:-6] in files_mapped:
            matched.append((name, nk[:-6], files_mapped[nk[:-6]][1]))
        else:
            unmatched.append((name, nk))

    print(f'=== MATCH RESULTS ===')
    print(f'Total distinct API names checked: {len(api_names)}')
    print(f'Matched: {len(matched)}')
    print(f'Unmatched: {len(unmatched)}')
    print()
    print('Unmatched names:')
    for u, nk in unmatched:
        print(f'  - {u} (normalized: {nk})')

asyncio.run(check())
