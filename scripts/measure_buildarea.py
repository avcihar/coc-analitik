"""
Clash of Clans Sahne İnşa Alanı (Build Area) Ölçüm ve Analiz Aracı
-------------------------------------------------------------------
Köy haritasındaki 44x44 inşa alanının 4 tepe noktasını:
1. Karo deseni (checkerboard) 2D Fourier / otokorelasyon analizi (--method tile)
2. Renk segmentasyonu ve kontur analizi (--method color)
yöntemleriyle tespit eder.

Kullanım:
  python scripts/measure_buildarea.py --image <görsel_yolu> --method tile --output debug.png
"""

import sys
import argparse
from pathlib import Path
import cv2
import numpy as np
from scipy.signal import find_peaks

def detect_tile_period(gray, cx, cy, max_w=70, max_h=55):
    """
    Merkez bölgeden alınan yama üzerinde 2D Fourier dönüşümü ve otokorelasyon
    ile karo adımı (dx, dy) periyodunu çıkarır.
    """
    h, w = gray.shape
    psize = min(140, min(cx, cy, w - cx, h - cy))
    if psize < 40:
        return None, None, 0.0

    patch = gray[cy - psize:cy + psize, cx - psize:cx + psize].astype(float)
    p = patch - patch.mean()
    f = np.fft.fft2(p, s=[p.shape[0] * 2, p.shape[1] * 2])
    corr = np.fft.ifft2(f * np.conj(f)).real
    corr = np.fft.fftshift(corr)
    corr /= (corr.max() + 1e-6)
    mid_y, mid_x = corr.shape[0] // 2, corr.shape[1] // 2

    search_x = corr[mid_y, mid_x + 8:mid_x + min(max_w, mid_x - 5)]
    search_y = corr[mid_y + 6:mid_y + min(max_h, mid_y - 5), mid_x]

    peaks_x, _ = find_peaks(search_x, prominence=0.015)
    peaks_y, _ = find_peaks(search_y, prominence=0.015)

    if len(peaks_x) == 0 or len(peaks_y) == 0:
        return None, None, 0.0

    dx = peaks_x[0] + 8
    dy = peaks_y[0] + 6
    score = float((search_x[peaks_x[0]] + search_y[peaks_y[0]]) / 2.0)
    return dx, dy, score

