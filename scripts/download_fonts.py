import os
import urllib.request
from fontTools.ttLib import TTFont

FONTS = [
    {
        "id": "roboto",
        "name": "Roboto",
        "family": "Roboto",
        "style": "Modern Sans",
        "license": "Apache 2.0",
        "filename": "Roboto-Regular.ttf",
        "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto%5Bwdth%2Cwght%5D.ttf",
    },
    {
        "id": "montserrat",
        "name": "Montserrat",
        "family": "Montserrat",
        "style": "Geometrik Kalın",
        "license": "SIL OFL 1.1",
        "filename": "Montserrat-Bold.ttf",
        "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf",
    },
    {
        "id": "oswald",
        "name": "Oswald",
        "family": "Oswald",
        "style": "Sıkışık / Dar Gotik",
        "license": "SIL OFL 1.1",
        "filename": "Oswald-Bold.ttf",
        "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/oswald/Oswald%5Bwght%5D.ttf",
    },
    {
        "id": "bebas-neue",
        "name": "Bebas Neue",
        "family": "Bebas Neue",
        "style": "Manşet / Afiş",
        "license": "SIL OFL 1.1",
        "filename": "BebasNeue-Regular.ttf",
        "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/BebasNeue-Regular.ttf",
    },
    {
        "id": "anton",
        "name": "Anton",
        "family": "Anton",
        "style": "Ağır Blok",
        "license": "SIL OFL 1.1",
        "filename": "Anton-Regular.ttf",
        "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/anton/Anton-Regular.ttf",
    },
    {
        "id": "russo-one",
        "name": "Russo One",
        "family": "Russo One",
        "style": "Oyun / Mekanik",
        "license": "SIL OFL 1.1",
        "filename": "RussoOne-Regular.ttf",
        "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/russoone/RussoOne-Regular.ttf",
    },
    {
        "id": "cinzel",
        "name": "Cinzel",
        "family": "Cinzel",
        "style": "Klan / Ortaçağ Serif",
        "license": "SIL OFL 1.1",
        "filename": "Cinzel-Bold.ttf",
        "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/Cinzel%5Bwght%5D.ttf",
    },
    {
        "id": "vt323",
        "name": "VT323",
        "family": "VT323",
        "style": "Retro Piksel",
        "license": "SIL OFL 1.1",
        "filename": "VT323-Regular.ttf",
        "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/vt323/VT323-Regular.ttf",
    },
]

TARGET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "fonts"))
os.makedirs(TARGET_DIR, exist_ok=True)

TURKISH_CHARS = "çğıöşüÇĞİÖŞÜ"

def check_turkish_support(font_path):
    tt = TTFont(font_path)
    cmap = tt.getBestCmap()
    missing = [c for c in TURKISH_CHARS if ord(c) not in cmap]
    return missing

def main():
    print(f"Target directory: {TARGET_DIR}")
    for item in FONTS:
        dest = os.path.join(TARGET_DIR, item["filename"])
        if not os.path.exists(dest) or os.path.getsize(dest) == 0:
            print(f"Downloading {item['name']} ({item['license']})...")
            req = urllib.request.Request(item["url"], headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
                with open(dest, "wb") as f:
                    f.write(data)
            print(f"  -> Saved {dest} ({len(data)} bytes)")
        else:
            print(f"{item['name']} already exists ({os.path.getsize(dest)} bytes).")
            
        missing = check_turkish_support(dest)
        if missing:
            print(f"  [!] Turkish missing chars: {missing}")
        else:
            print(f"  [OK] Full Turkish support.")

if __name__ == "__main__":
    main()

