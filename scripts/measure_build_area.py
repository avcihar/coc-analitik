import cv2
import numpy as np
from PIL import Image

# Load image
img = cv2.imread('docs/Sceneries/Scenery_Ingame_Winter.webp')
h, w = img.shape[:2]
print(f"Loaded scenery image: {w}x{h}")

# Greenness metric:
# Grass has high G, lower R and B. Snow has high R, G, B (grey/white).
# Greenness = 2.0 * G - R - B
greenness = 2.0 * img[:, :, 1].astype(float) - img[:, :, 0].astype(float) - img[:, :, 2].astype(float)

# Function to sample perpendicular slice and find peak gradient
def find_edge_points(p_start, p_end, n_samples=120, search_radius=120):
    dx = p_end[0] - p_start[0]
    dy = p_end[1] - p_start[1]
    length = np.hypot(dx, dy)
    # Unit tangent and normal
    tx = dx / length
    ty = dy / length
    nx = -ty
    ny = tx
    
    edge_pts = []
    
    # We sample along the line from t=0.15 to t=0.85 to avoid corners
    for t in np.linspace(0.12, 0.88, n_samples):
        cx = p_start[0] + t * dx
        cy = p_start[1] + t * dy
        
        # Sample along normal
        s_vals = np.arange(-search_radius, search_radius)
        px_vals = np.clip(np.round(cx + s_vals * nx).astype(int), 0, w - 1)
        py_vals = np.clip(np.round(cy + s_vals * ny).astype(int), 0, h - 1)
        
        profile = greenness[py_vals, px_vals]
        # Smooth profile slightly to avoid single-pixel grass noise
        kernel = np.ones(5) / 5.0
        smoothed = np.convolve(profile, kernel, mode='same')
        
        # Edge is where greenness drops sharply (maximum derivative)
        grad = np.abs(np.diff(smoothed))
        max_idx = np.argmax(grad)
        
        if grad[max_idx] > 5.0: # Significant edge
            best_s = s_vals[max_idx]
            edge_x = cx + best_s * nx
            edge_y = cy + best_s * ny
            edge_pts.append((edge_x, edge_y))
            
    return np.array(edge_pts)

# Initial rough corners of the green diamond
# Top: ~1850, 100
# Right: ~3350, 1150
# Bottom: ~1890, 2280
# Left: ~350, 1100

pts_tr = find_edge_points((1850, 100), (3350, 1150))
pts_br = find_edge_points((3350, 1150), (1890, 2280))
pts_bl = find_edge_points((1890, 2280), (350, 1100))
pts_tl = find_edge_points((350, 1100), (1850, 100))

print(f"Edge points found: TR={len(pts_tr)}, BR={len(pts_br)}, BL={len(pts_bl)}, TL={len(pts_tl)}")

# Robust line fitting using RANSAC / Huber loss
def fit_line_robust(pts):
    # cv2.fitLine with Huber / Fair / L1 distance
    line = cv2.fitLine(pts.astype(np.float32), cv2.DIST_HUBER, 0, 0.01, 0.01)
    vx, vy, x0, y0 = line.flatten()
    m = vy / vx
    b = y0 - m * x0
    return m, b

line_tr = fit_line_robust(pts_tr)
line_br = fit_line_robust(pts_br)
line_bl = fit_line_robust(pts_bl)
line_tl = fit_line_robust(pts_tl)

print(f"Fitted Line TR: y = {line_tr[0]:.5f} * x + {line_tr[1]:.2f}")
print(f"Fitted Line BR: y = {line_br[0]:.5f} * x + {line_br[1]:.2f}")
print(f"Fitted Line BL: y = {line_bl[0]:.5f} * x + {line_bl[1]:.2f}")
print(f"Fitted Line TL: y = {line_tl[0]:.5f} * x + {line_tl[1]:.2f}")

def intersect(l1, l2):
    m1, b1 = l1
    m2, b2 = l2
    x = (b2 - b1) / (m1 - m2)
    y = m1 * x + b1
    return float(x), float(y)

top = intersect(line_tl, line_tr)
right = intersect(line_tr, line_br)
bottom = intersect(line_br, line_bl)
left = intersect(line_bl, line_tl)

print("\n=== GREEN DIAMOND MEASURED CORNERS (sub-pixel) ===")
print(f"Top:    x={top[0]:.2f}, y={top[1]:.2f}")
print(f"Right:  x={right[0]:.2f}, y={right[1]:.2f}")
print(f"Bottom: x={bottom[0]:.2f}, y={bottom[1]:.2f}")
print(f"Left:   x={left[0]:.2f}, y={left[1]:.2f}")

# Check slopes
print(f"\nSlopes: TR={line_tr[0]:.4f}, BR={line_br[0]:.4f}, BL={line_bl[0]:.4f}, TL={line_tl[0]:.4f}")
print(f"Expected isometric slope magnitude: 21/28 = 0.7500")

# Width and height
total_w = right[0] - left[0]
total_h = bottom[1] - top[1]
print(f"Total Diamond Width: {total_w:.2f}px, Height: {total_h:.2f}px")
print(f"Aspect ratio: {total_w / total_h:.4f} (Ideal 4/3 = 1.3333)")

