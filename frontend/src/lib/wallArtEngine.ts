import type { BitmapFont } from "./bitmapFonts";
import { getBitmapFont } from "./bitmapFonts";

export const COC_GRID_SIZE = 44;
export const DEFAULT_MAX_WALLS = 325; // TH17 / TH18 Wall limit

export const MIN_BITMAP_SCALE = 0.5;
export const MAX_BITMAP_SCALE = 4.0;
export const SCALE_STEP = 0.25;
export const READABILITY_MIN_HEIGHT = 7;
export const CLEAN_SCALES: readonly number[] = [0.5, 1.0, 2.0, 3.0, 4.0];

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
  capHeight: number;
  isCleanScale: boolean;
  isReadabilityLow: boolean;
  preserveThinLines: boolean;
  spanReq: number;
  fitsInGrid: boolean;
  isLattice45: boolean;
  isHorizontalOnScreen: boolean;
  thickenedChars: string[];
  autoFit: boolean;
  offsetX: number;
  offsetY: number;
}

export interface CharResolveResult {
  glyph: number[][] | null;
  isSpace: boolean;
  resolvedChar: string | null;
  warning?: string;
  converted?: string;
  rawWidth: number;
  width: number;
}

/**
 * Checks if an angle is an odd multiple of 45° (i.e. ±45°, ±135°),
 * which aligns diagonally on the village grid.
 */
export function is45DegreeAngle(rotationDeg: number): boolean {
  const norm = ((rotationDeg % 360) + 360) % 360;
  return norm === 45 || norm === 135 || norm === 225 || norm === 315;
}
export const is45DegreeLatticeAngle = is45DegreeAngle;

/**
 * Checks if the rotation produces text that appears horizontal on screen in isometric view.
 * At -45° (or 315°), grid diagonals r + c = const align with isometric horizontal screen lines.
 */
export function isHorizontalOnScreen(rotationDeg: number): boolean {
  const norm = ((rotationDeg % 360) + 360) % 360;
  return norm === 315;
}

/**
 * Snaps angle to nearest 45° multiple when within threshold (default 7°).
 */
export function snapAngleTo45(angleDeg: number, thresholdDeg: number = 7): number {
  const nearest = Math.round(angleDeg / 45) * 45;
  if (Math.abs(angleDeg - nearest) <= thresholdDeg) {
    return nearest;
  }
  return angleDeg;
}

/**
 * Counts 8-connected components in a binary matrix.
 */
export function countComponents8(matrix: number[][]): number {
  const H = matrix.length;
  const W = H > 0 ? matrix[0].length : 0;
  if (H === 0 || W === 0) return 0;

  const visited: boolean[] = new Array(H * W).fill(false);
  let count = 0;

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (matrix[r][c] === 1 && !visited[r * W + c]) {
        count++;
        const queue = [r * W + c];
        visited[r * W + c] = true;
        let head = 0;
        while (head < queue.length) {
          const idx = queue[head++];
          const cr = Math.floor(idx / W);
          const cc = idx % W;

          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = cr + dr;
              const nc = cc + dc;
              if (nr >= 0 && nr < H && nc >= 0 && nc < W) {
                const nIdx = nr * W + nc;
                if (matrix[nr][nc] === 1 && !visited[nIdx]) {
                  visited[nIdx] = true;
                  queue.push(nIdx);
                }
              }
            }
          }
        }
      }
    }
  }
  return count;
}

/**
 * Counts 4-connected components in a binary matrix.
 * Clash of Clans walls require orthogonal 4-connectivity (edge-to-edge contact).
 */
export function countComponents4(matrix: number[][]): number {
  const H = matrix.length;
  const W = H > 0 ? matrix[0].length : 0;
  if (H === 0 || W === 0) return 0;

  const visited: boolean[] = new Array(H * W).fill(false);
  let count = 0;
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (matrix[r][c] === 1 && !visited[r * W + c]) {
        count++;
        const queue = [r * W + c];
        visited[r * W + c] = true;
        let head = 0;
        while (head < queue.length) {
          const idx = queue[head++];
          const cr = Math.floor(idx / W);
          const cc = idx % W;

          for (const [dr, dc] of dirs) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (nr >= 0 && nr < H && nc >= 0 && nc < W) {
              const nIdx = nr * W + nc;
              if (matrix[nr][nc] === 1 && !visited[nIdx]) {
                visited[nIdx] = true;
                queue.push(nIdx);
              }
            }
          }
        }
      }
    }
  }
  return count;
}

/**
 * Dilates a binary bitmap matrix by 1 cell using Chebyshev distance (8-neighborhood expansion).
 * Expands dimensions by 2 (1 pad on each side) to prevent clipping strokes.
 */
export function chebyshevDilate(matrix: number[][]): number[][] {
  const H = matrix.length;
  const W = H > 0 ? matrix[0].length : 0;
  if (H === 0 || W === 0) return [];

  const outH = H + 2;
  const outW = W + 2;
  const out: number[][] = Array.from({ length: outH }, () => new Array(outW).fill(0));

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (matrix[r][c] === 1) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            out[r + 1 + dr][c + 1 + dc] = 1;
          }
        }
      }
    }
  }
  return out;
}

