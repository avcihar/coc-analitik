import type { BitmapFont } from "./bitmapFonts";
import { getBitmapFont } from "./bitmapFonts";

export const COC_GRID_SIZE = 44;
export const DEFAULT_MAX_WALLS = 325; // TH17 / TH18 Wall limit
export const MAX_BITMAP_SCALE = 4;

export const TURKISH_TO_ASCII: Record<string, string> = {
  "Ç": "C", "ç": "c",
  "Ğ": "G", "ğ": "g",
  "İ": "I", "ı": "i",
  "Ö": "O", "ö": "o",
  "Ş": "S", "ş": "s",
  "Ü": "U", "ü": "u",
};

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
  wallCount: number;
  maxWalls: number;
  isOverBudget: boolean;
  maxFittingChars: number;
  effectiveScale: number;
  originalScale: number;
  wasScaledDown: boolean;
  lineCount: number;
  linesInfo: string;
  warnings: string[];
  convertedChars: string[];
  missingChars: string[];
  buildGuide: RowBuildGuide[];
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export interface CharResolveResult {
  glyph: number[][] | null;
  isSpace: boolean;
  resolvedChar: string | null;
  warning?: string;
  converted?: string;
  width: number;
}

/**
 * Resolves a character against the font without Turkish locale pitfalls.
 */
export function resolveChar(
  rawChar: string,
  font: BitmapFont,
  convertTurkishToAscii: boolean
): CharResolveResult {
  let charToUse = rawChar;
  let converted: string | undefined;

  if (convertTurkishToAscii && TURKISH_TO_ASCII[rawChar]) {
    const asciiEq = TURKISH_TO_ASCII[rawChar];
    converted = `${rawChar} → ${asciiEq}`;
    charToUse = asciiEq;
  }

  // Handle Space
  if (charToUse === " ") {
    // Word spacing: default 4 unscaled columns
    const spaceWidth = Math.max(3, Math.round(font.height * 0.3));
    return {
      glyph: null,
      isSpace: true,
      resolvedChar: " ",
      converted,
      width: spaceWidth,
    };
  }

  // Exact match in glyphs
  if (font.glyphs[charToUse]) {
    const g = font.glyphs[charToUse];
    return {
      glyph: g,
      isSpace: false,
      resolvedChar: charToUse,
      converted,
      width: g[0]?.length || 0,
    };
  }

  // Case fallback (e.g. font only has uppercase A-Z and user entered lowercase a-z)
  const upper = charToUse.toUpperCase();
  if (font.glyphs[upper]) {
    const g = font.glyphs[upper];
    return {
      glyph: g,
      isSpace: false,
      resolvedChar: upper,
      converted,
      width: g[0]?.length || 0,
    };
  }

  // Character is missing in font
  return {
    glyph: null,
    isSpace: false,
    resolvedChar: null,
    converted,
    warning: `"${rawChar}" karakteri bu fontta yok`,
    width: 0,
  };
}

export interface LaidOutLine {
  items: {
    char: string;
    glyph: number[][] | null;
    isSpace: boolean;
    width: number;
  }[];
  lineWidth: number;
}

/**
 * Performs word wrapping and line breaking to fit 44 unscaled grid cells.
 */
