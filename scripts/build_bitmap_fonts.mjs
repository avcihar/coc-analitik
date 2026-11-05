#!/usr/bin/env node

/**
 * Bitmap Font Generator & Validator
 * Reads Fonts/*.json, validates rectangularity, row consistency and valid values,
 * normalizes glyph heights, and outputs frontend/src/lib/bitmapFonts/generated.ts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..");
const FONTS_DIR = path.join(ROOT_DIR, "Fonts");
const OUT_TS_FILE = path.join(
  ROOT_DIR,
  "frontend",
  "src",
  "lib",
  "bitmapFonts",
  "generated.ts"
);
const OUT_PUBLIC_DIR = path.join(
  ROOT_DIR,
  "frontend",
  "public",
  "bitmap-fonts"
);
const OUT_PUBLIC_JSON = path.join(OUT_PUBLIC_DIR, "index.json");

const TURKISH_UPPER = ["Ç", "Ğ", "İ", "I", "Ö", "Ş", "Ü"];
const TURKISH_LOWER = ["ç", "ğ", "ı", "i", "ö", "ş", "ü"];
const ASCII_UPPER = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i)
);
const ASCII_LOWER = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(97 + i)
);
const DIGITS = Array.from({ length: 10 }, (_, i) => String(i));
const COMMON_PUNCTUATION = [
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

function idToTitle(id) {
  return id
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function validateAndNormalizeFont(rawJson, fileId, filename) {
  const errors = [];

  if (typeof rawJson !== "object" || rawJson === null || Array.isArray(rawJson)) {
    return {
      font: null,
      errors: [`${filename}: Geçersiz JSON yapısı (kök eleman bir nesne olmalı)`],
    };
  }

  const record = rawJson;
  const metaObj =
    typeof record._meta === "object" && record._meta !== null && !Array.isArray(record._meta)
      ? record._meta
      : typeof record.meta === "object" && record.meta !== null && !Array.isArray(record.meta)
      ? record.meta
      : record;

  const metaName = typeof metaObj.name === "string" ? metaObj.name.trim() : undefined;
  const metaAuthor = typeof metaObj.author === "string" ? metaObj.author.trim() : undefined;
  const metaLicense = typeof metaObj.license === "string" ? metaObj.license.trim() : undefined;

  const baselines = {};
  if (
    metaObj.baselines &&
    typeof metaObj.baselines === "object" &&
    !Array.isArray(metaObj.baselines)
  ) {
    for (const [k, v] of Object.entries(metaObj.baselines)) {
      if (typeof v === "number") {
        baselines[k] = v;
      }
    }
  }

  let rawGlyphs = {};
  if (
    record.glyphs &&
    typeof record.glyphs === "object" &&
    !Array.isArray(record.glyphs)
  ) {
    rawGlyphs = record.glyphs;
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

  const normalizedGlyphs = {};
  const glyphHeights = [];

  for (const char of glyphKeys) {
    const rawMatrix = rawGlyphs[char];

    if (!Array.isArray(rawMatrix) || rawMatrix.length === 0) {
      errors.push(`${filename}: '${char}' glifi boş veya dizi değil`);
      continue;
    }

    const rows = [];
    let expectedWidth = null;
    let isRowLengthValid = true;
    let isValueValid = true;

    for (let r = 0; r < rawMatrix.length; r++) {
      const rawRow = rawMatrix[r];
      const rowNums = [];

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

  if (Object.keys(normalizedGlyphs).length === 0 || errors.length > 0) {
    return {
      font: null,
      errors,
    };
  }

  const uniqueHeights = new Set(glyphHeights);
  if (uniqueHeights.size > 1 && Object.keys(baselines).length === 0) {
    console.warn(
      `⚠ ${filename}: glif yükseklikleri farklı (${Array.from(uniqueHeights).join(
        ", "
      )} satır), baselines tanımlamayı düşünün`
    );
  }

  const glyphAscent = {};
  const glyphDescent = {};

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

  for (const [char, matrix] of Object.entries(normalizedGlyphs)) {
    const width = matrix[0]?.length || 0;
    const padTop = maxAscent - glyphAscent[char];
    const padBottom = maxDescent - glyphDescent[char];

    if (padTop > 0) {
      const topRows = Array.from({ length: padTop }, () =>
        new Array(width).fill(0)
      );
      matrix.unshift(...topRows);
    }
    if (padBottom > 0) {
      const bottomRows = Array.from({ length: padBottom }, () =>
        new Array(width).fill(0)
      );
      matrix.push(...bottomRows);
    }
  }

  const supportedChars = Object.keys(normalizedGlyphs).sort();
  const supportedSet = new Set(supportedChars);

  const missingSummary = {
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

  const font = {
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

export function buildBitmapFonts() {
  console.log("=== BITMAP FONT DERLEYİCİ BAŞLATILIYOR ===");
  console.log(`Kaynak klasör: ${FONTS_DIR}`);

  if (!fs.existsSync(FONTS_DIR)) {
    console.error(`HATA: Fonts klasörü bulunamadı: ${FONTS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(FONTS_DIR)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .sort();

  console.log(`Bulunan font dosyaları: ${files.length} adet (${files.join(", ")})`);

  const validFonts = [];
  const buildErrors = [];

  for (const file of files) {
    const filePath = path.join(FONTS_DIR, file);
    const fileId = path.basename(file, path.extname(file)).toLowerCase();

    try {
      const rawText = fs.readFileSync(filePath, "utf-8");
      const rawJson = JSON.parse(rawText);

      const result = validateAndNormalizeFont(rawJson, fileId, file);

      if (result.font) {
        validFonts.push(result.font);
        console.log(
          `✓ Font yüklendi: "${result.font.name}" (${fileId}) - Yükseklik: ${result.font.height} satır, ${result.font.supportedChars.length} glif`
        );
      } else {
        console.warn(`⚠ Font geçersiz olduğu için atlandı: ${file}`);
        for (const err of result.errors) {
          console.warn(`   → ${err}`);
          buildErrors.push({
            fontId: fileId,
            file,
            message: err,
          });
        }
      }
    } catch (e) {
      const msg = `${file}: JSON ayrıştırma hatası (${e.message})`;
      console.warn(`⚠ ${msg}`);
      buildErrors.push({
        fontId: fileId,
        file,
        message: msg,
      });
    }
  }

  // 1. Output TypeScript module
  fs.mkdirSync(path.dirname(OUT_TS_FILE), { recursive: true });
  const tsContent = `// Automatically generated by scripts/build_bitmap_fonts.mjs
// DO NOT EDIT DIRECTLY. Run \`npm run build-fonts\` or \`node scripts/build_bitmap_fonts.mjs\` to regenerate.

import type { BitmapFont, BitmapFontValidationError } from "./types";

export const GENERATED_BITMAP_FONTS: BitmapFont[] = ${JSON.stringify(
    validFonts,
    null,
    2
)};

export const BITMAP_FONT_BUILD_ERRORS: BitmapFontValidationError[] = ${JSON.stringify(
    buildErrors,
    null,
    2
)};
`;

  fs.writeFileSync(OUT_TS_FILE, tsContent, "utf-8");
  console.log(`✓ TypeScript modülü oluşturuldu: ${OUT_TS_FILE}`);

  // 2. Output public static JSON
  fs.mkdirSync(OUT_PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(
    OUT_PUBLIC_JSON,
    JSON.stringify({ fonts: validFonts, errors: buildErrors }, null, 2),
    "utf-8"
  );
  console.log(`✓ Statik JSON oluşturuldu: ${OUT_PUBLIC_JSON}`);

  console.log(
    `=== DERLEME TAMAMLANDI: ${validFonts.length} geçerli font, ${buildErrors.length} hata ===\n`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildBitmapFonts();
}