def measure_build_area(image_path: str, method: str = "tile", output_debug: str = None):
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Görsel açılamadı: {image_path}")

    h, w, _ = img.shape
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    if method == "tile":
        # 1. Karo periyodu tespiti
        cx_approx, cy_approx = w // 2, h // 2
        best_dx, best_dy, best_score = None, None, -1.0

        for fy in [0.45, 0.5, 0.55]:
            for fx in [0.45, 0.5, 0.55]:
                cx = int(round(w * fx))
                cy = int(round(h * fy))
                dx, dy, score = detect_tile_period(gray, cx, cy)
                if dx and dy and score > best_score:
                    ratio = dx / dy
                    if 1.15 <= ratio <= 1.55:
                        best_score = score
                        best_dx, best_dy = dx, dy
                        cx_approx, cy_approx = cx, cy

        if not best_dx:
            # Fallback to standard 4/3 ratio
            dw = round(w * 0.65, 1)
            dh = round(dw / (4.0 / 3.0), 1)
        else:
            dw = 44.0 * best_dx
            dh = 44.0 * best_dy

        top = np.array([float(cx_approx), float(cy_approx - dh / 2.0)])
        bottom = np.array([float(cx_approx), float(cy_approx + dh / 2.0)])
        right = np.array([float(cx_approx + dw / 2.0), float(cy_approx)])
        left = np.array([float(cx_approx - dw / 2.0), float(cy_approx)])

    else:
        # Renk segmentasyonu
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        H, S, V = cv2.split(hsv)
        R = img[:, :, 2]
        mask = (H >= 32) & (H <= 38) & (S >= 110) & (S <= 210) & (V >= 140) & (V <= 230) & (R >= 140)
        mask_u8 = (mask.astype(np.uint8)) * 255

        cy_approx, cx_approx = h / 2.0, w / 2.0
        Y, X = np.ogrid[:h, :w]
        dist_norm = np.abs(X - cx_approx) / (w * 0.42) + np.abs(Y - cy_approx) / (h * 0.45)
        mask_u8[dist_norm > 1.0] = 0

        kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 25))
        kernel_open = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        clean_mask = cv2.morphologyEx(mask_u8, cv2.MORPH_CLOSE, kernel_close)
        clean_mask = cv2.morphologyEx(clean_mask, cv2.MORPH_OPEN, kernel_open)

        cnts, _ = cv2.findContours(clean_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not cnts:
            raise ValueError("Açık yeşil alan konturu tespit edilemedi.")
        largest_cnt = max(cnts, key=cv2.contourArea)

        hull = cv2.convexHull(largest_cnt).reshape(-1, 2)
        top_raw = hull[np.argmin(hull[:, 1])]
        bot_raw = hull[np.argmax(hull[:, 1])]
        left_raw = hull[np.argmin(hull[:, 0])]
        right_raw = hull[np.argmax(hull[:, 0])]

        center_x = (float(right_raw[0]) + float(left_raw[0])) / 2.0
        center_y = (float(bot_raw[1]) + float(top_raw[1])) / 2.0

        top = np.array([center_x, float(top_raw[1])])
        bottom = np.array([center_x, float(bot_raw[1])])
        right = np.array([float(right_raw[0]), center_y])
        left = np.array([float(left_raw[0]), center_y])

    # Debug Overlay
    if output_debug:
        vis = img.copy()
        poly = np.array([[top[0], top[1]], [right[0], right[1]], [bottom[0], bottom[1]], [left[0], left[1]]], np.int32)
        cv2.polylines(vis, [poly], isClosed=True, color=(0, 0, 255), thickness=4)

        N = 44
        for c in range(N + 1):
            u = c / float(N)
            p0 = (1 - u) * top + u * right
            p1 = (1 - u) * left + u * bottom
            cv2.line(vis, (int(round(p0[0])), int(round(p0[1]))), (int(round(p1[0])), int(round(p1[1]))), (255, 255, 255), 1)

        for r in range(N + 1):
            v = r / float(N)
            p0 = (1 - v) * top + v * left
            p1 = (1 - v) * right + v * bottom
            cv2.line(vis, (int(round(p0[0])), int(round(p0[1]))), (int(round(p1[0])), int(round(p1[1]))), (255, 255, 255), 1)

        cv2.imwrite(output_debug, vis)
        print(f"Debug overlay kaydedildi: {output_debug}")

    bw = right[0] - left[0]
    bh = bottom[1] - top[1]
    ratio = bw / bh

    return {
        "top": {"x": round(float(top[0]), 1), "y": round(float(top[1]), 1)},
        "right": {"x": round(float(right[0]), 1), "y": round(float(right[1]), 1)},
        "bottom": {"x": round(float(bottom[0]), 1), "y": round(float(bottom[1]), 1)},
        "left": {"x": round(float(left[0]), 1), "y": round(float(left[1]), 1)},
        "width": round(float(bw), 1),
        "height": round(float(bh), 1),
        "ratio": round(float(ratio), 4),
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clash of Clans Sahne İnşa Alanı Ölçümü")
    parser.add_argument("--image", required=True, help="Sahne görsel dosya yolu")
    parser.add_argument("--method", default="tile", choices=["tile", "color"], help="Ölçüm yöntemi")
    parser.add_argument("--output", default=None, help="Debug görseli çıktı yolu (opsiyonel)")
    args = parser.parse_args()

    res = measure_build_area(args.image, method=args.method, output_debug=args.output)
    print("\n=== ÖLÇÜM SONUÇLARI ===")
    print(f"Top:    {{ x: {res['top']['x']}, y: {res['top']['y']} }}")
    print(f"Right:  {{ x: {res['right']['x']}, y: {res['right']['y']} }}")
    print(f"Bottom: {{ x: {res['bottom']['x']}, y: {res['bottom']['y']} }}")
    print(f"Left:   {{ x: {res['left']['x']}, y: {res['left']['y']} }}")
    print(f"Elmas Boyutları: {res['width']} × {res['height']} px (Oran: {res['ratio']:.4f})")
