export * from "./types";
export * from "./normalize";
export {
  GENERATED_BITMAP_FONTS,
  BITMAP_FONT_BUILD_ERRORS,
} from "./generated";

import {
  GENERATED_BITMAP_FONTS,
  BITMAP_FONT_BUILD_ERRORS,
} from "./generated";
import type { BitmapFont, BitmapFontValidationError } from "./types";

/**
 * Returns all successfully parsed and normalized bitmap fonts from Fonts/*.json.
 */
export function getAllBitmapFonts(): BitmapFont[] {
  return GENERATED_BITMAP_FONTS;
}

/**
 * Returns a bitmap font by ID, or the first available font as fallback.
 */
export function getBitmapFont(id?: string | null): BitmapFont | null {
  if (!GENERATED_BITMAP_FONTS || GENERATED_BITMAP_FONTS.length === 0) {
    return null;
  }
  if (!id) {
    return GENERATED_BITMAP_FONTS[0];
  }
  const match = GENERATED_BITMAP_FONTS.find(
    (f) => f.id.toLowerCase() === id.toLowerCase()
  );
  return match || GENERATED_BITMAP_FONTS[0];
}

/**
 * Returns any validation errors recorded during font compilation.
 */
export function getBitmapFontErrors(): BitmapFontValidationError[] {
  return BITMAP_FONT_BUILD_ERRORS;
}