export function layoutLines(
  text: string,
  font: BitmapFont,
  scale: number,
  letterSpacing: number,
  convertTurkishToAscii: boolean
): {
  lines: LaidOutLine[];
  warnings: string[];
  convertedChars: string[];
  missingChars: string[];
} {
  const maxUnscaledWidth = Math.max(1, Math.floor(COC_GRID_SIZE / scale));
  const warnings: string[] = [];
  const convertedSet = new Set<string>();
  const missingSet = new Set<string>();

  // Split input into paragraphs by explicit newline
  const paragraphs = text.split(/\r?\n/);
  const allLines: LaidOutLine[] = [];

  for (const para of paragraphs) {
    if (para.length === 0) {
      allLines.push({ items: [], lineWidth: 0 });
      continue;
    }

    // Tokenize paragraph into words and spaces
    const tokens: CharResolveResult[] = [];
    for (const ch of para) {
      const res = resolveChar(ch, font, convertTurkishToAscii);
      if (res.converted) convertedSet.add(res.converted);
      if (res.warning) {
        warnings.push(res.warning);
        missingSet.add(ch);
      }
      if (res.isSpace || res.glyph) {
        tokens.push(res);
      }
    }

    if (tokens.length === 0) {
      continue;
    }

    // Group into words separated by space tokens
    const words: CharResolveResult[][] = [];
    let currentWord: CharResolveResult[] = [];

    for (const t of tokens) {
      if (t.isSpace) {
        if (currentWord.length > 0) {
          words.push(currentWord);
          currentWord = [];
        }
        words.push([t]);
      } else {
        currentWord.push(t);
      }
    }
    if (currentWord.length > 0) {
      words.push(currentWord);
    }

    // Flow words into lines
    let currentLine: LaidOutLine = { items: [], lineWidth: 0 };

    for (const word of words) {
      const isSpaceToken = word.length === 1 && word[0].isSpace;

      let wordWidth = 0;
      if (isSpaceToken) {
        wordWidth = word[0].width;
      } else {
        for (let i = 0; i < word.length; i++) {
          wordWidth += word[i].width + (i > 0 ? letterSpacing : 0);
        }
      }

      const neededSpace = currentLine.items.length > 0 ? (isSpaceToken ? 0 : letterSpacing) : 0;

      if (currentLine.lineWidth + neededSpace + wordWidth <= maxUnscaledWidth) {
        if (currentLine.items.length > 0 && !isSpaceToken && !currentLine.items[currentLine.items.length - 1].isSpace) {
          currentLine.lineWidth += letterSpacing;
        }
        for (const ch of word) {
          currentLine.items.push({
            char: ch.resolvedChar || " ",
            glyph: ch.glyph,
            isSpace: ch.isSpace,
            width: ch.width,
          });
        }
        currentLine.lineWidth += isSpaceToken ? wordWidth : word.reduce((acc, c, idx) => acc + c.width + (idx > 0 ? letterSpacing : 0), 0);
      } else {
        if (isSpaceToken) {
          continue;
        }

        if (currentLine.items.length > 0) {
          allLines.push(currentLine);
          currentLine = { items: [], lineWidth: 0 };
        }

        if (wordWidth <= maxUnscaledWidth) {
          for (const ch of word) {
            currentLine.items.push({
              char: ch.resolvedChar || " ",
              glyph: ch.glyph,
              isSpace: ch.isSpace,
              width: ch.width,
            });
          }
          currentLine.lineWidth = wordWidth;
        } else {
          // Single word exceeds line width: break by character at boundary
          for (let i = 0; i < word.length; i++) {
            const ch = word[i];
            const chNeeded = currentLine.items.length > 0 ? letterSpacing + ch.width : ch.width;
            if (currentLine.lineWidth + chNeeded <= maxUnscaledWidth || currentLine.items.length === 0) {
              if (currentLine.items.length > 0) {
                currentLine.lineWidth += letterSpacing;
              }
              currentLine.items.push({
                char: ch.resolvedChar || " ",
                glyph: ch.glyph,
                isSpace: ch.isSpace,
                width: ch.width,
              });
              currentLine.lineWidth += ch.width;
            } else {
              allLines.push(currentLine);
              currentLine = {
                items: [
                  {
                    char: ch.resolvedChar || " ",
                    glyph: ch.glyph,
                    isSpace: ch.isSpace,
                    width: ch.width,
                  },
                ],
                lineWidth: ch.width,
              };
            }
          }
        }
      }
    }

    if (currentLine.items.length > 0) {
      allLines.push(currentLine);
    }
  }

  return {
    lines: allLines.filter((l) => l.items.length > 0),
    warnings: Array.from(new Set(warnings)),
    convertedChars: Array.from(convertedSet),
    missingChars: Array.from(missingSet),
  };
}

/**
 * Rotates a 44x44 grid. 90, 180, 270 use exact discrete coordinate swaps.
 */
