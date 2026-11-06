"""
Automated Scenery Measurement & Debug Overlay Generator
-------------------------------------------------------
Analyzes each of the 70 sceneries, finds the tile pattern and island boundaries,
computes the 4 corners, and renders full-resolution debug overlays with corner
labels and 44x44 grid lines for visual verification.
"""

import os
import json
from pathlib import Path
import cv2
import numpy as np
from scipy.signal import find_peaks

SCENERIES_DIR = Path("frontend/public/sceneries")
DEBUG_DIR = Path("scripts/debug_sceneries")
DEBUG_DIR.mkdir(parents=True, exist_ok=True)

# Ground truth & verified sceneries
KNOWN_CALIBRATIONS = {
    "Scenery_Ingame_Winter.webp": {
        "status": "Doğrulandı",
        "method": "calibrated",
        "top": {"x": 1894.5, "y": 265.5},
        "right": {"x": 3107.0, "y": 1175.0},
        "bottom": {"x": 1894.5, "y": 2084.5},
        "left": {"x": 682.0, "y": 1175.0},
    },
    "FireAndIce_Scenery.webp": {
        "status": "Doğrulandı",
        "method": "tile-pattern",
        "top": {"x": 1880.5, "y": 478.0},
        "right": {"x": 2946.0, "y": 1279.5},
        "bottom": {"x": 1880.5, "y": 2081.0},
        "left": {"x": 815.0, "y": 1279.5},
    },
    "Map_Barbarian_Odyssey_Scenery.webp": {
        "status": "Elle düzeltildi",
        "method": "manual",
        "top": {"x": 1844.5, "y": 661.0},
        "right": {"x": 2304.0, "y": 1006.0},
        "bottom": {"x": 1844.5, "y": 1351.0},
        "left": {"x": 1385.0, "y": 1006.0},
    },
    "Glory_Arena_Scenery.webp": {
        "status": "Güvenilmez",
        "method": "none",
        "reason": "Futbol stadyumu zemininde inşa alanı sekizgen, köşeler tribünlerle kapalı ve kamera aşırı uzak ölçekli.",
    },
}

def detect_tile_period(gray, cx, cy, max_w=70, max_h=55):
    h, w = gray.shape
    psize = min(140, min(cx, cy, w - cx, h - cy))
    if psize < 50:
        return None, None, 0.0

    patch = gray[cy - psize:cy + psize, cx - psize:cx + psize].astype(float)
    p = patch - patch.mean()
    f = np.fft.fft2(p, s=[p.shape[0] * 2, p.shape[1] * 2])
    corr = np.fft.ifft2(f * np.conj(f)).real
    corr = np.fft.fftshift(corr)
    corr /= (corr.max() + 1e-6)
    mid_y, mid_x = corr.shape[0] // 2, corr.shape[1] // 2

    # Search for periodic peaks with prominence
    search_x = corr[mid_y, mid_x + 8:mid_x + min(max_w, mid_x - 5)]
    search_y = corr[mid_y + 6:mid_y + min(max_h, mid_y - 5), mid_x]

    peaks_x, props_x = find_peaks(search_x, prominence=0.02)
    peaks_y, props_y = find_peaks(search_y, prominence=0.02)

    if len(peaks_x) == 0 or len(peaks_y) == 0:
        return None, None, 0.0

    dx = peaks_x[0] + 8
    dy = peaks_y[0] + 6
    score = (search_x[peaks_x[0]] + search_y[peaks_y[0]]) / 2.0
    return dx, dy, float(score)