/**
 * Rotates a binary bitmap matrix using S x S super-sampling around its center.
 * Maps sub-samples inversely with continuous rotation.
 * Supports optional offsetX and offsetY to translate text on the grid.
 */
export function superSampleRotateMatrix(
  matrix: number[][],
  angleDeg: number,
  threshold: number = 0.4,
  S: number = 4,
  outRows: number = COC_GRID_SIZE,
  outCols: number = COC_GRID_SIZE,
  offsetX: number = 0,
  offsetY: number = 0
): number[][] {
  const H = matrix.length;
  const W = H > 0 ? matrix[0].length : 0;
  const out: number[][] = Array.from({ length: outRows }, () => new Array(outCols).fill(0));
  if (H === 0 || W === 0) return out;

  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const uc = H / 2.0;
  const vc = W / 2.0;
  const Rc = outRows / 2.0 + offsetY;
  const Cc = outCols / 2.0 + offsetX;

  const totalSamples = S * S;

  for (let R = 0; R < outRows; R++) {
    for (let C = 0; C < outCols; C++) {
      let filledHits = 0;
      for (let si = 0; si < S; si++) {
        const rSample = R + (si + 0.5) / S;
        const deltaR = rSample - Rc;
        for (let sj = 0; sj < S; sj++) {
          const cSample = C + (sj + 0.5) / S;
          const deltaC = cSample - Cc;

          // Inverse rotation
          const deltaCSrc = deltaC * cos + deltaR * sin;
          const deltaRSrc = -deltaC * sin + deltaR * cos;

          const u = Math.floor(uc + deltaRSrc);
          const v = Math.floor(vc + deltaCSrc);

          if (u >= 0 && u < H && v >= 0 && v < W) {
            if (matrix[u][v] === 1) {
              filledHits++;
            }
          }
        }
      }

      if (filledHits / totalSamples >= threshold - 1e-9) {
        out[R][C] = 1;
      }
    }
  }

  return out;
}

/**
 * Tests a single glyph's connectivity when rotated by angleDeg.
 * Compares post-rotation 4-connected components against source 8-connected components.
 * Retries with T down to 0.30; if still broken, marks for Chebyshev dilation.
 */
export function testGlyphConnectivity(
  glyph: number[][],
  angleDeg: number,
  defaultT: number = 0.4
): {
  srcComp8: number;
  rotComp4: number;
  effectiveT: number;
  needsDilation: boolean;
} {
  const srcComp8 = countComponents8(glyph);
  if (srcComp8 === 0) {
    return { srcComp8: 0, rotComp4: 0, effectiveT: defaultT, needsDilation: false };
  }

  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const H = glyph.length;
  const W = glyph[0]?.length || 0;
  const rotW = Math.ceil(Math.abs(W * cos) + Math.abs(H * sin)) + 6;
  const rotH = Math.ceil(Math.abs(W * sin) + Math.abs(H * cos)) + 6;

  // 1. Try default T = 0.4
  const rot04 = superSampleRotateMatrix(glyph, angleDeg, defaultT, 4, rotH, rotW);
  const comp04 = countComponents4(rot04);
  if (comp04 <= srcComp8) {
    return { srcComp8, rotComp4: comp04, effectiveT: defaultT, needsDilation: false };
  }

  // 2. Try T = 0.35
  const rot35 = superSampleRotateMatrix(glyph, angleDeg, 0.35, 4, rotH, rotW);
  const comp35 = countComponents4(rot35);
  if (comp35 <= srcComp8) {
    return { srcComp8, rotComp4: comp35, effectiveT: 0.35, needsDilation: false };
  }

  // 3. Try T = 0.30
  const rot30 = superSampleRotateMatrix(glyph, angleDeg, 0.30, 4, rotH, rotW);
  const comp30 = countComponents4(rot30);
  if (comp30 <= srcComp8) {
    return { srcComp8, rotComp4: comp30, effectiveT: 0.30, needsDilation: false };
  }

  // 4. Still broken: mark for 1-cell Chebyshev dilation
  const dilated = chebyshevDilate(glyph);
  const rotDil = superSampleRotateMatrix(dilated, angleDeg, defaultT, 4, rotH + 4, rotW + 4);
  const compDil = countComponents4(rotDil);

  return { srcComp8, rotComp4: compDil, effectiveT: defaultT, needsDilation: true };
}

/**
 * Area-coverage box resampling for binary bitmap matrices.
 * - scale >= 1: default threshold 0.5 (integer scales 2x, 3x, 4x are strictly identical to n x n block expansion).
 * - scale < 1: threshold is 0.5 (or 0.25 when preserveThinLines is true).
 */
