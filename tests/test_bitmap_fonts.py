"""
Unit tests for Bitmap Font Validation, Normalization, and Modular Registration
"""

import os
import json
import pytest
from scripts.build_bitmap_fonts import validate_and_normalize, id_to_title

def test_id_to_title():
    assert id_to_title("cross_stitch") == "Cross Stitch"
    assert id_to_title("tango_stitch") == "Tango Stitch"
    assert id_to_title("pixel-font_bold") == "Pixel Font Bold"

def test_valid_font_normalization():
    sample = {
        "A": [
            [0, 1, 0],
            [1, 0, 1],
            [1, 1, 1],
            [1, 0, 1],
        ],
        "B": [
            [1, 1, 0],
            [1, 1, 0],
            [1, 1, 0],
            [1, 1, 0],
        ]
    }
    font, errors = validate_and_normalize(sample, "test_font", "test_font.json")
    assert errors == []
    assert font is not None
    assert font["id"] == "test_font"
    assert font["name"] == "Test Font"
    assert font["height"] == 4
    assert font["supportedChars"] == ["A", "B"]
    assert font["missingSummary"]["totalSupported"] == 2
    assert "Ç" in font["missingSummary"]["missingTurkishUpper"]

def test_invalid_font_non_rectangular_rejected():
    sample_broken = {
        "A": [
            [0, 1, 0],
            [1, 0],  # row 2 has length 2 instead of 3
            [1, 1, 1],
        ]
    }
    font, errors = validate_and_normalize(sample_broken, "broken_font", "broken_font.json")
    assert font is None
    assert len(errors) > 0
    assert "satır uzunlukları eşit değil" in errors[0]

def test_invalid_font_invalid_cell_value():
    sample_invalid_val = {
        "A": [
            [0, 1, 99],  # 99 is invalid
            [1, 0, 1],
        ]
    }
    font, errors = validate_and_normalize(sample_invalid_val, "bad_val", "bad_val.json")
    assert font is None
    assert len(errors) > 0
    assert "geçersiz değer" in errors[0]

def test_string_matrix_support():
    # Supports string rows e.g. ["010", "101", "111"]
    sample_strings = {
        "A": [
            "010",
            "101",
            "111",
        ]
    }
    font, errors = validate_and_normalize(sample_strings, "string_font", "string_font.json")
    assert errors == []
    assert font is not None
    assert font["glyphs"]["A"] == [[0, 1, 0], [1, 0, 1], [1, 1, 1]]

def test_padding_shorter_glyphs():
    # If a font has a 4-row glyph and a 5-row glyph, the 4-row glyph should be padded at bottom with zeros
    sample = {
        "A": [
            [0, 1, 0],
            [1, 0, 1],
            [1, 1, 1],
            [1, 0, 1],
        ],
        "Q": [
            [0, 1, 0],
            [1, 0, 1],
            [1, 1, 1],
            [1, 0, 1],
            [0, 0, 1], # descender row
        ]
    }
    font, errors = validate_and_normalize(sample, "descender_font", "descender_font.json")
    assert errors == []
    assert font is not None
    assert font["height"] == 5
    assert len(font["glyphs"]["A"]) == 5
    assert font["glyphs"]["A"][4] == [0, 0, 0] # padded row

def test_real_fonts_pass_validation():
    for f in ["cross_stitch.json", "tango_stitch.json"]:
        path = os.path.join("Fonts", f)
        with open(path, "r", encoding="utf-8") as fp:
            data = json.load(fp)
        file_id = os.path.splitext(f)[0]
        font, errors = validate_and_normalize(data, file_id, f)
        assert errors == []
        assert font is not None
        assert font["height"] in (12, 16)

