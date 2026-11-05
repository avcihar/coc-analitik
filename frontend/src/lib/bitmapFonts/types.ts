export interface BitmapGlyph {
  char: string;
  width: number;
  height: number;
  matrix: number[][]; // 0 or 1
}

export interface BitmapFontMissingSummary {
  hasLowercase: boolean;
  hasDigits: boolean;
  missingTurkishUpper: string[];
  missingTurkishLower: string[];
  missingAsciiUpper: string[];
  missingAsciiLower: string[];
  missingDigits: string[];
  missingPunctuation: string[];
  totalSupported: number;
}

export interface BitmapFont {
  id: string; // e.g. "cross_stitch"
  name: string; // e.g. "Cross Stitch"
  height: number; // uniform row height
  author?: string;
  license?: string;
  supportedChars: string[];
  missingSummary: BitmapFontMissingSummary;
  glyphs: Record<string, number[][]>;
}

export interface BitmapFontValidationError {
  fontId: string;
  file: string;
  message: string;
}

export interface BitmapFontRegistry {
  fonts: BitmapFont[];
  errors: BitmapFontValidationError[];
}