export function boxResample(
  matrix: number[][],
  scale: number,
  threshold: number = 0.5
): number[][] {
  const H_in = matrix.length;
  const W_in = H_in > 0 ? matrix[0].length : 0;
  if (H_in === 0 || W_in === 0) return [];

  if (Math.abs(scale - 1.0) < 1e-6) {
    return matrix.map((row) => [...row]);
  }

  const H_out = Math.max(1, Math.round(H_in * scale));
  const W_out = Math.max(1, Math.round(W_in * scale));

  const out: number[][] = Array.from({ length: H_out }, () => new Array(W_out).fill(0));
  const boxArea = 1.0 / (scale * scale);

  for (let R = 0; R < H_out; R++) {
    const r0 = R / scale;
    const r1 = (R + 1) / scale;
    const minR = Math.max(0, Math.floor(r0));
    const maxR = Math.min(H_in - 1, Math.floor(r1));

    for (let C = 0; C < W_out; C++) {
      const c0 = C / scale;
      const c1 = (C + 1) / scale;
      const minC = Math.max(0, Math.floor(c0));
      const maxC = Math.min(W_in - 1, Math.floor(c1));

      let coveredArea = 0.0;
      for (let r = minR; r <= maxR; r++) {
        const overlapR = Math.max(0.0, Math.min(r1, r + 1.0) - Math.max(r0, r));
        if (overlapR <= 0.0) continue;

        for (let c = minC; c <= maxC; c++) {
          if (matrix[r][c] === 1) {
            const overlapC = Math.max(0.0, Math.min(c1, c + 1.0) - Math.max(c0, c));
            coveredArea += overlapR * overlapC;
          }
        }
      }

      const coverage = coveredArea / boxArea;
      if (coverage >= threshold - 1e-9) {
        out[R][C] = 1;
      }
    }
  }

  return out;
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
    const spaceWidth = Math.max(3, Math.round(font.height * 0.3));
    return {
      glyph: null,
      isSpace: true,
      resolvedChar: " ",
      converted,
      rawWidth: spaceWidth,
      width: spaceWidth,
    };
  }

  // Exact match in glyphs
  if (font.glyphs[charToUse]) {
    const g = font.glyphs[charToUse];
    const w = g[0]?.length || 0;
    return {
      glyph: g,
      isSpace: false,
      resolvedChar: charToUse,
      converted,
      rawWidth: w,
      width: w,
    };
  }

  // Case fallback (e.g. font only has uppercase A-Z and user entered lowercase a-z)
  const upper = charToUse.toUpperCase();
  if (font.glyphs[upper]) {
    const g = font.glyphs[upper];
    const w = g[0]?.length || 0;
    return {
      glyph: g,
      isSpace: false,
      resolvedChar: upper,
      converted,
      rawWidth: w,
      width: w,
    };
  }

  // Character is missing in font
  return {
    glyph: null,
    isSpace: false,
    resolvedChar: null,
    converted,
    warning: `"${rawChar}" karakteri bu fontta yok`,
    rawWidth: 0,
    width: 0,
  };
}

export interface LaidOutLineItem {
  char: string;
  glyph: number[][] | null;
  isSpace: boolean;
  rawWidth: number;
  scaledWidth: number;
}

export interface LaidOutLine {
  items: LaidOutLineItem[];
  lineWidth: number; // In final grid cells
}

/**
 * Computes the width of an item sequence in final grid cells.
 */
export function computeItemsWidth(
  items: LaidOutLineItem[],
  letterSpacing: number
): number {
  if (items.length === 0) return 0;
  let w = 0;
  for (let i = 0; i < items.length; i++) {
    if (i > 0 && !items[i].isSpace && !items[i - 1].isSpace) {
      w += letterSpacing;
    }
    w += items[i].scaledWidth;
  }
  return w;
}

/**
 * Splits a single oversized word into balanced character-level chunks.
 * Avoids 1-character widows (e.g. "HAR/UN" instead of "HARU/N").
 */
function splitWordBalanced(
  word: LaidOutLineItem[],
  letterSpacing: number,
  maxCells: number
): LaidOutLineItem[][] {
  const N = word.length;
  if (N <= 1) return [word];

  const lineW = (i: number, j: number): number => {
    return computeItemsWidth(word.slice(i, j), letterSpacing);
  };

  // If already fits
  if (lineW(0, N) <= maxCells) return [word];

  let bestSplit: LaidOutLineItem[][] | null = null;
  let bestCost = Infinity;

  for (let L = 2; L <= N; L++) {
    const solve = (
      startIdx: number,
      linesLeft: number
    ): [number, LaidOutLineItem[][] | null, number[] | null] => {
      if (linesLeft === 1) {
        const w = lineW(startIdx, N);
        if (w <= maxCells) {
          const count = N - startIdx;
          const widowCost = count === 1 && N > 1 ? 10000 : 0;
          return [widowCost, [word.slice(startIdx, N)], [w]];
        }
        return [Infinity, null, null];
      }

      let bestLocalCost = Infinity;
      let bestLocalLines: LaidOutLineItem[][] | null = null;
      let bestLocalWidths: number[] | null = null;

      for (let endIdx = startIdx + 1; endIdx <= N - linesLeft + 1; endIdx++) {
        const w = lineW(startIdx, endIdx);
        if (w > maxCells) break;

        const count = endIdx - startIdx;
        const widowPenalty = count === 1 && N > 1 ? 10000 : 0;
        const targetChars = Math.ceil(N / linesLeft);
        const charDev = Math.abs(count - targetChars);

        const [subCost, subLines, subWidths] = solve(endIdx, linesLeft - 1);
        if (subLines !== null && subWidths !== null) {
          const widths = [w, ...subWidths];
          const avgW = widths.reduce((a, b) => a + b, 0) / widths.length;
          const variance = widths.reduce((acc, x) => acc + (x - avgW) ** 2, 0);
          // Balance pixel variance and character distribution, penalizing widows heavily
          const totalC = variance + charDev * 25 + widowPenalty + subCost - (endIdx - startIdx) * 0.01;

          if (totalC < bestLocalCost) {
            bestLocalCost = totalC;
            bestLocalLines = [word.slice(startIdx, endIdx), ...subLines];
            bestLocalWidths = widths;
          }
        }
      }

      return [bestLocalCost, bestLocalLines, bestLocalWidths];
    };

    const [cost, lines] = solve(0, L);
    if (lines !== null && cost < bestCost) {
      bestCost = cost;
      bestSplit = lines;
      if (cost < 5000) break; // Found clean split without widows
    }
  }

  return bestSplit || [word];
}

