/**
 * CoC Wall Art (Duvar Yazısı) Grid & Thinning Engine
 * ===================================================
 * - Official Clash of Clans Home Village buildable grid size: 44x44 tiles.
 * - Standard max walls (TH17/18): 325 pieces.
 * - Supports Zhang-Suen binary thinning (1-cell stroke skeleton), contour extraction,
 *   binary search downscaling to fit within wall budget, and isometric 3D projection.
 */

export const COC_GRID_SIZE = 44;
export const DEFAULT_MAX_WALLS = 325; // TH17 / TH18 Wall limit

export interface WallFont {
  id: string;
  name: string;
  family: string;
  style: string;
  license: string;
  filename: string;
  supportsTurkish: boolean;
}

export const WALL_FONTS: WallFont[] = [
  {
    id: "roboto",
    name: "Roboto",
    family: "Roboto",
    style: "Modern Sans",
    license: "Apache 2.0",
    filename: "Roboto-Regular.ttf",
    supportsTurkish: true,
  },
  {
    id: "montserrat",
    name: "Montserrat",
    family: "Montserrat",
    style: "Geometrik Kalın",
    license: "SIL OFL 1.1",
    filename: "Montserrat-Bold.ttf",
    supportsTurkish: true,
  },
  {
    id: "oswald",
    name: "Oswald",
    family: "Oswald",
    style: "Sıkışık Gotik",
    license: "SIL OFL 1.1",
    filename: "Oswald-Bold.ttf",
    supportsTurkish: true,
  },
  {
    id: "bebas-neue",
    name: "Bebas Neue",
    family: "Bebas Neue",
    style: "Manşet / Afiş",
    license: "SIL OFL 1.1",
    filename: "BebasNeue-Regular.ttf",
    supportsTurkish: true,
  },
  {
    id: "anton",
    name: "Anton",
    family: "Anton",
    style: "Ağır Blok",
    license: "SIL OFL 1.1",
    filename: "Anton-Regular.ttf",
    supportsTurkish: true,
  },
  {
    id: "russo-one",
    name: "Russo One",
    family: "Russo One",
    style: "Oyun / Mekanik",
    license: "SIL OFL 1.1",
    filename: "RussoOne-Regular.ttf",
    supportsTurkish: true,
  },
  {
    id: "cinzel",
    name: "Cinzel",
    family: "Cinzel",
    style: "Klan / Ortaçağ",
    license: "SIL OFL 1.1",
    filename: "Cinzel-Bold.ttf",
    supportsTurkish: true,
  },
  {
    id: "vt323",
    name: "VT323",
    family: "VT323",
    style: "Retro Piksel",
    license: "SIL OFL 1.1",
    filename: "VT323-Regular.ttf",
    supportsTurkish: true,
  },
];

export type WallArtMode = "skeleton" | "contour" | "filled";

export interface RowBuildSegment {
  fromCol: number;
  toCol: number;
  count: number;
}

export interface RowBuildGuide {
  row: number; // 1-indexed for players (1..44)
  wallCount: number;
  segments: RowBuildSegment[];
}

export interface WallArtResult {
  grid: number[][]; // 44x44 binary matrix (0 = empty, 1 = wall)
  usedWalls: number;
  maxWalls: number;
  effectiveScale: number;
  wasScaledDown: boolean;
  originalScale: number;
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
  buildGuide: RowBuildGuide[];
  missingChars: string[];
}

const TURKISH_CHARS = "çğıöşüÇĞİÖŞÜ";

/**
 * Checks if the text contains any unsupported characters
 */
export function checkTextSupport(text: string, font: WallFont): string[] {
  if (font.supportsTurkish) return [];
  const missing: string[] = [];
  for (const ch of text) {
    if (TURKISH_CHARS.includes(ch) && !missing.includes(ch)) {
      missing.push(ch);
    }
  }
  return missing;
}

/**
 * Zhang-Suen Thinning Algorithm
 * Thins arbitrary binary shapes down to 1-pixel thickness while preserving 8-connectivity.
 */
