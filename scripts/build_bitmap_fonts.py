#!/usr/bin/env python3
"""
Bitmap Font Generator & Validator (Python variant)
Reads Fonts/*.json, validates, normalizes, and generates TypeScript and JSON outputs.
"""

import os
import sys
import json
import re

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FONTS_DIR = os.path.join(ROOT_DIR, "Fonts")
OUT_TS_FILE = os.path.join(ROOT_DIR, "frontend", "src", "lib", "bitmapFonts", "generated.ts")
OUT_PUBLIC_DIR = os.path.join(ROOT_DIR, "frontend", "public", "bitmap-fonts")
OUT_PUBLIC_JSON = os.path.join(OUT_PUBLIC_DIR, "index.json")

TURKISH_UPPER = ["Ç", "Ğ", "İ", "I", "Ö", "Ş", "Ü"]
TURKISH_LOWER = ["ç", "ğ", "ı", "i", "ö", "ş", "ü"]
ASCII_UPPER = [chr(65 + i) for i in range(26)]
ASCII_LOWER = [chr(97 + i) for i in range(26)]
DIGITS = [str(i) for i in range(10)]
COMMON_PUNCTUATION = [" ", ".", ",", "!", "?", "-", "_", ":", ";", "(", ")", "/"]

def id_to_title(font_id: str) -> str:
    s = re.sub(r'[_-]+', ' ', font_id)
    return s.title().strip()

def validate_and_normalize(raw_json, file_id: str, filename: str):
    errors = []
    if not isinstance(raw_json, dict):
        return None, [f"{filename}: Geçersiz JSON yapısı (kök eleman bir nesne olmalı)"]

    record = raw_json
    meta_obj = (
        record.get("_meta") if isinstance(record.get("_meta"), dict)
        else record.get("meta") if isinstance(record.get("meta"), dict)
        else record
    )

    meta_name = meta_obj.get("name") if isinstance(meta_obj.get("name"), str) else None
    meta_author = meta_obj.get("author") if isinstance(meta_obj.get("author"), str) else None
    meta_license = meta_obj.get("license") if isinstance(meta_obj.get("license"), str) else None

    baselines = {}
    if isinstance(meta_obj.get("baselines"), dict):
        for k, v in meta_obj["baselines"].items():
            if isinstance(v, (int, float)):
                baselines[k] = int(v)

    if "glyphs" in record and isinstance(record["glyphs"], dict):
        raw_glyphs = record["glyphs"]
    else:
        meta_keys = {"_meta", "meta", "name", "author", "license", "description", "version", "id", "height", "width", "size", "glyphs", "metadata", "baselines"}
        raw_glyphs = {k: v for k, v in record.items() if not k.startswith("_") and k not in meta_keys}

    glyph_keys = list(raw_glyphs.keys())
    if not glyph_keys:
        return None, [f"{filename}: Hiçbir glif matrisi bulunamadı"]

    normalized_glyphs = {}
    glyph_heights = []

    for char in glyph_keys:
        raw_matrix = raw_glyphs[char]
        if not isinstance(raw_matrix, list) or len(raw_matrix) == 0:
            errors.append(f"{filename}: '{char}' glifi boş veya dizi değil")
            continue

        rows = []
        expected_width = None
        is_row_length_valid = True
        is_val_valid = True

        for r, raw_row in enumerate(raw_matrix):
            row_nums = []
            if isinstance(raw_row, list):
                for c, cell in enumerate(raw_row):
                    if cell in (0, 1):
                        row_nums.append(cell)
                    elif cell in ("0", ".", " "):
                        row_nums.append(0)
                    elif cell in ("1", "#", "*"):
                        row_nums.append(1)
                    else:
                        is_val_valid = False
                        errors.append(f"{filename}: '{char}' glifinde geçersiz değer ({cell}) bulundu (satır {r+1}, sütun {c+1})")
                        break
            elif isinstance(raw_row, str):
                for c, char_cell in enumerate(raw_row):
                    if char_cell in ("0", ".", " "):
                        row_nums.append(0)
                    elif char_cell in ("1", "#", "*"):
                        row_nums.append(1)
                    else:
                        is_val_valid = False
                        errors.append(f"{filename}: '{char}' glifinde geçersiz karakter '{char_cell}' bulundu (satır {r+1}, sütun {c+1})")
                        break
            else:
                errors.append(f"{filename}: '{char}' glifinin {r+1}. satırı dizi veya metin değil")
                is_row_length_valid = False
                break

            if not is_val_valid:
                break

            if expected_width is None:
                expected_width = len(row_nums)
            elif len(row_nums) != expected_width:
                is_row_length_valid = False
                errors.append(f"{filename}: '{char}' glifinin satır uzunlukları eşit değil (satır 1: {expected_width}, satır {r+1}: {len(row_nums)})")
                break

            rows.append(row_nums)

        if is_row_length_valid and is_val_valid and rows:
            normalized_glyphs[char] = rows
            glyph_heights.append(len(rows))

    if not normalized_glyphs or errors:
        return None, errors

    unique_heights = set(glyph_heights)
    if len(unique_heights) > 1 and not baselines:
        print(f"⚠ {filename}: glif yükseklikleri farklı ({', '.join(map(str, sorted(unique_heights)))} satır), baselines tanımlamayı düşünün")

    glyph_ascent = {}
    glyph_descent = {}

    for char, matrix in normalized_glyphs.items():
        raw_height = len(matrix)
        base_index = baselines[char] if char in baselines else raw_height - 1
        ascent = base_index
        descent = max(0, raw_height - 1 - base_index)
        glyph_ascent[char] = ascent
        glyph_descent[char] = descent

    max_ascent = max(glyph_ascent.values())
    max_descent = max(glyph_descent.values())
    total_height = max_ascent + 1 + max_descent
    uniform_baseline = max_ascent

    for char, matrix in normalized_glyphs.items():
        w = len(matrix[0]) if matrix else 0
        pad_top = max_ascent - glyph_ascent[char]
        pad_bottom = max_descent - glyph_descent[char]

        if pad_top > 0:
            for _ in range(pad_top):
                matrix.insert(0, [0] * w)
        if pad_bottom > 0:
            for _ in range(pad_bottom):
                matrix.append([0] * w)

    supported_chars = sorted(normalized_glyphs.keys())
    supported_set = set(supported_chars)

    missing_summary = {
        "hasLowercase": any(c in supported_set for c in ASCII_LOWER),
        "hasDigits": any(c in supported_set for c in DIGITS),
        "missingTurkishUpper": [c for c in TURKISH_UPPER if c not in supported_set],
        "missingTurkishLower": [c for c in TURKISH_LOWER if c not in supported_set],
        "missingAsciiUpper": [c for c in ASCII_UPPER if c not in supported_set],
        "missingAsciiLower": [c for c in ASCII_LOWER if c not in supported_set],
        "missingDigits": [c for c in DIGITS if c not in supported_set],
        "missingPunctuation": [c for c in COMMON_PUNCTUATION if c not in supported_set],
        "totalSupported": len(supported_chars),
    }

    font = {
        "id": file_id,
        "name": meta_name or id_to_title(file_id),
        "height": total_height,
        "baseline": uniform_baseline,
        "author": meta_author,
        "license": meta_license,
        "supportedChars": supported_chars,
        "missingSummary": missing_summary,
        "glyphs": normalized_glyphs,
    }

    return font, []