/**
 * Performs balanced word wrapping and line breaking to fit grid constraints.
 * If is45Mode is enabled, maxLineCells is constrained to ensure (W + H <= 45).
 */
export function layoutLines(
  text: string,
  font: BitmapFont,
  scale: number,
  letterSpacing: number,
  convertTurkishToAscii: boolean,
  is45Mode: boolean = false
): {
  lines: LaidOutLine[];
  warnings: string[];
  convertedChars: string[];
  missingChars: string[];
} {
  const warnings: string[] = [];
  const convertedSet = new Set<string>();
  const missingSet = new Set<string>();

  const scaledSpaceWidth = Math.max(2, Math.round(font.height * 0.3 * scale));
  const lineScaledHeight = Math.max(1, Math.round(font.height * scale));

  // In 45-degree mode, line width limit ensures transformed bounding box fits in 44
  const maxLineCells = is45Mode
    ? Math.max(1, Math.floor(COC_GRID_SIZE * Math.SQRT2 - lineScaledHeight))
    : COC_GRID_SIZE;

  const paragraphs = text.split(/\r?\n/);
  const allLines: LaidOutLine[] = [];

  for (const para of paragraphs) {
    if (para.length === 0) {
      allLines.push({ items: [], lineWidth: 0 });
      continue;
    }

    // Tokenize paragraph
    const tokens: LaidOutLineItem[] = [];
    for (const ch of para) {
      const res = resolveChar(ch, font, convertTurkishToAscii);
      if (res.converted) convertedSet.add(res.converted);
      if (res.warning) {
        warnings.push(res.warning);
        missingSet.add(ch);
      }
      if (res.isSpace) {
        tokens.push({
          char: " ",
          glyph: null,
          isSpace: true,
          rawWidth: res.rawWidth,
          scaledWidth: scaledSpaceWidth,
        });
      } else if (res.glyph) {
        const scaledW = Math.max(1, Math.round(res.rawWidth * scale));
        tokens.push({
          char: res.resolvedChar || ch,
          glyph: res.glyph,
          isSpace: false,
          rawWidth: res.rawWidth,
          scaledWidth: scaledW,
        });
      }
    }

    if (tokens.length === 0) continue;

    // Group into words
    const words: LaidOutLineItem[][] = [];
    let curWord: LaidOutLineItem[] = [];

    for (const t of tokens) {
      if (t.isSpace) {
        if (curWord.length > 0) {
          words.push(curWord);
          curWord = [];
        }
      } else {
        curWord.push(t);
      }
    }
    if (curWord.length > 0) {
      words.push(curWord);
    }

    if (words.length === 0) continue;

    // Check if any individual word exceeds maxLineCells; if so, split it balanced
    const normalizedWords: LaidOutLineItem[][] = [];
    for (const w of words) {
      const wWidth = computeItemsWidth(w, letterSpacing);
      if (wWidth > maxLineCells) {
        const splitChunks = splitWordBalanced(w, letterSpacing, maxLineCells);
        for (const chunk of splitChunks) {
          normalizedWords.push(chunk);
        }
      } else {
        normalizedWords.push(w);
      }
    }

    // Now partition normalizedWords into balanced lines
    const M = normalizedWords.length;
    const spaceItem: LaidOutLineItem = {
      char: " ",
      glyph: null,
      isSpace: true,
      rawWidth: Math.round(font.height * 0.3),
      scaledWidth: scaledSpaceWidth,
    };

    const makeLineFromWordSlice = (i: number, j: number): LaidOutLine => {
      const items: LaidOutLineItem[] = [];
      for (let k = i; k < j; k++) {
        if (k > i) items.push(spaceItem);
        items.push(...normalizedWords[k]);
      }
      return {
        items,
        lineWidth: computeItemsWidth(items, letterSpacing),
      };
    };

    // Check single line fit
    const singleLineCandidate = makeLineFromWordSlice(0, M);
    if (singleLineCandidate.lineWidth <= maxLineCells) {
      allLines.push(singleLineCandidate);
      continue;
    }

    // Multi-line balanced partition
    let bestPartition: LaidOutLine[] | null = null;
    let bestPartitionCost = Infinity;

    for (let L = 2; L <= M; L++) {
      const solveWords = (
        startIdx: number,
        linesLeft: number
      ): [number, LaidOutLine[] | null, number[] | null] => {
        if (linesLeft === 1) {
          const line = makeLineFromWordSlice(startIdx, M);
          if (line.lineWidth <= maxLineCells) {
            const wordCount = M - startIdx;
            // Penalize single short word orphan on last line
            let widowCost = 0;
            if (wordCount === 1 && normalizedWords[startIdx].length <= 2 && M > 2) {
              widowCost = 2000;
            }
            return [widowCost, [line], [line.lineWidth]];
          }
          return [Infinity, null, null];
        }

        let bestLocalC = Infinity;
        let bestLocalLines: LaidOutLine[] | null = null;
        let bestLocalWidths: number[] | null = null;

        for (let endIdx = startIdx + 1; endIdx <= M - linesLeft + 1; endIdx++) {
          const line = makeLineFromWordSlice(startIdx, endIdx);
          if (line.lineWidth > maxLineCells) break;

          const [subC, subLines, subWidths] = solveWords(endIdx, linesLeft - 1);
          if (subLines !== null && subWidths !== null) {
            const widths = [line.lineWidth, ...subWidths];
            const avgW = widths.reduce((a, b) => a + b, 0) / widths.length;
            const variance = widths.reduce((acc, x) => acc + (x - avgW) ** 2, 0);
            const totalC = variance + subC - (endIdx - startIdx) * 0.1;

            if (totalC < bestLocalC) {
              bestLocalC = totalC;
              bestLocalLines = [line, ...subLines];
              bestLocalWidths = widths;
            }
          }
        }

        return [bestLocalC, bestLocalLines, bestLocalWidths];
      };

      const [c, partLines] = solveWords(0, L);
      if (partLines !== null && c < bestPartitionCost) {
        bestPartitionCost = c;
        bestPartition = partLines;
        if (c < 1000) break;
      }
    }

    if (bestPartition) {
      allLines.push(...bestPartition);
    } else {
      // Fallback greedy
      let currentLine: LaidOutLineItem[] = [];
      for (const w of normalizedWords) {
        const candidate = currentLine.length > 0 ? [...currentLine, spaceItem, ...w] : [...w];
        if (computeItemsWidth(candidate, letterSpacing) <= maxLineCells) {
          currentLine = candidate;
        } else {
          if (currentLine.length > 0) {
            allLines.push({
              items: currentLine,
              lineWidth: computeItemsWidth(currentLine, letterSpacing),
            });
          }
          currentLine = [...w];
        }
      }
      if (currentLine.length > 0) {
        allLines.push({
          items: currentLine,
          lineWidth: computeItemsWidth(currentLine, letterSpacing),
        });
      }
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
 * Renders laid-out lines into a tightly bounded unrotated local binary matrix.
 */
export function renderLinesToLocalMatrix(
  lines: LaidOutLine[],
  font: BitmapFont,
  scale: number,
  letterSpacing: number,
  preserveThinLines: boolean = false,
  thickenedCharsSet: Set<string> = new Set()
): { localMat: number[][]; totalHeight: number; maxWidth: number } {
  if (lines.length === 0) {
    return { localMat: [], totalHeight: 0, maxWidth: 0 };
  }

  const threshold = scale < 1 && preserveThinLines ? 0.25 : 0.5;
  const lineScaledHeight = Math.max(1, Math.round(font.height * scale));
  const lineGap = Math.max(1, Math.round(1 * scale));
  const totalHeight = lines.length * lineScaledHeight + (lines.length - 1) * lineGap;
  const maxWidth = Math.max(1, ...lines.map((l) => l.lineWidth));

  const localMat: number[][] = Array.from({ length: totalHeight }, () =>
    new Array(maxWidth).fill(0)
  );

  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const line = lines[lIdx];
    const lineRow = lIdx * (lineScaledHeight + lineGap);
    const startCol = Math.max(0, Math.floor((maxWidth - line.lineWidth) / 2));
    let curCol = startCol;

    for (let i = 0; i < line.items.length; i++) {
      const item = line.items[i];
      if (item.glyph) {
        let resampled = boxResample(item.glyph, scale, threshold);
        if (thickenedCharsSet.has(item.char)) {
          resampled = chebyshevDilate(resampled);
        }
        const rH = resampled.length;
        const rW = resampled[0]?.length || 0;

        for (let r = 0; r < rH; r++) {
          for (let c = 0; c < rW; c++) {
            if (resampled[r][c] === 1) {
              const tr = lineRow + r;
              const tc = curCol + c;
              if (tr >= 0 && tr < totalHeight && tc >= 0 && tc < maxWidth) {
                localMat[tr][tc] = 1;
              }
            }
          }
        }
        curCol += rW;
      } else if (item.isSpace) {
        curCol += item.scaledWidth;
      }

      const nextItem = line.items[i + 1];
      if (nextItem && !item.isSpace && !nextItem.isSpace) {
        curCol += letterSpacing;
      }
    }
  }

  return { localMat, totalHeight, maxWidth };
}

export interface PlacedGridResult {
  grid: number[][];
  spanReq: number;
  fitsInGrid: boolean;
  sourceWalls: number;
  placedWalls: number;
  isLattice45: boolean;
}

/**
 * Places a local binary bitmap matrix into the 44x44 Clash of Clans village grid.
 * - For 0°, 90°, 180°, 270°: Exact discrete rotation, centered (with optional offsetX/offsetY).
 * - For other angles (including 45°, 135°, 225°, 315°): Super-sampled continuous rotation (S=4, default T=0.4), centered (with optional offsetX/offsetY).
 */
export function placeBitmapInGrid(
  localMat: number[][],
  rotationDeg: number,
  threshold: number = 0.4,
  offsetX: number = 0,
  offsetY: number = 0
): PlacedGridResult {
  const H = localMat.length;
  const W = H > 0 ? localMat[0].length : 0;
  const N = COC_GRID_SIZE;
  const grid: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));

  if (H === 0 || W === 0) {
    return { grid, spanReq: 0, fitsInGrid: true, sourceWalls: 0, placedWalls: 0, isLattice45: false };
  }

  // Count source filled walls
  let sourceWalls = 0;
  for (let u = 0; u < H; u++) {
    for (let v = 0; v < W; v++) {
      if (localMat[u][v] === 1) sourceWalls++;
    }
  }
  if (sourceWalls === 0) {
    return { grid, spanReq: 0, fitsInGrid: true, sourceWalls: 0, placedWalls: 0, isLattice45: false };
  }

  const norm = ((rotationDeg % 360) + 360) % 360;
  const is45 = is45DegreeAngle(norm);

  // 1. Exact Discrete 90° Rotations (0, 90, 180, 270)
  if (norm === 0 || norm === 90 || norm === 180 || norm === 270) {
    const spanR = norm === 90 || norm === 270 ? W : H;
    const spanC = norm === 90 || norm === 270 ? H : W;
    const spanReq = Math.max(spanR, spanC);
    const offsetR = Math.floor((N - spanR) / 2) + offsetY;
    const offsetC = Math.floor((N - spanC) / 2) + offsetX;

    let placedWalls = 0;
    for (let u = 0; u < H; u++) {
      for (let v = 0; v < W; v++) {
        if (localMat[u][v] === 1) {
          let r = u;
          let c = v;
          if (norm === 90) {
            r = v;
            c = H - 1 - u;
          } else if (norm === 180) {
            r = H - 1 - u;
            c = W - 1 - v;
          } else if (norm === 270) {
            r = W - 1 - v;
            c = u;
          }
          const dr = r + offsetR;
          const dc = c + offsetC;
          if (dr >= 0 && dr < N && dc >= 0 && dc < N) {
            grid[dr][dc] = 1;
            placedWalls++;
          }
        }
      }
    }

    const fitsInGrid = spanR <= N && spanC <= N && placedWalls === sourceWalls;

    return {
      grid,
      spanReq,
      fitsInGrid,
      sourceWalls,
      placedWalls,
      isLattice45: false,
    };
  }

  // 2. Continuous Super-Sampled Rotation (all other angles including 45° multiples)
  const rad = (norm * Math.PI) / 180;
  const spanR = Math.abs(W * Math.sin(rad)) + Math.abs(H * Math.cos(rad));
  const spanC = Math.abs(W * Math.cos(rad)) + Math.abs(H * Math.sin(rad));
  const spanReq = Math.ceil(Math.max(spanR, spanC));

  const rotatedGrid = superSampleRotateMatrix(localMat, norm, threshold, 4, N, N, offsetX, offsetY);
  const analysis = analyzeGrid(rotatedGrid);
  const fitsInGrid = spanR <= N + 1e-4 && spanC <= N + 1e-4 && analysis.minR >= 0 && analysis.maxR < N && analysis.minC >= 0 && analysis.maxC < N;

  return {
    grid: rotatedGrid,
    spanReq,
    fitsInGrid,
    sourceWalls,
    placedWalls: analysis.count,
    isLattice45: is45,
  };
}