export function zhangSuenThinning(grid: number[][]): number[][] {
  const rows = grid.length;
  if (rows === 0) return [];
  const cols = grid[0].length;

  // Add 1-pixel border of 0s to prevent edge indexing issues
  const paddedRows = rows + 2;
  const paddedCols = cols + 2;
  const img: number[][] = Array.from({ length: paddedRows }, (_, r) =>
    Array.from({ length: paddedCols }, (_, c) => {
      if (r === 0 || r === paddedRows - 1 || c === 0 || c === paddedCols - 1) return 0;
      return grid[r - 1][c - 1];
    })
  );

  let hasChanged = true;
  let iterations = 0;
  const maxIterations = 100; // Safeguard

  while (hasChanged && iterations < maxIterations) {
    hasChanged = false;
    iterations++;

    // Sub-iteration 1
    const del1: [number, number][] = [];
    for (let r = 1; r < paddedRows - 1; r++) {
      for (let c = 1; c < paddedCols - 1; c++) {
        if (img[r][c] !== 1) continue;

        const p2 = img[r - 1][c];
        const p3 = img[r - 1][c + 1];
        const p4 = img[r][c + 1];
        const p5 = img[r + 1][c + 1];
        const p6 = img[r + 1][c];
        const p7 = img[r + 1][c - 1];
        const p8 = img[r][c - 1];
        const p9 = img[r - 1][c - 1];

        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (B < 2 || B > 6) continue;

        const nbrs = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let A = 0;
        for (let i = 0; i < 8; i++) {
          if (nbrs[i] === 0 && nbrs[i + 1] === 1) A++;
        }
        if (A !== 1) continue;

        if (p2 * p4 * p6 !== 0) continue;
        if (p4 * p6 * p8 !== 0) continue;

        del1.push([r, c]);
      }
    }

    if (del1.length > 0) {
      hasChanged = true;
      for (const [r, c] of del1) {
        img[r][c] = 0;
      }
    }

    // Sub-iteration 2
    const del2: [number, number][] = [];
    for (let r = 1; r < paddedRows - 1; r++) {
      for (let c = 1; c < paddedCols - 1; c++) {
        if (img[r][c] !== 1) continue;

        const p2 = img[r - 1][c];
        const p3 = img[r - 1][c + 1];
        const p4 = img[r][c + 1];
        const p5 = img[r + 1][c + 1];
        const p6 = img[r + 1][c];
        const p7 = img[r + 1][c - 1];
        const p8 = img[r][c - 1];
        const p9 = img[r - 1][c - 1];

        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (B < 2 || B > 6) continue;

        const nbrs = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let A = 0;
        for (let i = 0; i < 8; i++) {
          if (nbrs[i] === 0 && nbrs[i + 1] === 1) A++;
        }
        if (A !== 1) continue;

        if (p2 * p4 * p8 !== 0) continue;
        if (p2 * p6 * p8 !== 0) continue;

        del2.push([r, c]);
      }
    }

    if (del2.length > 0) {
      hasChanged = true;
      for (const [r, c] of del2) {
        img[r][c] = 0;
      }
    }
  }

  // Unpad to original size
  const result: number[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => img[r + 1][c + 1])
  );

  return result;
}

/**
 * 4-neighborhood contour extraction (hollow outline)
 */
export function extractContour(grid: number[][]): number[][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const result = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 1) continue;

      const isBorder =
        r === 0 ||
        r === rows - 1 ||
        c === 0 ||
        c === cols - 1 ||
        grid[r - 1][c] === 0 ||
        grid[r + 1][c] === 0 ||
        grid[r][c - 1] === 0 ||
        grid[r][c + 1] === 0;

      if (isBorder) {
        result[r][c] = 1;
      }
    }
  }
  return result;
}

/**
 * Rasterizes text into a binary 44x44 grid using an HTML Canvas.
 */
