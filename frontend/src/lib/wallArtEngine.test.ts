import {
  COC_GRID_SIZE,
  DEFAULT_MAX_WALLS,
  computeWallArt,
  generateBuildGuide,
  resolveChar,
  layoutLines,
  TURKISH_TO_ASCII,
} from "./wallArtEngine";
import { getAllBitmapFonts, getBitmapFont } from "./bitmapFonts";

function runTests() {
  console.log("=== RUNNING BITMAP WALL ART ENGINE TESTS ===");

  // 1. Grid Constants
  if (COC_GRID_SIZE !== 44) {
    throw new Error(`Expected COC_GRID_SIZE 44, got ${COC_GRID_SIZE}`);
  }
  if (DEFAULT_MAX_WALLS !== 325) {
    throw new Error(`Expected DEFAULT_MAX_WALLS 325, got ${DEFAULT_MAX_WALLS}`);
  }
  console.log("✓ Test 1: Grid size is strictly 44x44 and default wall budget is 325.");

  // 2. Font Loading & Registry
  const fonts = getAllBitmapFonts();
  if (fonts.length < 2) {
    throw new Error(`Expected at least 2 bitmap fonts, found ${fonts.length}`);
  }
  const crossStitch = getBitmapFont("cross_stitch");
  const tangoStitch = getBitmapFont("tango_stitch");
  if (!crossStitch || !tangoStitch) {
    throw new Error("Failed to load cross_stitch or tango_stitch");
  }
  console.log(`✓ Test 2: Successfully loaded ${fonts.length} bitmap fonts (Cross Stitch, Tango Stitch).`);

  // 3. Character Resolution & Turkish ASCII Conversion
  const charRes1 = resolveChar("A", crossStitch, false);
  if (!charRes1.glyph || charRes1.resolvedChar !== "A") {
    throw new Error("Failed to resolve ASCII 'A'");
  }

  // Without conversion: Turkish 'Ç' is missing in cross_stitch
  const charRes2 = resolveChar("Ç", crossStitch, false);
  if (charRes2.glyph !== null || !charRes2.warning) {
    throw new Error("Expected missing character warning for 'Ç' without conversion");
  }

  // With conversion: 'Ç' converts to 'C'
  const charRes3 = resolveChar("Ç", crossStitch, true);
  if (!charRes3.glyph || charRes3.resolvedChar !== "C" || !charRes3.converted) {
    throw new Error("Failed to convert 'Ç' to 'C' with conversion enabled");
  }
  console.log("✓ Test 3: Character resolution and Turkish ASCII conversion work seamlessly.");

  // 4. Glyph Rendering at Scale 1x Matches Glyph Exactly
  const singleCharRes = computeWallArt("C", crossStitch, 1, 0, 500, 1, false, false);
  const glyphC = crossStitch.glyphs["C"];
  const glyphCWalls = glyphC.reduce((acc, row) => acc + row.reduce((rAcc, cell) => rAcc + cell, 0), 0);
  if (singleCharRes.wallCount !== glyphCWalls) {
    throw new Error(`Wall count mismatch: expected ${glyphCWalls}, got ${singleCharRes.wallCount}`);
  }
  console.log(`✓ Test 4: Single glyph 'C' rendered with exactly ${glyphCWalls} walls at 1x.`);

  // 5. Integer Scale Multiplication (2x scale quadruples filled wall cells)
  const scale2Res = computeWallArt("C", crossStitch, 2, 0, 500, 1, false, false);
  if (scale2Res.wallCount !== glyphCWalls * 4) {
    throw new Error(`2x scale wall count expected ${glyphCWalls * 4}, got ${scale2Res.wallCount}`);
  }
  console.log(`✓ Test 5: Integer scale 2x multiplies each filled cell into a 2x2 block (${scale2Res.wallCount} walls).`);

  // 6. Word Wrapping (Line Break) when exceeding 44 grid cells
  const layout = layoutLines("HARUN KALE", crossStitch, 1, 1, false);
  if (layout.lines.length < 2) {
    throw new Error(`Expected 'HARUN KALE' to wrap into at least 2 lines, got ${layout.lines.length}`);
  }
  console.log(`✓ Test 6: Long text automatically wrapped into ${layout.lines.length} lines without clipping.`);

  // 7. Auto-Fit Budget Scaling
  // At 2x scale, "HARUN" has 317 * 4 = 1268 walls, which exceeds budget 325
  const autoFitRes = computeWallArt("HARUN", crossStitch, 2, 0, 325, 1, false, true);
  if (autoFitRes.isOverBudget) {
    throw new Error("Auto-fit should scale down to 1x to stay within 325 walls");
  }
  if (!autoFitRes.wasScaledDown || autoFitRes.effectiveScale !== 1) {
    throw new Error(`Expected auto-fit to scale down from 2x to 1x, got ${autoFitRes.effectiveScale}x`);
  }
  console.log("✓ Test 7: Auto-fit successfully scaled down from 2x to 1x to respect wall budget.");

  // 8. Build Guide Generation
  const guideGrid = Array.from({ length: 44 }, () => new Array(44).fill(0));
  for (let c = 5; c <= 9; c++) guideGrid[10][c] = 1;
  const guide = generateBuildGuide(guideGrid);
  if (guide.length !== 1 || guide[0].row !== 11 || guide[0].wallCount !== 5) {
    throw new Error("Build guide segmentation mismatch");
  }
  console.log("✓ Test 8: Build guide correctly generated 1-indexed rows and contiguous segments.");

  console.log("=== ALL BITMAP WALL ART TESTS PASSED! ===");
}

runTests();
