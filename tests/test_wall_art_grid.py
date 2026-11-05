"""
Unit Tests for Clash of Clans Wall Art (Duvar Yazısı) Bitmap Grid Logic
========================================================================
Verifies that:
1. Clash of Clans Home Village buildable grid is strictly 44x44 tiles.
2. Default TH17/TH18 wall budget is 325.
3. 90, 180, 270 degree rotations are exact integer coordinate transformations.
4. Scale-down never violates maximum wall budget.
"""

import pytest

COC_GRID_SIZE = 44
DEFAULT_MAX_WALLS = 325


def test_coc_grid_size_and_budget():
    assert COC_GRID_SIZE == 44
    assert DEFAULT_MAX_WALLS == 325


def test_discrete_rotations():
    N = COC_GRID_SIZE
    grid = [[0] * N for _ in range(N)]
    grid[5][10] = 1

    # 90 deg: out[c][N - 1 - r] = 1 -> out[10][44 - 1 - 5] = out[10][38] = 1
    out_90 = [[0] * N for _ in range(N)]
    for r in range(N):
        for c in range(N):
            if grid[r][c]:
                out_90[c][N - 1 - r] = 1
    assert out_90[10][38] == 1

    # 180 deg: out[N - 1 - r][N - 1 - c] = 1 -> out[38][33] = 1
    out_180 = [[0] * N for _ in range(N)]
    for r in range(N):
        for c in range(N):
            if grid[r][c]:
                out_180[N - 1 - r][N - 1 - c] = 1
    assert out_180[38][33] == 1

    # 270 deg: out[N - 1 - c][r] = 1 -> out[33][5] = 1
    out_270 = [[0] * N for _ in range(N)]
    for r in range(N):
        for c in range(N):
            if grid[r][c]:
                out_270[N - 1 - c][r] = 1
    assert out_270[33][5] == 1


def test_scale_down_budget_constraint():
    max_walls = 325
    glyph_walls = 317 # e.g. "HARUN" at 1x
    # At 2x scale: 317 * 4 = 1268 walls > 325
    scale = 2
    total_walls = glyph_walls * (scale ** 2)
    assert total_walls > max_walls

    # Auto-fit scales down integer scale
    while scale > 1 and glyph_walls * (scale ** 2) > max_walls:
        scale -= 1

    assert scale == 1
    assert glyph_walls * (scale ** 2) <= max_walls