/**
 * Builds the 44x44 grid from laid out lines (backward compatibility wrapper).
 */
export function renderLinesToGrid(
  lines: LaidOutLine[],
  font: BitmapFont,
  scale: number,
  letterSpacing: number,
  preserveThinLines: boolean = false
): { grid: number[][]; verticalOverflow: boolean } {
  const { localMat, totalHeight, maxWidth } = renderLinesToLocalMatrix(
    lines,
    font,
    scale,
    letterSpacing,
    preserveThinLines
  );
  const placed = placeBitmapInGrid(localMat, 0);
  return {
    grid: placed.grid,
    verticalOverflow: totalHeight > COC_GRID_SIZE || maxWidth > COC_GRID_SIZE,
  };
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
  maxWalls: number,
  preserveThinLines: boolean = false
): number {
  if (!text || text.length === 0) return 0;

  const is45 = is45DegreeAngle(rotationDeg);
  let left = 1;
  let right = text.length;
  let best = 0;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const sub = text.slice(0, mid);
    const { lines } = layoutLines(sub, font, scale, letterSpacing, convertTurkishToAscii, is45);
    const { localMat } = renderLinesToLocalMatrix(lines, font, scale, letterSpacing, preserveThinLines);
    const placed = placeBitmapInGrid(localMat, rotationDeg);

    if (placed.fitsInGrid && placed.placedWalls <= maxWalls) {
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
 * Pipeline: layout -> scale -> (thickness in Part B) -> rotate -> budget/autofit.
 */
export function computeWallArt(
  text: string,
  font: BitmapFont,
  scale: number = 1.0,
  rotationDeg: number = 0,
  maxWalls: number = DEFAULT_MAX_WALLS,
  letterSpacing: number = 1,
  convertTurkishToAscii: boolean = false,
  autoFit: boolean = true,
  preserveThinLines: boolean = false,
  offsetX: number = 0,
  offsetY: number = 0
): WallArtResult {
  const clampedScale = Math.max(
    MIN_BITMAP_SCALE,
    Math.min(MAX_BITMAP_SCALE, Math.round(scale * 100) / 100)
  );
  const isCleanScale = CLEAN_SCALES.some((cs) => Math.abs(cs - clampedScale) < 1e-4);
  const isLattice45 = is45DegreeAngle(rotationDeg);
  const isHorizontal = isHorizontalOnScreen(rotationDeg);
  const normRot = ((rotationDeg % 360) + 360) % 360;

  let currentScale = clampedScale;
  let wasScaledDown = false;

  const evaluateConnectivity = (sc: number) => {
    const thickenedChars: string[] = [];
    let lowestT = 0.4;
    let hadIntermediateBreak = false;

    if (normRot % 90 !== 0) {
      const testedChars = new Set<string>();
      for (const ch of text) {
        if (ch === " " || testedChars.has(ch)) continue;
        testedChars.add(ch);
        const resolved = resolveChar(ch, font, convertTurkishToAscii);
        if (resolved.glyph) {
          const resGlyph = boxResample(
            resolved.glyph,
            sc,
            sc < 1 && preserveThinLines ? 0.25 : 0.5
          );
          const conn = testGlyphConnectivity(resGlyph, normRot, 0.4);
          if (conn.needsDilation) {
            thickenedChars.push(ch);
          } else if (conn.effectiveT < lowestT) {
            lowestT = conn.effectiveT;
          }
          if (!isLattice45 && conn.rotComp4 > conn.srcComp8) {
            hadIntermediateBreak = true;
          }
        }
      }
    }

    return { thickenedChars, lowestT, hadIntermediateBreak };
  };

  let connInfo = evaluateConnectivity(currentScale);
  let layoutRes = layoutLines(text, font, currentScale, letterSpacing, convertTurkishToAscii, isLattice45);
  let renderRes = renderLinesToLocalMatrix(
    layoutRes.lines,
    font,
    currentScale,
    letterSpacing,
    preserveThinLines,
    new Set(connInfo.thickenedChars)
  );
  const centeredPlaced = placeBitmapInGrid(renderRes.localMat, rotationDeg, connInfo.lowestT, 0, 0);
  let placedRes =
    offsetX === 0 && offsetY === 0
      ? centeredPlaced
      : placeBitmapInGrid(renderRes.localMat, rotationDeg, connInfo.lowestT, offsetX, offsetY);

  // Auto-fit: test candidate scales down to MIN_BITMAP_SCALE in steps of SCALE_STEP based on centered fit
  if (autoFit && (!centeredPlaced.fitsInGrid || centeredPlaced.placedWalls > maxWalls) && currentScale > MIN_BITMAP_SCALE) {
    let testScale = Math.round((currentScale - SCALE_STEP) * 100) / 100;
    while (testScale >= MIN_BITMAP_SCALE) {
      const testConn = evaluateConnectivity(testScale);
      const nextLayout = layoutLines(text, font, testScale, letterSpacing, convertTurkishToAscii, isLattice45);
      const nextRender = renderLinesToLocalMatrix(
        nextLayout.lines,
        font,
        testScale,
        letterSpacing,
        preserveThinLines,
        new Set(testConn.thickenedChars)
      );
      const nextCentered = placeBitmapInGrid(nextRender.localMat, rotationDeg, testConn.lowestT, 0, 0);

      if (nextCentered.fitsInGrid && nextCentered.placedWalls <= maxWalls) {
        currentScale = testScale;
        connInfo = testConn;
        layoutRes = nextLayout;
        renderRes = nextRender;
        placedRes =
          offsetX === 0 && offsetY === 0
            ? nextCentered
            : placeBitmapInGrid(nextRender.localMat, rotationDeg, testConn.lowestT, offsetX, offsetY);
        wasScaledDown = true;
        break;
      }
      testScale = Math.round((testScale - SCALE_STEP) * 100) / 100;
    }
  }

  const analysis = analyzeGrid(placedRes.grid);
  const capHeight = Math.max(1, Math.round(font.height * currentScale));
  const isReadabilityLow = capHeight < READABILITY_MIN_HEIGHT;

  const allWarnings = [...layoutRes.warnings];

  if (isReadabilityLow) {
    allWarnings.push(`Bu boyutta harfler zor okunabilir (Harf yüksekliği: ${capHeight} hücre)`);
  }

  // Connectivity dilation notice
  if (connInfo.thickenedChars.length > 0) {
    allWarnings.push(`Bazı harflerde ince çizgiler korundu (${connInfo.thickenedChars.join(", ")})`);
  }

  // Offset overflow notice
  if ((offsetX !== 0 || offsetY !== 0) && placedRes.placedWalls < placedRes.sourceWalls) {
    allWarnings.push("Yazı kaydırma nedeniyle ızgara dışına taşıyor ve kırpılıyor.");
  }

  // 45-degree angle vs intermediate angles vs orthogonal
  if (isLattice45) {
    if (!placedRes.fitsInGrid) {
      allWarnings.push(
        `Bu metin 45° modunda ızgaraya sığmıyor (gereken: ${placedRes.spanReq} hücre, mevcut: ${COC_GRID_SIZE}).`
      );
    }
  } else if (normRot % 90 !== 0) {
    if (connInfo.hadIntermediateBreak) {
      allWarnings.push("Piksel harfleri bozabilir; 45° katlarını kullanın.");
    }
  } else if (!placedRes.fitsInGrid) {
    allWarnings.push("Metin ızgaraya sığmıyor (dikey/yatay taşma). Ölçeği küçültün veya metni kısaltın.");
  }

  if (!isCleanScale) {
    allWarnings.push("Bu ölçekte harf kalınlıkları eşit olmayabilir");
  }

  const isOverBudget = placedRes.placedWalls > maxWalls;
  let maxFittingChars = text.length;

  if (isOverBudget) {
    maxFittingChars = computeMaxFittingChars(
      text,
      font,
      currentScale,
      letterSpacing,
      convertTurkishToAscii,
      rotationDeg,
      maxWalls,
      preserveThinLines
    );
    if (currentScale <= MIN_BITMAP_SCALE) {
      allWarnings.push(
        "Bu metin 0.5x ölçekte bile bütçeyi aşıyor, metni kısaltın veya bütçeyi artırın."
      );
    } else {
      allWarnings.push(
        `Duvar bütçesi (${maxWalls}) aşıldı! En fazla ${maxFittingChars} harf sığıyor. Ölçeği düşürün veya metni kısaltın.`
      );
    }
  }

  const lineCount = layoutRes.lines.length;
  const linesInfo = lineCount > 1 ? `${lineCount} satıra bölündü` : "Tek satır";

  return {
    grid: placedRes.grid,
    wallCount: placedRes.placedWalls,
    maxWalls,
    isOverBudget,
    maxFittingChars,
    effectiveScale: currentScale,
    originalScale: clampedScale,
    wasScaledDown,
    autoFit,
    offsetX,
    offsetY,
    lineCount,
    linesInfo,
    warnings: Array.from(new Set(allWarnings)),
    convertedChars: layoutRes.convertedChars,
    missingChars: layoutRes.missingChars,
    buildGuide: generateBuildGuide(placedRes.grid),
    minRow: analysis.minR,
    maxRow: analysis.maxR,
    minCol: analysis.minC,
    maxCol: analysis.maxC,
    capHeight,
    isCleanScale,
    isReadabilityLow,
    preserveThinLines,
    spanReq: placedRes.spanReq,
    fitsInGrid: placedRes.fitsInGrid,
    isLattice45,
    isHorizontalOnScreen: isHorizontal,
    thickenedChars: connInfo.thickenedChars,
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
    offsetX?: number;
    offsetY?: number;
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
  const posInfo = meta.offsetX || meta.offsetY ? `   •   Konum Ofseti: X:${meta.offsetX || 0}, Y:${meta.offsetY || 0}` : "";
  ctx.fillText(
    `Ölçek: ${meta.scale}x   •   Açı: ${meta.rotation}°${posInfo}   •   Her kare = 1x1 Duvar Segmenti`,
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

  // 4. Grid Background
  ctx.fillStyle = "#162032";
  ctx.fillRect(marginX, marginY, COC_GRID_SIZE * cellSize, COC_GRID_SIZE * cellSize);

  // 5. Draw Walls and Grid Lines
  for (let r = 0; r < COC_GRID_SIZE; r++) {
    for (let c = 0; c < COC_GRID_SIZE; c++) {
      const x = marginX + c * cellSize;
      const y = marginY + r * cellSize;

      if (grid[r][c] === 1) {
        // Wall piece: Warm Amber Stone
        ctx.fillStyle = "#F59E0B";
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

        // Highlight
        ctx.fillStyle = "#FDE68A";
        ctx.fillRect(x + 2, y + 2, cellSize - 4, 3);

        // Shadow
        ctx.fillStyle = "#B45309";
        ctx.fillRect(x + 2, y + cellSize - 5, cellSize - 4, 3);
      } else {
        // Grid wireframe
        ctx.strokeStyle = "#1E293B";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }
  }

  // 6. 5x5 Major Grid Highlights
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= COC_GRID_SIZE; i += 5) {
    const x = marginX + i * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, marginY);
    ctx.lineTo(x, marginY + COC_GRID_SIZE * cellSize);
    ctx.stroke();

    const y = marginY + i * cellSize;
    ctx.beginPath();
    ctx.moveTo(marginX, y);
    ctx.lineTo(marginX + COC_GRID_SIZE * cellSize, y);
    ctx.stroke();
  }

  // 7. Outer Border
  ctx.strokeStyle = "#F59E0B";
  ctx.lineWidth = 2;
  ctx.strokeRect(marginX, marginY, COC_GRID_SIZE * cellSize, COC_GRID_SIZE * cellSize);

  // 8. Footer Disclaimer
  ctx.fillStyle = "#64748B";
  ctx.font = "italic 11px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    "CoC Analitik • clashofclans.com • Fan Content Policy",
    marginX,
    canvas.height - 20
  );

  return canvas.toDataURL("image/png");
}