def main():
    print("=== BITMAP FONT DERLEYİCİ (Python) BAŞLATILIYOR ===")
    print(f"Kaynak klasör: {FONTS_DIR}")

    if not os.path.exists(FONTS_DIR):
        print(f"HATA: Fonts klasörü bulunamadı: {FONTS_DIR}")
        sys.exit(1)

    files = sorted([f for f in os.listdir(FONTS_DIR) if f.lower().endswith(".json")])
    print(f"Bulunan font dosyaları: {len(files)} adet ({', '.join(files)})")

    valid_fonts = []
    build_errors = []

    for file in files:
        file_path = os.path.join(FONTS_DIR, file)
        file_id = os.path.splitext(file)[0].lower()

        try:
            with open(file_path, "r", encoding="utf-8") as fp:
                raw_json = json.load(fp)

            font, errors = validate_and_normalize(raw_json, file_id, file)
            if font:
                valid_fonts.append(font)
                print(f"✓ Font yüklendi: \"{font['name']}\" ({file_id}) - Yükseklik: {font['height']} satır, {len(font['supportedChars'])} glif")
            else:
                print(f"⚠ Font geçersiz olduğu için atlandı: {file}")
                for err in errors:
                    print(f"   → {err}")
                    build_errors.append({"fontId": file_id, "file": file, "message": err})
        except Exception as e:
            msg = f"{file}: JSON ayrıştırma hatası ({e})"
            print(f"⚠ {msg}")
            build_errors.append({"fontId": file_id, "file": file, "message": msg})

    os.makedirs(os.path.dirname(OUT_TS_FILE), exist_ok=True)
    ts_content = f"""// Automatically generated by scripts/build_bitmap_fonts.py
// DO NOT EDIT DIRECTLY. Run `npm run build-fonts` or `python scripts/build_bitmap_fonts.py` to regenerate.

import type {{ BitmapFont, BitmapFontValidationError }} from "./types";

export const GENERATED_BITMAP_FONTS: BitmapFont[] = {json.dumps(valid_fonts, ensure_ascii=False, indent=2)};

export const BITMAP_FONT_BUILD_ERRORS: BitmapFontValidationError[] = {json.dumps(build_errors, ensure_ascii=False, indent=2)};
"""
    with open(OUT_TS_FILE, "w", encoding="utf-8") as fp:
        fp.write(ts_content)
    print(f"✓ TypeScript modülü oluşturuldu: {OUT_TS_FILE}")

    os.makedirs(OUT_PUBLIC_DIR, exist_ok=True)
    with open(OUT_PUBLIC_JSON, "w", encoding="utf-8") as fp:
        json.dump({"fonts": valid_fonts, "errors": build_errors}, fp, ensure_ascii=False, indent=2)
    print(f"✓ Statik JSON oluşturuldu: {OUT_PUBLIC_JSON}")

    print(f"=== DERLEME TAMAMLANDI: {len(valid_fonts)} geçerli font, {len(build_errors)} hata ===\n")

if __name__ == "__main__":
    main()

