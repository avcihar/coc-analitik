"""Download Builder Hall (levels 1-10) and Builder Base league icons (42 files)
from chiefpansancolt/clash-of-clans-data into frontend/public/.
"""

from __future__ import annotations

from pathlib import Path
import sys
import httpx

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_BASE_URL = "https://raw.githubusercontent.com/chiefpansancolt/clash-of-clans-data/main"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"

BUILDER_HALL_LEVELS = list(range(1, 11))

BUILDER_LEAGUE_FILES = [
    "wood-v.png",
    "wood-iv.png",
    "wood-iii.png",
    "wood-ii.png",
    "wood-i.png",
    "clay-v.png",
    "clay-iv.png",
    "clay-iii.png",
    "clay-ii.png",
    "clay-i.png",
    "stone-v.png",
    "stone-iv.png",
    "stone-iii.png",
    "stone-ii.png",
    "stone-i.png",
    "copper-v.png",
    "copper-iv.png",
    "copper-iii.png",
    "copper-ii.png",
    "copper-i.png",
    "brass-iii.png",
    "brass-ii.png",
    "brass-i.png",
    "iron-iii.png",
    "iron-ii.png",
    "iron-i.png",
    "steel-iii.png",
    "steel-ii.png",
    "steel-i.png",
    "titanium-iii.png",
    "titanium-ii.png",
    "titanium-i.png",
    "platinum-iii.png",
    "platinum-ii.png",
    "platinum-i.png",
    "emerald-iii.png",
    "emerald-ii.png",
    "emerald-i.png",
    "ruby-iii.png",
    "ruby-ii.png",
    "ruby-i.png",
    "diamond.png",
]


def detect_image_format(data: bytes) -> str | None:
    """Return 'PNG' or 'WEBP' if bytes start with a valid image header, else None."""
    if data.startswith(PNG_MAGIC):
        return "PNG"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "WEBP"
    return None


def download_asset(client: httpx.Client, url: str, dest: Path) -> tuple[int, str]:
    """Download a single image asset, verify its header and non-zero size, and write it."""
    response = client.get(url)
    response.raise_for_status()
    data = response.content
    fmt = detect_image_format(data)
    if not data or fmt is None:
        raise ValueError(
            f"Invalid image payload from {url} (size={len(data)}, head={data[:16]!r})"
        )
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return len(data), fmt


def main() -> int:
    hall_dir = BASE_DIR / "frontend" / "public" / "builder-halls"
    league_dir = BASE_DIR / "frontend" / "public" / "builder-leagues"

    downloads: list[tuple[str, Path]] = []
    for level in BUILDER_HALL_LEVELS:
        filename = f"level-{level}.png"
        downloads.append(
            (
                f"{RAW_BASE_URL}/images/builder/builder-hall/normal/{filename}",
                hall_dir / filename,
            )
        )

    for filename in BUILDER_LEAGUE_FILES:
        downloads.append(
            (
                f"{RAW_BASE_URL}/images/builder/leagues/{filename}",
                league_dir / filename,
            )
        )

    total_bytes = 0
    downloaded_halls = 0
    downloaded_leagues = 0
    format_counts: dict[str, int] = {}

    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        for url, dest in downloads:
            size, fmt = download_asset(client, url, dest)
            total_bytes += size
            format_counts[fmt] = format_counts.get(fmt, 0) + 1
            if dest.parent == hall_dir:
                downloaded_halls += 1
            else:
                downloaded_leagues += 1
            print(f"OK [{fmt}] {dest.relative_to(BASE_DIR)} ({size:,} bytes)")

    # Verify every written file on disk is > 0 bytes and has valid image header
    for _, dest in downloads:
        if not dest.is_file() or dest.stat().st_size == 0:
            raise RuntimeError(f"Missing or empty file after download: {dest}")
        disk_fmt = detect_image_format(dest.read_bytes()[:16])
        if disk_fmt is None:
            raise RuntimeError(f"Corrupt image header on disk: {dest}")

    print(
        f"\nVerified {downloaded_halls} Builder Hall files and "
        f"{downloaded_leagues} Builder League files "
        f"({downloaded_halls + downloaded_leagues} total, {total_bytes:,} bytes, "
        f"formats={format_counts})."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