export function rasterizeTextToGrid(
  text: string,
  fontFamily: string,
  scalePct: number,
  rotationDeg: number,
  mode: WallArtMode = "skeleton"
): number[][] {
  if (!text || text.trim().length === 0) {
    return Array.from({ length: COC_GRID_SIZE }, () => Array(COC_GRID_SIZE).fill(0));
  }

  // Use a canvas buffer
  let canvas: HTMLCanvasElement;
  if (typeof document !== "undefined") {
    canvas = document.createElement("canvas");
  } else {
    // SSR / Node fallback if needed
    return Array.from({ length: COC_GRID_SIZE }, () => Array(COC_GRID_SIZE).fill(0));
  }

  canvas.width = COC_GRID_SIZE;
  canvas.height = COC_GRID_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return Array.from({ length: COC_GRID_SIZE }, () => Array(COC_GRID_SIZE).fill(0));

  ctx.clearRect(0, 0, COC_GRID_SIZE, COC_GRID_SIZE);

  // Base font size scaled by scalePct
  // At 100% scale, choose a font size proportional to text length and grid size
  const textLen = Math.max(1, text.length);
  const autoBaseSize = Math.max(8, Math.min(28, Math.round((COC_GRID_SIZE * 0.8) / Math.sqrt(textLen))));
  const calculatedFontSize = Math.max(6, Math.round(autoBaseSize * (scalePct / 100)));

  ctx.save();
  ctx.translate(COC_GRID_SIZE / 2, COC_GRID_SIZE / 2);
  ctx.rotate((rotationDeg * Math.PI) / 180);

  ctx.font = `bold ${calculatedFontSize}px "${fontFamily}", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";

  // Handle multi-line text (if contains \n)
  const lines = text.split("\n");
  const lineHeight = calculatedFontSize * 1.15;
  const totalHeight = (lines.length - 1) * lineHeight;
  const startY = -totalHeight / 2;

  lines.forEach((line, idx) => {
    ctx.fillText(line, 0, startY + idx * lineHeight);
  });

  ctx.restore();

  // Read pixels and threshold
  const imgData = ctx.getImageData(0, 0, COC_GRID_SIZE, COC_GRID_SIZE);
  const data = imgData.data;

  const rawGrid: number[][] = Array.from({ length: COC_GRID_SIZE }, () =>
    Array(COC_GRID_SIZE).fill(0)
  );

  for (let r = 0; r < COC_GRID_SIZE; r++) {
    for (let c = 0; c < COC_GRID_SIZE; c++) {
      const idx = (r * COC_GRID_SIZE + c) * 4;
      const alpha = data[idx + 3];
      // Threshold at 90 alpha
      if (alpha > 90) {
        rawGrid[r][c] = 1;
      }
    }
  }

  // Apply selected thinning / contour mode
  if (mode === "skeleton") {
    return zhangSuenThinning(rawGrid);
  } else if (mode === "contour") {
    return extractContour(rawGrid);
  } else {
    return rawGrid;
  }
}

/**
 * Counts filled walls and gets bounding box
 */
export function analyzeGrid(grid: number[][]): {
  count: number;
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
} {
  const rows = grid.length;
  if (rows === 0) return { count: 0, minR: 0, maxR: 0, minC: 0, maxC: 0 };
  const cols = grid[0].length;

  let count = 0;
  let minR = rows;
  let maxR = -1;
  let minC = cols;
  let maxC = -1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1) {
        count++;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }

  if (count === 0) {
    return { count: 0, minR: 0, maxR: 0, minC: 0, maxC: 0 };
  }

  return { count, minR, maxR, minC, maxC };
}

/**
 * Generates the row-by-row build guide with contiguous wall segments.
 */
export function generateBuildGuide(grid: number[][]): RowBuildGuide[] {
  const guide: RowBuildGuide[] = [];

  for (let r = 0; r < COC_GRID_SIZE; r++) {
    const rowSegments: RowBuildSegment[] = [];
    let inSegment = false;
    let segStart = -1;
    let rowWalls = 0;

    for (let c = 0; c < COC_GRID_SIZE; c++) {
      if (grid[r][c] === 1) {
        rowWalls++;
        if (!inSegment) {
          inSegment = true;
          segStart = c;
        }
      } else {
        if (inSegment) {
          rowSegments.push({
            fromCol: segStart + 1, // 1-indexed for players
            toCol: c,             // 1-indexed
            count: c - segStart,
          });
          inSegment = false;
        }
      }
    }

    if (inSegment) {
      rowSegments.push({
        fromCol: segStart + 1,
        toCol: COC_GRID_SIZE,
        count: COC_GRID_SIZE - segStart,
      });
    }

    if (rowWalls > 0) {
      guide.push({
        row: r + 1, // 1-indexed
        wallCount: rowWalls,
        segments: rowSegments,
      });
    }
  }

  return guide;
}

/**
 * Computes Wall Art with Binary Search Auto-Scaling if wall budget is exceeded.
 */
export function computeWallArt(
  text: string,
  font: WallFont,
  scalePct: number,
  rotationDeg: number,
  maxWalls: number,
  mode: WallArtMode = "skeleton"
): WallArtResult {
  const missingChars = checkTextSupport(text, font);

  // If text is empty
  if (!text.trim()) {
    return {
      grid: Array.from({ length: COC_GRID_SIZE }, () => Array(COC_GRID_SIZE).fill(0)),
      usedWalls: 0,
      maxWalls,
      effectiveScale: scalePct,
      wasScaledDown: false,
      originalScale: scalePct,
      minCol: 0,
      maxCol: 0,
      minRow: 0,
      maxRow: 0,
      buildGuide: [],
      missingChars,
    };
  }

  // 1. Initial attempt at user's desired scale
  let currentGrid = rasterizeTextToGrid(text, font.family, scalePct, rotationDeg, mode);
  let analysis = analyzeGrid(currentGrid);

  // If within budget and fits in bounds, return immediately
  if (analysis.count <= maxWalls && analysis.count > 0) {
    return {
      grid: currentGrid,
      usedWalls: analysis.count,
      maxWalls,
      effectiveScale: scalePct,
      wasScaledDown: false,
      originalScale: scalePct,
      minCol: analysis.minC + 1,
      maxCol: analysis.maxC + 1,
      minRow: analysis.minR + 1,
      maxRow: analysis.maxR + 1,
      buildGuide: generateBuildGuide(currentGrid),
      missingChars,
    };
  }

  // 2. Binary search to downscale until walls <= maxWalls
  let low = 10;
  let high = scalePct;
  let bestScale = low;
  let bestGrid = currentGrid;
  let bestAnalysis = analysis;

  for (let iter = 0; iter < 12; iter++) {
    const mid = Math.round((low + high) / 2);
    const candidateGrid = rasterizeTextToGrid(text, font.family, mid, rotationDeg, mode);
    const candidateAnalysis = analyzeGrid(candidateGrid);

    if (candidateAnalysis.count <= maxWalls && candidateAnalysis.count > 0) {
      bestScale = mid;
      bestGrid = candidateGrid;
      bestAnalysis = candidateAnalysis;
      low = mid + 1; // Try to get as close to maxWalls as possible without exceeding
    } else {
      high = mid - 1; // Exceeded budget or empty, shrink
    }
  }

  return {
    grid: bestGrid,
    usedWalls: bestAnalysis.count,
    maxWalls,
    effectiveScale: bestScale,
    wasScaledDown: bestScale < scalePct,
    originalScale: scalePct,
    minCol: bestAnalysis.minC + 1,
    maxCol: bestAnalysis.maxC + 1,
    minRow: bestAnalysis.minR + 1,
    maxRow: bestAnalysis.maxR + 1,
    buildGuide: generateBuildGuide(bestGrid),
    missingChars,
  };
}

/**
 * Generates high-resolution PNG data URL with full 44x44 coordinate labels & blueprint.
 */
export function exportPlanPng(
  grid: number[][],
  meta: {
    text: string;
    fontName: string;
    usedWalls: number;
    maxWalls: number;
    scale: number;
    rotation: number;
  }
): string {
  if (typeof document === "undefined") return "";

  const canvas = document.createElement("canvas");
  const cellSize = 24; // 24px per tile
  const marginX = 80;  // Room for row numbers on left
  const marginY = 160; // Room for title & stats on top
  const paddingBottom = 60;
  const paddingRight = 60;

  canvas.width = marginX + COC_GRID_SIZE * cellSize + paddingRight;
  canvas.height = marginY + COC_GRID_SIZE * cellSize + paddingBottom;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. Blueprint Dark Background
  ctx.fillStyle = "#0B111E";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Header
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 26px -apple-system, sans-serif";
  ctx.fillText("CoC Analitik • Duvar Yazısı İnşa Planı", marginX, 50);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "bold 14px -apple-system, sans-serif";
  ctx.fillText(
    `Metin: "${meta.text}"   •   Font: ${meta.fontName}   •   Duvar: ${meta.usedWalls} / ${meta.maxWalls}   •   Izgara: 44x44 Ana Köy`,
    marginX,
    80
  );
  ctx.fillText(
    `Ölçek: %${meta.scale}   •   Açı: ${meta.rotation}°   •   Her kare = 1x1 Duvar Segmenti`,
    marginX,
    105
  );

  // 3. Grid Axes Numbers
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "#64748B";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Top column numbers (1..44)
  for (let c = 0; c < COC_GRID_SIZE; c++) {
    const x = marginX + c * cellSize + cellSize / 2;
    const isMajor = (c + 1) % 5 === 0 || c === 0 || c === COC_GRID_SIZE - 1;
    ctx.fillStyle = isMajor ? "#38BDF8" : "#475569";
    ctx.fillText(`${c + 1}`, x, marginY - 14);
  }

  // Left row numbers (1..44)
  ctx.textAlign = "right";
  for (let r = 0; r < COC_GRID_SIZE; r++) {
    const y = marginY + r * cellSize + cellSize / 2;
    const isMajor = (r + 1) % 5 === 0 || r === 0 || r === COC_GRID_SIZE - 1;
    ctx.fillStyle = isMajor ? "#38BDF8" : "#475569";
    ctx.fillText(`${r + 1}`, marginX - 12, y);
  }

  // 4. Draw Grid Board & Cells
  for (let r = 0; r < COC_GRID_SIZE; r++) {
    for (let c = 0; c < COC_GRID_SIZE; c++) {
      const x = marginX + c * cellSize;
      const y = marginY + r * cellSize;
      const isWall = grid[r][c] === 1;

      // Cell border / background
      ctx.fillStyle = isWall ? "#F59E0B" : "#151E30";
      ctx.fillRect(x, y, cellSize, cellSize);

      // Cell border
      ctx.strokeStyle = isWall ? "#FDE68A" : "#1E293B";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);

      // 3D bevel effect for walls
      if (isWall) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillRect(x + 2, y + 2, cellSize - 4, 3);
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fillRect(x + 2, y + cellSize - 5, cellSize - 4, 3);
      }
    }
  }

  // 5. Village Center Guide Lines (between 22 and 23)
  const midX = marginX + 22 * cellSize;
  const midY = marginY + 22 * cellSize;
  ctx.strokeStyle = "rgba(239, 68, 68, 0.45)"; // Soft red
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  // Center vertical line
  ctx.beginPath();
  ctx.moveTo(midX, marginY);
  ctx.lineTo(midX, marginY + COC_GRID_SIZE * cellSize);
  ctx.stroke();

  // Center horizontal line
  ctx.beginPath();
  ctx.moveTo(marginX, midY);
  ctx.lineTo(marginX + COC_GRID_SIZE * cellSize, midY);
  ctx.stroke();

  ctx.setLineDash([]); // Reset dash

  // 6. Footer Note
  ctx.fillStyle = "#64748B";
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    "Supercell Hayran İçeriği Politikası • Bu görsel ticari değildir. CoC Analitik (TH18 Meta Platformu)",
    marginX,
    canvas.height - 24
  );

  return canvas.toDataURL("image/png");
}
