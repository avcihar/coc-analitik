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
    # When Q has a descender defined via baselines, A is padded at bottom
    sample = {
        "_meta": {
            "baselines": {"Q": 3}
        },
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
            [0, 0, 1], # descender row (index 4)
        ]
    }
    font, errors = validate_and_normalize(sample, "descender_font", "descender_font.json")
    assert errors == []
    assert font is not None
    assert font["height"] == 5
    assert font["baseline"] == 3
    assert len(font["glyphs"]["A"]) == 5
    assert font["glyphs"]["A"][4] == [0, 0, 0] # padded at bottom because Q descends below baseline

def test_real_fonts_pass_validation():
    for f in ["cross_stitch.json", "tango_stitch.json"]:
        path = os.path.join("Fonts", f)
        with open(path, "r", encoding="utf-8") as fp:
            data = json.load(fp)
        file_id = os.path.splitext(f)[0]
        font, errors = validate_and_normalize(data, file_id, f)
        assert errors == []
        assert font is not None
        if file_id == "cross_stitch":
            assert font["height"] == 13
            assert font["baseline"] == 11
        elif file_id == "tango_stitch":
            assert font["height"] == 16
            assert font["baseline"] == 15

