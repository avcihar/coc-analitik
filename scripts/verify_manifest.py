import os, sys, asyncio, re
sys.path.insert(0, os.path.abspath('.'))

from services.api.client import CoCAPIClient
from schemas.pydantic.coc_models import HeroName, PetName
from services.army_parser.inference import EQUIPMENT_TO_HERO_AND_RARITY
from scripts.build_icon_manifest import normalize_key

with open('frontend/src/lib/iconManifest.ts', 'r', encoding='utf-8') as f:
    ts = f.read()

pattern = re.compile(r'"([^"]+)":\s*"/icons/')
keys = set(pattern.findall(ts))
print(f'Total manifest keys: {len(keys)}')

async def verify():
    client = CoCAPIClient()
    try:
        player = await client.get_player('P89PCUPUQ')
    finally:
        await client.close()

    player_items = []
    for cat in ['heroes', 'builderHeroes', 'heroEquipment', 'troops', 'spells']:
        for item in player.get(cat, []):
            if isinstance(item, dict) and 'name' in item:
                player_items.append((item['name'], item.get('village', 'home')))

    matched_player = 0
    unmatched_player = []
    for name, village in player_items:
        nk = normalize_key(name, village)
        if nk in keys or f'{nk}-spell' in keys:
            matched_player += 1
        else:
            unmatched_player.append((name, village, nk))

    print(f'Player items checked: {len(player_items)}')
    print(f'Matched player items: {matched_player} / {len(player_items)}')
    print(f'Unmatched player items: {len(unmatched_player)}')
    if unmatched_player:
        for u in unmatched_player:
            print(' ', u)

    # All known enums
    all_names = set()
    for h in HeroName:
        all_names.add(h.value)
    for p in PetName:
        all_names.add(p.value)
    for eq in EQUIPMENT_TO_HERO_AND_RARITY.keys():
        all_names.add(eq)

    unmatched_catalog = []
    for name in sorted(all_names):
        nk = normalize_key(name)
        if nk in keys or f'{nk}-spell' in keys:
            pass
        else:
            unmatched_catalog.append((name, nk))

    print(f'Catalog items checked: {len(all_names)}')
    print(f'Matched catalog items: {len(all_names) - len(unmatched_catalog)} / {len(all_names)}')
    print(f'Unmatched catalog items: {len(unmatched_catalog)}')
    for u, nk in unmatched_catalog:
        print(f'  - "{u}" (normalized key: {nk})')

if __name__ == '__main__':
    asyncio.run(verify())