export function rotateGrid(grid: number[][], rotationDeg: number): number[][] {
  const norm = ((rotationDeg % 360) + 360) % 360;
  if (norm === 0) return grid;

  const N = COC_GRID_SIZE;
  const out = Array.from({ length: N }, () => new Array(N).fill(0));

  if (norm === 90) {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (grid[r][c]) out[c][N - 1 - r] = 1;
      }
    }
    return out;
  }
  if (norm === 180) {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (grid[r][c]) out[N - 1 - r][N - 1 - c] = 1;
      }
    }
    return out;
  }
  if (norm === 270) {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (grid[r][c]) out[N - 1 - c][r] = 1;
      }
    }
    return out;
  }

  // General angle (e.g. 45°): inverse nearest-neighbor rotation around grid center (21.5, 21.5)
  const rad = (-norm * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = (N - 1) / 2;
  const cy = (N - 1) / 2;

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const srcX = Math.round(cos * (c - cx) - sin * (r - cy) + cx);
      const srcY = Math.round(sin * (c - cx) + cos * (r - cy) + cy);
      if (srcX >= 0 && srcX < N && srcY >= 0 && srcY < N) {
        if (grid[srcY][srcX] === 1) {
          out[r][c] = 1;
        }
      }
    }
  }

  return out;
}

/**
 * Builds the 44x44 grid from laid out lines at given scale and letterSpacing.
 */
export function renderLinesToGrid(
  lines: LaidOutLine[],
  font: BitmapFont,
  scale: number,
  letterSpacing: number
): { grid: number[][]; verticalOverflow: boolean } {
  const N = COC_GRID_SIZE;
  const grid = Array.from({ length: N }, () => new Array(N).fill(0));

  if (lines.length === 0) {
    return { grid, verticalOverflow: false };
  }

  const lineScaledHeight = font.height * scale;
  const lineGap = Math.max(1, Math.round(scale * 1));
  const totalHeight = lines.length * lineScaledHeight + (lines.length - 1) * lineGap;
  const verticalOverflow = totalHeight > N;

  const startRow = Math.max(0, Math.floor((N - totalHeight) / 2));

  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const line = lines[lIdx];
    const lineRow = startRow + lIdx * (lineScaledHeight + lineGap);
    const lineScaledWidth = line.lineWidth * scale;
    const startCol = Math.max(0, Math.floor((N - lineScaledWidth) / 2));

    let curCol = startCol;

    for (let i = 0; i < line.items.length; i++) {
      const item = line.items[i];
      if (i > 0) {
        curCol += letterSpacing * scale;
      }

      if (item.glyph) {
        const g = item.glyph;
        for (let r = 0; r < g.length; r++) {
          for (let c = 0; c < g[r].length; c++) {
            if (g[r][c] === 1) {
              for (let dr = 0; dr < scale; dr++) {
                for (let dc = 0; dc < scale; dc++) {
                  const targetR = lineRow + r * scale + dr;
                  const targetC = curCol + c * scale + dc;
                  if (targetR >= 0 && targetR < N && targetC >= 0 && targetC < N) {
                    grid[targetR][targetC] = 1;
                  }
                }
              }
            }
          }
        }
        curCol += item.width * scale;
      } else if (item.isSpace) {
        curCol += item.width * scale;
      }
    }
  }

  return { grid, verticalOverflow };
}

/**
 * Generates row-by-row build guide with contiguous wall segments.
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
            fromCol: segStart + 1,
            toCol: c,
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
        row: r + 1,
        wallCount: rowWalls,
        segments: rowSegments,
      });
    }
  }

  return guide;
}

/**
 * Analyzes wall count and bounding box.
 */
