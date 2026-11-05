import type {
  BitmapFont,
  BitmapFontMissingSummary,
} from "./types";

export const TURKISH_UPPER = ["Ç", "Ğ", "İ", "I", "Ö", "Ş", "Ü"];
export const TURKISH_LOWER = ["ç", "ğ", "ı", "i", "ö", "ş", "ü"];
export const ASCII_UPPER = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i)
);
export const ASCII_LOWER = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(97 + i)
);
export const DIGITS = Array.from({ length: 10 }, (_, i) => String(i));
export const COMMON_PUNCTUATION = [
  " ",
  ".",
  ",",
  "!",
  "?",
  "-",
  "_",
  ":",
  ";",
  "(",
  ")",
  "/",
];

export function idToTitle(id: string): string {
  return id
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export interface NormalizeResult {
  font: BitmapFont | null;
  errors: string[];
}

export function validateAndNormalizeFont(
  rawJson: unknown,
  fileId: string,
  filename: string
): NormalizeResult {
  const errors: string[] = [];

  if (typeof rawJson !== "object" || rawJson === null || Array.isArray(rawJson)) {
    return {
      font: null,
      errors: [`${filename}: Geçersiz JSON yapısı (kök eleman bir nesne olmalı)`],
    };
  }

  const record = rawJson as Record<string, unknown>;

  // Check for _meta or meta object
  const metaObj = (
    typeof record._meta === "object" && record._meta !== null && !Array.isArray(record._meta)
      ? record._meta
      : typeof record.meta === "object" && record.meta !== null && !Array.isArray(record.meta)
      ? record.meta
      : record
  ) as Record<string, unknown>;

  // Extract optional metadata
  const metaName = typeof metaObj.name === "string" ? metaObj.name.trim() : undefined;
  const metaAuthor = typeof metaObj.author === "string" ? metaObj.author.trim() : undefined;
  const metaLicense = typeof metaObj.license === "string" ? metaObj.license.trim() : undefined;

  // Extract baselines: { "Q": 10, "R": 10 }
  const baselines: Record<string, number> = {};
  if (
    metaObj.baselines &&
    typeof metaObj.baselines === "object" &&
    !Array.isArray(metaObj.baselines)
  ) {
    for (const [k, v] of Object.entries(metaObj.baselines as Record<string, unknown>)) {
      if (typeof v === "number") {
        baselines[k] = v;
      }
    }
  }

  // Glyph map: either in record.glyphs or top-level keys that don't start with '_' and aren't meta keys
  let rawGlyphs: Record<string, unknown> = {};
  if (
    record.glyphs &&
    typeof record.glyphs === "object" &&
    !Array.isArray(record.glyphs)
  ) {
    rawGlyphs = record.glyphs as Record<string, unknown>;
  } else {
    const metaKeySet = new Set([
      "_meta",
      "meta",
      "name",
      "author",
      "license",
      "description",
      "version",
      "id",
      "height",
      "width",
      "size",
      "glyphs",
      "metadata",
      "baselines",
    ]);
    for (const [key, value] of Object.entries(record)) {
      if (!key.startsWith("_") && !metaKeySet.has(key)) {
        rawGlyphs[key] = value;
      }
    }
  }

  const glyphKeys = Object.keys(rawGlyphs);
  if (glyphKeys.length === 0) {
    return {
      font: null,
      errors: [`${filename}: Hiçbir glif matrisi bulunamadı`],
    };
  }

  const normalizedGlyphs: Record<string, number[][]> = {};
  const glyphHeights: number[] = [];

  for (const char of glyphKeys) {
    const rawMatrix = rawGlyphs[char];

    if (!Array.isArray(rawMatrix) || rawMatrix.length === 0) {
      errors.push(`${filename}: '${char}' glifi boş veya dizi değil`);
      continue;
    }

    const rows: number[][] = [];
    let expectedWidth: number | null = null;
    let isRowLengthValid = true;
    let isValueValid = true;

    for (let r = 0; r < rawMatrix.length; r++) {
      const rawRow = rawMatrix[r];
      let rowNums: number[] = [];

      if (Array.isArray(rawRow)) {
        for (let c = 0; c < rawRow.length; c++) {
          const cell = rawRow[c];
          if (cell === 0 || cell === 1) {
            rowNums.push(cell);
          } else if (cell === "0" || cell === "." || cell === " ") {
            rowNums.push(0);
          } else if (cell === "1" || cell === "#" || cell === "*") {
            rowNums.push(1);
          } else {
            isValueValid = false;
            errors.push(
              `${filename}: '${char}' glifinde geçersiz değer (${String(
                cell
              )}) bulundu (satır ${r + 1}, sütun ${c + 1})`
            );
            break;
          }
        }
      } else if (typeof rawRow === "string") {
        for (let c = 0; c < rawRow.length; c++) {
          const charCell = rawRow[c];
          if (charCell === "0" || charCell === "." || charCell === " ") {
            rowNums.push(0);
          } else if (charCell === "1" || charCell === "#" || charCell === "*") {
            rowNums.push(1);
          } else {
            isValueValid = false;
            errors.push(
              `${filename}: '${char}' glifinde geçersiz karakter '${charCell}' bulundu (satır ${
                r + 1
              }, sütun ${c + 1})`
            );
            break;
          }
        }
      } else {
        errors.push(`${filename}: '${char}' glifinin ${r + 1}. satırı dizi veya metin değil`);
        isRowLengthValid = false;
        break;
      }

      if (!isValueValid) break;

      if (expectedWidth === null) {
        expectedWidth = rowNums.length;
      } else if (rowNums.length !== expectedWidth) {
        isRowLengthValid = false;
        errors.push(
          `${filename}: '${char}' glifinin satır uzunlukları eşit değil (satır 1: ${expectedWidth}, satır ${
            r + 1
          }: ${rowNums.length})`
        );
        break;
      }

      rows.push(rowNums);
    }

    if (isRowLengthValid && isValueValid && rows.length > 0) {
      normalizedGlyphs[char] = rows;
      glyphHeights.push(rows.length);
    }
  }

  // If severe errors occurred and no valid glyphs remain, reject font
  if (Object.keys(normalizedGlyphs).length === 0 || errors.length > 0) {
    return {
      font: null,
      errors,
    };
  }

  // Check for varying heights warning if no baselines specified
  const uniqueHeights = new Set(glyphHeights);
  if (uniqueHeights.size > 1 && Object.keys(baselines).length === 0) {
    console.warn(
      `⚠ ${filename}: glif yükseklikleri farklı (${Array.from(uniqueHeights).join(
        ", "
      )} satır), baselines tanımlamayı düşünün`
    );
  }

  // Calculate ascent and descent relative to baseline for each glyph
  const glyphAscent: Record<string, number> = {};
  const glyphDescent: Record<string, number> = {};

  for (const [char, matrix] of Object.entries(normalizedGlyphs)) {
    const rawHeight = matrix.length;
    const baseIndex =
      baselines[char] !== undefined ? baselines[char] : rawHeight - 1;
    const ascent = baseIndex;
    const descent = Math.max(0, rawHeight - 1 - baseIndex);
    glyphAscent[char] = ascent;
    glyphDescent[char] = descent;
  }

  const maxAscent = Math.max(...Object.values(glyphAscent));
  const maxDescent = Math.max(...Object.values(glyphDescent));
  const totalHeight = maxAscent + 1 + maxDescent;
  const uniformBaseline = maxAscent;

  // Pad each glyph at top and bottom so baselines align precisely at uniformBaseline
  for (const [char, matrix] of Object.entries(normalizedGlyphs)) {
    const width = matrix[0]?.length || 0;
    const padTop = maxAscent - glyphAscent[char];
    const padBottom = maxDescent - glyphDescent[char];

    if (padTop > 0) {
      const topRows: number[][] = Array.from({ length: padTop }, () =>
        new Array(width).fill(0)
      );
      matrix.unshift(...topRows);
    }
    if (padBottom > 0) {
      const bottomRows: number[][] = Array.from({ length: padBottom }, () =>
        new Array(width).fill(0)
      );
      matrix.push(...bottomRows);
    }
  }

  const supportedChars = Object.keys(normalizedGlyphs).sort();
  const supportedSet = new Set(supportedChars);

  const missingSummary: BitmapFontMissingSummary = {
    hasLowercase: ASCII_LOWER.some((c) => supportedSet.has(c)),
    hasDigits: DIGITS.some((c) => supportedSet.has(c)),
    missingTurkishUpper: TURKISH_UPPER.filter((c) => !supportedSet.has(c)),
    missingTurkishLower: TURKISH_LOWER.filter((c) => !supportedSet.has(c)),
    missingAsciiUpper: ASCII_UPPER.filter((c) => !supportedSet.has(c)),
    missingAsciiLower: ASCII_LOWER.filter((c) => !supportedSet.has(c)),
    missingDigits: DIGITS.filter((c) => !supportedSet.has(c)),
    missingPunctuation: COMMON_PUNCTUATION.filter((c) => !supportedSet.has(c)),
    totalSupported: supportedChars.length,
  };

  const font: BitmapFont = {
    id: fileId,
    name: metaName || idToTitle(fileId),
    height: totalHeight,
    baseline: uniformBaseline,
    author: metaAuthor,
    license: metaLicense,
    supportedChars,
    missingSummary,
    glyphs: normalizedGlyphs,
  };

  return {
    font,
    errors: [],
  };
}