def measure_scenery(sc_path: Path):
    name = sc_path.name
    if name in KNOWN_CALIBRATIONS:
        cal = KNOWN_CALIBRATIONS[name]
        if cal["status"] == "Güvenilmez":
            return {
                "file": name,
                "status": "Güvenilmez",
                "verified": False,
                "method": cal["method"],
                "reason": cal.get("reason", "Belirsiz inşa alanı"),
            }
        top = cal["top"]
        right = cal["right"]
        bottom = cal["bottom"]
        left = cal["left"]
        img = cv2.imread(str(sc_path))
        h, w, _ = img.shape
        cell_w = (right["x"] - left["x"]) / 44.0
        cell_h = (bottom["y"] - top["y"]) / 44.0
        render_debug_overlay(img, top, right, bottom, left, DEBUG_DIR / f"debug_{sc_path.stem}.png")
        return {
            "file": name,
            "width": w,
            "height": h,
            "status": cal["status"],
            "verified": True,
            "method": cal["method"],
            "top": top,
            "right": right,
            "bottom": bottom,
            "left": left,
            "cell_step": {"col": (round(cell_w / 2, 2), round(cell_h / 2, 2)), "row": (round(-cell_w / 2, 2), round(cell_h / 2, 2))},
            "ratio": round((right["x"] - left["x"]) / (bottom["y"] - top["y"]), 4),
        }

    img = cv2.imread(str(sc_path))
    if img is None:
        return {"file": name, "status": "Güvenilmez", "verified": False, "method": "none", "reason": "Dosya okunamadı"}

    h, w, _ = img.shape
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. Search for tile period in central region
    best_score = -1.0
    best_dx, best_dy = None, None
    best_cx, best_cy = w // 2, h // 2

    for fy in [0.4, 0.45, 0.5, 0.55]:
        for fx in [0.45, 0.5, 0.55]:
            cx = int(round(w * fx))
            cy = int(round(h * fy))
            dx, dy, score = detect_tile_period(gray, cx, cy)
            if dx and dy and score > best_score:
                ratio = dx / dy
                if 1.15 <= ratio <= 1.55:
                    best_score = score
                    best_dx = dx
                    best_dy = dy
                    best_cx = cx
                    best_cy = cy

    # If no tile period detected:
    if not best_dx or best_score < 0.15:
        # Check if it's an unmeasurable scenery (like football, stadium, obscure)
        return {
            "file": name,
            "width": w,
            "height": h,
            "status": "Güvenilmez",
            "verified": False,
            "method": "none",
            "reason": f"Karo deseni / periyodisite tespit edilemedi (skor={best_score:.2f})",
        }

    # 2. Compute coherence to find diamond center
    dx, dy = best_dx, best_dy
    I = gray.astype(float)
    I_shift_y = np.roll(I, -dy, axis=0)
    I_shift_x = np.roll(I, -dx, axis=1)

    ksize = max(25, int(round(dx * 1.5)) | 1)
    mean_I = cv2.blur(I, (ksize, ksize))
    mean_sq_I = cv2.blur(I * I, (ksize, ksize))
    var_I = np.maximum(0, mean_sq_I - mean_I * mean_I)
    std_I = np.sqrt(var_I) + 1e-4

    mean_Iy = cv2.blur(I_shift_y, (ksize, ksize))
    cov_y = cv2.blur(I * I_shift_y, (ksize, ksize)) - mean_I * mean_Iy
    corr_y = cov_y / (std_I * (cv2.blur(np.sqrt(np.maximum(0, cv2.blur(I_shift_y * I_shift_y, (ksize, ksize)) - mean_Iy * mean_Iy)), (ksize, ksize)) + 1e-4))

    mean_Ix = cv2.blur(I_shift_x, (ksize, ksize))
    cov_x = cv2.blur(I * I_shift_x, (ksize, ksize)) - mean_I * mean_Ix
    corr_x = cov_x / (std_I * (cv2.blur(np.sqrt(np.maximum(0, cv2.blur(I_shift_x * I_shift_x, (ksize, ksize)) - mean_Ix * mean_Ix)), (ksize, ksize)) + 1e-4))

    coherence = (corr_x + corr_y) / 2.0
    coherence[std_I < 3.0] = 0

    th = max(0.15, best_score * 0.40)
    mask = (coherence > th).astype(np.uint8) * 255
    k_clean = cv2.getStructuringElement(cv2.MORPH_RECT, (ksize // 2 | 1, ksize // 2 | 1))
    clean_mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k_clean)

    cnts, _ = cv2.findContours(clean_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    valid_cnts = [c for c in cnts if cv2.contourArea(c) > (w * h * 0.015)]

    if not valid_cnts:
        return {
            "file": name,
            "width": w,
            "height": h,
            "status": "Güvenilmez",
            "verified": False,
            "method": "none",
            "reason": "Karo alanı konturu ayrıştırılamadı",
        }

    largest = max(valid_cnts, key=cv2.contourArea)
    M = cv2.moments(largest)
    if M["m00"] <= 0:
        return {
            "file": name,
            "width": w,
            "height": h,
            "status": "Güvenilmez",
            "verified": False,
            "method": "none",
            "reason": "Moment sıfır",
        }

    c_x = M["m10"] / M["m00"]
    c_y = M["m01"] / M["m00"]

    # In Clash of Clans, the build area is exactly 44x44 cells.
    # Tile step is dx, dy. Total diamond size:
    diamond_w = 44.0 * (dx / 1.0)
    diamond_h = 44.0 * (dy / 1.0)

    # Ratio sanity check
    ratio = diamond_w / diamond_h
    if abs(ratio - 4 / 3) > 0.12:
        return {
            "file": name,
            "width": w,
            "height": h,
            "status": "Güvenilmez",
            "verified": False,
            "method": "none",
            "reason": f"En-boy oranı 4/3'ten çok uzak (oran={ratio:.3f})",
        }

    top = {"x": round(float(c_x), 1), "y": round(float(c_y - diamond_h / 2.0), 1)}
    bottom = {"x": round(float(c_x), 1), "y": round(float(c_y + diamond_h / 2.0), 1)}
    right = {"x": round(float(c_x + diamond_w / 2.0), 1), "y": round(float(c_y), 1)}
    left = {"x": round(float(c_x - diamond_w / 2.0), 1), "y": round(float(c_y), 1)}

    render_debug_overlay(img, top, right, bottom, left, DEBUG_DIR / f"debug_{sc_path.stem}.png")

    cell_w = diamond_w / 44.0
    cell_h = diamond_h / 44.0

    return {
        "file": name,
        "width": w,
        "height": h,
        "status": "Doğrulandı",
        "verified": True,
        "method": "tile-pattern",
        "top": top,
        "right": right,
        "bottom": bottom,
        "left": left,
        "cell_step": {"col": (round(cell_w / 2, 2), round(cell_h / 2, 2)), "row": (round(-cell_w / 2, 2), round(cell_h / 2, 2))},
        "ratio": round(ratio, 4),
    }

def render_debug_overlay(img, top, right, bottom, left, out_path):
    vis = img.copy()
    h, w, _ = vis.shape
    thick = max(1, int(round(w / 1800)))
    b_thick = max(2, int(round(w / 600)))

    pt_top = np.array([top["x"], top["y"]])
    pt_right = np.array([right["x"], right["y"]])
    pt_bottom = np.array([bottom["x"], bottom["y"]])
    pt_left = np.array([left["x"], left["y"]])

    # 44x44 grid lines
    for i in range(45):
        u = i / 44.0
        p0 = (1 - u) * pt_top + u * pt_right
        p1 = (1 - u) * pt_left + u * pt_bottom
        cv2.line(vis, (int(round(p0[0])), int(round(p0[1]))), (int(round(p1[0])), int(round(p1[1]))), (255, 255, 255), thick)

        p2 = (1 - u) * pt_top + u * pt_left
        p3 = (1 - u) * pt_right + u * pt_bottom
        cv2.line(vis, (int(round(p2[0])), int(round(p2[1]))), (int(round(p3[0])), int(round(p3[1]))), (255, 255, 255), thick)

    # Red boundary
    poly = np.array([pt_top, pt_right, pt_bottom, pt_left], np.int32)
    cv2.polylines(vis, [poly], True, (0, 0, 255), b_thick)

    # Amber corner cells
    def map_c(c, r):
        u = c / 44.0
        v = r / 44.0
        return (1 - u) * (1 - v) * pt_top + u * (1 - v) * pt_right + u * v * pt_bottom + (1 - u) * v * pt_left

    for c, r in [(0, 0), (43, 0), (43, 43), (0, 43)]:
        cell = [map_c(c, r), map_c(c + 1, r), map_c(c + 1, r + 1), map_c(c, r + 1)]
        cv2.fillPoly(vis, [np.array(cell, np.int32)], (11, 158, 245))

    cv2.imwrite(str(out_path), vis)

def main():
    sc_files = sorted(list(SCENERIES_DIR.glob("*.webp")))
    print(f"Processing {len(sc_files)} sceneries with tile-pattern & edge analyzer...")
    results = []

    verified_count = 0
    unreliable_count = 0

    for sc in sc_files:
        res = measure_scenery(sc)
        results.append(res)
        if res.get("verified", False):
            verified_count += 1
            print(f"✓ {res['file']:<38} {res['status']:<15} method={res['method']} cell_w={res.get('cell_step', {}).get('col', (0,0))[0]*2:.1f}")
        else:
            unreliable_count += 1
            print(f"✗ {res['file']:<38} GÜVENİLMEZ: {res.get('reason', '')}")

    print(f"\nCompleted! Verified: {verified_count}, Unreliable/Excluded: {unreliable_count}")
    out_file = Path("scripts/scenery_measurements.json")
    out_file.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Saved results to {out_file}")

if __name__ == "__main__":
    main()