export function analyzeGrid(grid: number[][]): {
  count: number;
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
} {
  let count = 0;
  let minR = COC_GRID_SIZE;
  let maxR = -1;
  let minC = COC_GRID_SIZE;
  let maxC = -1;

  for (let r = 0; r < COC_GRID_SIZE; r++) {
    for (let c = 0; c < COC_GRID_SIZE; c++) {
      if (grid[r][c] === 1) {
        count++;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }

  return { count, minR, maxR, minC, maxC };
}

/**
 * Computes wall count for prefixes of the string to find max fitting chars.
 */
export function computeMaxFittingChars(
  text: string,
  font: BitmapFont,
  scale: number,
  letterSpacing: number,
  convertTurkishToAscii: boolean,
  rotationDeg: number,
  maxWalls: number
): number {
  if (!text || text.length === 0) return 0;

  let left = 1;
  let right = text.length;
  let best = 0;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const sub = text.slice(0, mid);
    const { lines } = layoutLines(sub, font, scale, letterSpacing, convertTurkishToAscii);
    const { grid } = renderLinesToGrid(lines, font, scale, letterSpacing);
    const rotated = rotateGrid(grid, rotationDeg);
    const { count } = analyzeGrid(rotated);

    if (count <= maxWalls) {
      best = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return best;
}

/**
 * Primary computation function for Wall Art.
 */
export function computeWallArt(
  text: string,
  font: BitmapFont,
  scale: number = 1,
  rotationDeg: number = 0,
  maxWalls: number = DEFAULT_MAX_WALLS,
  letterSpacing: number = 1,
  convertTurkishToAscii: boolean = false,
  autoFit: boolean = true
): WallArtResult {
  const cleanScale = Math.max(1, Math.min(MAX_BITMAP_SCALE, Math.round(scale)));
  let currentScale = cleanScale;
  let wasScaledDown = false;

  let layoutRes = layoutLines(text, font, currentScale, letterSpacing, convertTurkishToAscii);
  let renderRes = renderLinesToGrid(layoutRes.lines, font, currentScale, letterSpacing);
  let rotatedGrid = rotateGrid(renderRes.grid, rotationDeg);
  let analysis = analyzeGrid(rotatedGrid);

  // If over budget or vertical overflow, and autoFit is enabled, try decreasing scale
  if (autoFit && (analysis.count > maxWalls || renderRes.verticalOverflow) && currentScale > 1) {
    while (currentScale > 1) {
      currentScale--;
      const nextLayout = layoutLines(text, font, currentScale, letterSpacing, convertTurkishToAscii);
      const nextRender = renderLinesToGrid(nextLayout.lines, font, currentScale, letterSpacing);
      const nextRotated = rotateGrid(nextRender.grid, rotationDeg);
      const nextAnalysis = analyzeGrid(nextRotated);

      if (nextAnalysis.count <= maxWalls && !nextRender.verticalOverflow) {
        layoutRes = nextLayout;
        renderRes = nextRender;
        rotatedGrid = nextRotated;
        analysis = nextAnalysis;
        wasScaledDown = true;
        break;
      }
    }
  }

  const allWarnings = [...layoutRes.warnings];

  if (renderRes.verticalOverflow) {
    allWarnings.push("Metin ızgaraya sığmıyor (dikey taşma). Ölçeği küçültün veya metni kısaltın.");
  }

  const normRot = ((rotationDeg % 360) + 360) % 360;
  if (normRot !== 0 && normRot !== 90 && normRot !== 180 && normRot !== 270) {
    allWarnings.push("Döndürme (90° katları dışı) piksel harflerini bozabilir.");
  }

  const isOverBudget = analysis.count > maxWalls;
  let maxFittingChars = text.length;

  if (isOverBudget) {
    maxFittingChars = computeMaxFittingChars(
      text,
      font,
      currentScale,
      letterSpacing,
      convertTurkishToAscii,
      rotationDeg,
      maxWalls
    );
    allWarnings.push(
      `Duvar bütçesi (${maxWalls}) aşıldı! En fazla ${maxFittingChars} harf sığıyor. Ölçeği düşürün veya metni kısaltın.`
    );
  }

  const lineCount = layoutRes.lines.length;
  const linesInfo = lineCount > 1 ? `${lineCount} satıra bölündü` : "Tek satır";

  return {
    grid: rotatedGrid,
    wallCount: analysis.count,
    maxWalls,
    isOverBudget,
    maxFittingChars,
    effectiveScale: currentScale,
    originalScale: cleanScale,
    wasScaledDown,
    lineCount,
    linesInfo,
    warnings: Array.from(new Set(allWarnings)),
    convertedChars: layoutRes.convertedChars,
    missingChars: layoutRes.missingChars,
    buildGuide: generateBuildGuide(rotatedGrid),
    minRow: analysis.minR,
    maxRow: analysis.maxR,
    minCol: analysis.minC,
    maxCol: analysis.maxC,
  };
}

/**
 * Generates high-resolution PNG blueprint image for download.
 */
export function exportPlanPng(
  grid: number[][],
  meta: {
    text: string;
    fontName: string;
    wallCount: number;
    maxWalls: number;
    scale: number;
    rotation: number;
  }
): string {
  if (typeof document === "undefined") return "";

  const canvas = document.createElement("canvas");
  const cellSize = 24;
  const marginX = 80;
  const marginY = 160;
  const paddingBottom = 60;
  const paddingRight = 60;

  canvas.width = marginX + COC_GRID_SIZE * cellSize + paddingRight;
  canvas.height = marginY + COC_GRID_SIZE * cellSize + paddingBottom;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. Dark Blueprint Background
  ctx.fillStyle = "#0B111E";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Header
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 26px -apple-system, sans-serif";
  ctx.fillText("CoC Analitik • Duvar Yazısı İnşa Planı", marginX, 50);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "bold 14px -apple-system, sans-serif";
  ctx.fillText(
    `Metin: "${meta.text}"   •   Font: ${meta.fontName}   •   Duvar: ${meta.wallCount} / ${meta.maxWalls}   •   Izgara: 44x44`,
    marginX,
    80
  );
  ctx.fillText(
    `Ölçek: ${meta.scale}x   •   Açı: ${meta.rotation}°   •   Her kare = 1x1 Duvar Segmenti`,
    marginX,
    105
  );

  // 3. Coordinate Labels
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "#64748B";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let c = 0; c < COC_GRID_SIZE; c++) {
    const x = marginX + c * cellSize + cellSize / 2;
    const isMajor = (c + 1) % 5 === 0 || c === 0 || c === COC_GRID_SIZE - 1;
    ctx.fillStyle = isMajor ? "#38BDF8" : "#475569";
    ctx.fillText(`${c + 1}`, x, marginY - 14);
  }

  ctx.textAlign = "right";
  for (let r = 0; r < COC_GRID_SIZE; r++) {
    const y = marginY + r * cellSize + cellSize / 2;
    const isMajor = (r + 1) % 5 === 0 || r === 0 || r === COC_GRID_SIZE - 1;
    ctx.fillStyle = isMajor ? "#38BDF8" : "#475569";
    ctx.fillText(`${r + 1}`, marginX - 12, y);
  }

  // 4. Draw Grid Board & Wall Cells
  for (let r = 0; r < COC_GRID_SIZE; r++) {
    for (let c = 0; c < COC_GRID_SIZE; c++) {
      const x = marginX + c * cellSize;
      const y = marginY + r * cellSize;
      const isWall = grid[r][c] === 1;

      ctx.fillStyle = isWall ? "#F59E0B" : "#151E30";
      ctx.fillRect(x, y, cellSize, cellSize);

      ctx.strokeStyle = isWall ? "#FDE68A" : "#1E293B";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);

      if (isWall) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillRect(x + 2, y + 2, cellSize - 4, 3);
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fillRect(x + 2, y + cellSize - 5, cellSize - 4, 3);
      }
    }
  }

  // 5. Village Center Guide Lines
  const midX = marginX + 22 * cellSize;
  const midY = marginY + 22 * cellSize;
  ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.moveTo(midX, marginY);
  ctx.lineTo(midX, marginY + COC_GRID_SIZE * cellSize);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(marginX, midY);
  ctx.lineTo(marginX + COC_GRID_SIZE * cellSize, midY);
  ctx.stroke();

  ctx.setLineDash([]);

  // 6. Footer Note
  ctx.fillStyle = "#64748B";
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    "Supercell Hayran İçeriği Politikası • Bu görsel ticari değildir. CoC Analitik",
    marginX,
    canvas.height - 24
  );

  return canvas.toDataURL("image/png");
}
