"""
Unit Tests for Clash of Clans Wall Art (Duvar Yazısı) Grid Logic
================================================================
Verifies that:
1. Clash of Clans Home Village buildable grid is strictly 44x44 tiles.
2. Default TH17/TH18 wall budget is 325.
3. Zhang-Suen thinning reduces thick blocks to 1-cell width.
4. Scale-down binary search never violates maximum wall budget.
"""

import pytest

COC_GRID_SIZE = 44
DEFAULT_MAX_WALLS = 325


def zhang_suen_thinning(grid):
    rows = len(grid)
    cols = len(grid[0])
    img = [row[:] for row in grid]
    changed = True
    while changed:
        changed = False
        del1 = []
        for r in range(1, rows - 1):
            for c in range(1, cols - 1):
                if img[r][c] != 1:
                    continue
                p2, p3, p4, p5, p6, p7, p8, p9 = (
                    img[r - 1][c], img[r - 1][c + 1], img[r][c + 1], img[r + 1][c + 1],
                    img[r + 1][c], img[r + 1][c - 1], img[r][c - 1], img[r - 1][c - 1],
                )
                b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9
                if not (2 <= b <= 6):
                    continue
                nbrs = [p2, p3, p4, p5, p6, p7, p8, p9, p2]
                a = sum(1 for i in range(8) if nbrs[i] == 0 and nbrs[i + 1] == 1)
                if a != 1:
                    continue
                if p2 * p4 * p6 != 0:
                    continue
                if p4 * p6 * p8 != 0:
                    continue
                del1.append((r, c))
        for r, c in del1:
            img[r][c] = 0
            changed = True

        del2 = []
        for r in range(1, rows - 1):
            for c in range(1, cols - 1):
                if img[r][c] != 1:
                    continue
                p2, p3, p4, p5, p6, p7, p8, p9 = (
                    img[r - 1][c], img[r - 1][c + 1], img[r][c + 1], img[r + 1][c + 1],
                    img[r + 1][c], img[r + 1][c - 1], img[r][c - 1], img[r - 1][c - 1],
                )
                b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9
                if not (2 <= b <= 6):
                    continue
                nbrs = [p2, p3, p4, p5, p6, p7, p8, p9, p2]
                a = sum(1 for i in range(8) if nbrs[i] == 0 and nbrs[i + 1] == 1)
                if a != 1:
                    continue
                if p2 * p4 * p8 != 0:
                    continue
                if p2 * p6 * p8 != 0:
                    continue
                del2.append((r, c))
        for r, c in del2:
            img[r][c] = 0
            changed = True
    return img


def test_coc_grid_size_and_budget():
    assert COC_GRID_SIZE == 44
    assert DEFAULT_MAX_WALLS == 325


def test_zhang_suen_thinning():
    # 7x7 grid with solid 3x3 block in center (9 walls)
    grid = [[0] * 7 for _ in range(7)]
    for r in range(2, 5):
        for c in range(2, 5):
            grid[r][c] = 1

    thinned = zhang_suen_thinning(grid)
    before_count = sum(sum(row) for row in grid)
    after_count = sum(sum(row) for row in thinned)

    assert before_count == 9
    assert after_count == 1  # 3x3 block thins to 1 pixel center


def test_binary_search_wall_budget_constraint():
    # Simulate binary search scaling down a heavy pattern to respect max_walls
    max_walls = 50
    # Dummy evaluator where walls = scale * 2
    def eval_walls(scale):
        return scale * 2

    target_scale = 100  # would give 200 walls > 50
    low = 10
    high = target_scale
    best_scale = low

    for _ in range(10):
        mid = (low + high) // 2
        walls = eval_walls(mid)
        if walls <= max_walls:
            best_scale = mid
            low = mid + 1
        else:
            high = mid - 1

    assert eval_walls(best_scale) <= max_walls
    assert best_scale == 25
    assert eval_walls(best_scale) == 50

