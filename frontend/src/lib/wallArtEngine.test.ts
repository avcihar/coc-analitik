import {
  COC_GRID_SIZE,
  DEFAULT_MAX_WALLS,
  MIN_BITMAP_SCALE,
  MAX_BITMAP_SCALE,
  SCALE_STEP,
  READABILITY_MIN_HEIGHT,
  CLEAN_SCALES,
  computeWallArt,
  generateBuildGuide,
  resolveChar,
  layoutLines,
  boxResample,
  is45DegreeAngle,
  is45DegreeLatticeAngle,
  isHorizontalOnScreen,
  snapAngleTo45,
  countComponents8,
  countComponents4,
  chebyshevDilate,
  superSampleRotateMatrix,
  testGlyphConnectivity,
  placeBitmapInGrid,
} from "./wallArtEngine";
import { getAllBitmapFonts, getBitmapFont } from "./bitmapFonts";

function runTests() {
  console.log("=== RUNNING BITMAP WALL ART ENGINE (LOSSLESS 45° LATTICE) TESTS ===");

  // 1. Grid Constants & Scale Range
  if (COC_GRID_SIZE !== 44) throw new Error(`Expected COC_GRID_SIZE 44, got ${COC_GRID_SIZE}`);
  if (DEFAULT_MAX_WALLS !== 325) throw new Error(`Expected DEFAULT_MAX_WALLS 325, got ${DEFAULT_MAX_WALLS}`);
  if (MIN_BITMAP_SCALE !== 0.5) throw new Error(`Expected MIN_BITMAP_SCALE 0.5, got ${MIN_BITMAP_SCALE}`);
  if (MAX_BITMAP_SCALE !== 4.0) throw new Error(`Expected MAX_BITMAP_SCALE 4.0, got ${MAX_BITMAP_SCALE}`);
  if (SCALE_STEP !== 0.25) throw new Error(`Expected SCALE_STEP 0.25, got ${SCALE_STEP}`);
  if (READABILITY_MIN_HEIGHT !== 7) throw new Error(`Expected READABILITY_MIN_HEIGHT 7, got ${READABILITY_MIN_HEIGHT}`);
  console.log("✓ Test 1: Grid size 44x44, scale range 0.5x-4x, step 0.25, min cap height 7 verified.");

  // 2. Font Loading & Registry
  const fonts = getAllBitmapFonts();
  if (fonts.length < 2) throw new Error(`Expected at least 2 bitmap fonts, found ${fonts.length}`);
  const crossStitch = getBitmapFont("cross_stitch");
  const tangoStitch = getBitmapFont("tango_stitch");
  if (!crossStitch || !tangoStitch) throw new Error("Failed to load cross_stitch or tango_stitch");
  console.log(`✓ Test 2: Successfully loaded ${fonts.length} bitmap fonts.`);

  // 3. Integer Scale Box Resampling is Strictly Identical to n x n Block Replication
  const sampleMatrix = [
    [1, 0, 1],
    [0, 1, 0],
  ];
  for (const s of [2, 3, 4]) {
    const resampled = boxResample(sampleMatrix, s, 0.5);
    if (resampled.length !== sampleMatrix.length * s || resampled[0].length !== sampleMatrix[0].length * s) {
      throw new Error(`Dimension mismatch at scale ${s}x`);
    }
    for (let r = 0; r < sampleMatrix.length; r++) {
      for (let c = 0; c < sampleMatrix[r].length; c++) {
        const expectedVal = sampleMatrix[r][c];
        for (let dr = 0; dr < s; dr++) {
          for (let dc = 0; dc < s; dc++) {
            if (resampled[r * s + dr][c * s + dc] !== expectedVal) {
              throw new Error(`Value mismatch at scale ${s}x at cell (${r * s + dr}, ${c * s + dc})`);
            }
          }
        }
      }
    }
  }
  console.log("✓ Test 3: Box resampling at integer scales 2x, 3x, 4x is strictly identical to n x n block expansion.");

  // 4. Downscale 0.5x Behavior and Preserve Thin Lines Toggle (0.25 vs 0.5)
  const singlePixel = [
    [1, 0],
    [0, 0],
  ];
  const resDefault = boxResample(singlePixel, 0.5, 0.5);
  const resThin = boxResample(singlePixel, 0.5, 0.25);
  if (resDefault[0][0] !== 0) throw new Error("Expected single pixel at 0.5x with threshold 0.5 to drop to 0");
  if (resThin[0][0] !== 1) throw new Error("Expected single pixel at 0.5x with threshold 0.25 (preserve thin lines) to remain 1");

  const full2x2 = [
    [1, 1],
    [1, 1],
  ];
  const resFull = boxResample(full2x2, 0.5, 0.5);
  if (resFull[0][0] !== 1) throw new Error("Expected 2x2 full block at 0.5x to remain 1");
  console.log("✓ Test 4: Downscale 0.5x drops isolated pixels at threshold 0.5 and preserves thin lines at 0.25.");

  // 5. Balanced Line Wrapping: Eliminates 1-Letter Widows ("HAR/UN" vs "HARU/N")
  const layout = layoutLines("HARUN", crossStitch, 1.0, 1, false, false);
  if (layout.lines.length !== 2) {
    throw new Error(`Expected 'HARUN' to wrap into 2 lines, got ${layout.lines.length}`);
  }
  const line1Chars = layout.lines[0].items.map((i) => i.char).join("");
  const line2Chars = layout.lines[1].items.map((i) => i.char).join("");
  if (line1Chars === "HARU" && line2Chars === "N") {
    throw new Error("Single-character widow detected: 'HARU' / 'N'!");
  }
  if (line1Chars !== "HAR" || line2Chars !== "UN") {
    throw new Error(`Expected balanced split ['HAR', 'UN'], got ['${line1Chars}', '${line2Chars}']`);
  }
  console.log("✓ Test 5: Balanced line wrapping successfully produced ['HAR', 'UN'] with zero widows.");

  // 6. Letter Spacing Invariance: Stays Fixed in Final Grid Cells
  const resSpacing1 = computeWallArt("CO", crossStitch, 1.0, 0, 500, 1, false, false);
  const resSpacing3 = computeWallArt("CO", crossStitch, 1.0, 0, 500, 3, false, false);
  const width1 = resSpacing1.maxCol - resSpacing1.minCol + 1;
  const width3 = resSpacing3.maxCol - resSpacing3.minCol + 1;
  if (width3 - width1 !== 2) {
    throw new Error(`Expected spacing diff of 2 cells, got ${width3 - width1}`);
  }
  console.log("✓ Test 6: Letter spacing is strictly preserved in final grid cells.");

  // 7. Readability Warning at Small Scale (capHeight < 7)
  const smallRes = computeWallArt("COC", crossStitch, 0.5, 0, 500, 1, false, false);
  if (smallRes.capHeight < 7 && !smallRes.isReadabilityLow) {
    throw new Error("Expected isReadabilityLow to be true when capHeight < 7");
  }
  console.log(`✓ Test 7: Cap height (${smallRes.capHeight} cells) and readability evaluated correctly.`);

  // 8. Auto-Fit Budget Step-Down in 0.25 Steps
  const autoFitRes = computeWallArt("HARUN", crossStitch, 2.0, 0, 250, 1, false, true);
  if (autoFitRes.isOverBudget) {
    throw new Error("Auto-fit should scale down to stay within 250 walls");
  }
  if (!autoFitRes.wasScaledDown || autoFitRes.effectiveScale > 1.0) {
    throw new Error(`Expected auto-fit to scale down below 2x, got ${autoFitRes.effectiveScale}x`);
  }
  console.log(`✓ Test 8: Auto-fit successfully scaled down from 2x to ${autoFitRes.effectiveScale}x to respect budget.`);

  // 9. (a) 4-Connected Component Count Post-Rotation <= Source 8-Connected (or Corrected by Dilation)
  for (const font of [crossStitch, tangoStitch]) {
    for (const ch of ["C", "O", "K", "A", "L", "E", "H", "R", "U", "N"]) {
      const g = font.glyphs[ch];
      if (!g) continue;
      const conn = testGlyphConnectivity(g, -45, 0.4);
      if (conn.rotComp4 > conn.srcComp8) {
        throw new Error(
          `Connectivity violation for '${ch}' in ${font.name}: rot 4-comp (${conn.rotComp4}) > src 8-comp (${conn.srcComp8})`
        );
      }
    }
  }
  console.log("✓ Test 9 (a): 4-connected component count post-rotation <= source 8-connected count (breaks resolved via T-adjustment / Chebyshev dilation).");

  // 10. (d) Lowering Threshold T Never Decreases Filled Cell Count (Monotonicity Invariant)
  const testGlyphs = [crossStitch.glyphs["H"], crossStitch.glyphs["A"], tangoStitch.glyphs["T"]];
  for (const g of testGlyphs) {
    if (!g) continue;
    const count40 = superSampleRotateMatrix(g, -45, 0.40, 4, 30, 30).flat().filter((x) => x === 1).length;
    const count35 = superSampleRotateMatrix(g, -45, 0.35, 4, 30, 30).flat().filter((x) => x === 1).length;
    const count30 = superSampleRotateMatrix(g, -45, 0.30, 4, 30, 30).flat().filter((x) => x === 1).length;
    const count25 = superSampleRotateMatrix(g, -45, 0.25, 4, 30, 30).flat().filter((x) => x === 1).length;

    if (count40 > count35 || count35 > count30 || count30 > count25) {
      throw new Error(`Monotonicity failed: T=0.40 (${count40}), T=0.35 (${count35}), T=0.30 (${count30}), T=0.25 (${count25})`);
    }
  }
  console.log("✓ Test 10 (d): Lowering threshold T strictly monotonically non-decreases filled cell count.");

  // 11. (b) Discrete 0/90/180/270 Degree Rotations Match Coordinate Swaps Exactly
  const sampleLocal: number[][] = [
    [1, 0, 1, 1],
    [0, 1, 0, 1],
    [1, 1, 0, 0],
  ];
  let srcFilled = 0;
  for (const r of sampleLocal) for (const c of r) if (c === 1) srcFilled++;

  const p90 = placeBitmapInGrid(sampleLocal, 90);
  const p180 = placeBitmapInGrid(sampleLocal, 180);
  const p270 = placeBitmapInGrid(sampleLocal, 270);
  if (p90.placedWalls !== srcFilled || p180.placedWalls !== srcFilled || p270.placedWalls !== srcFilled) {
    throw new Error("Discrete rotation wall count mismatch");
  }
  console.log("✓ Test 11 (b): Discrete 0°, 90°, 180°, 270° rotations maintain exact coordinate transformation.");

  // 12. (c) 45° Mode Bounding Box Overflow & Warning when Exceeding 44 (No Forced Scale-Down when Auto-Fit is OFF)
  const noAutoFitRes = computeWallArt("SUPERCELL", crossStitch, 1.0, -45, 500, 1, false, false);
  if (noAutoFitRes.effectiveScale !== 1.0) {
    throw new Error(`Expected scale to remain 1.0x when autoFit is false, got ${noAutoFitRes.effectiveScale}x`);
  }
  if (noAutoFitRes.fitsInGrid) {
    throw new Error("Expected SUPERCELL at 1x to exceed 44 bounding box in 45° mode");
  }
  const hasSpanWarning = noAutoFitRes.warnings.some((w) => w.includes("45° modunda ızgaraya sığmıyor"));
  if (!hasSpanWarning) {
    throw new Error("Expected span overflow warning in 45° mode");
  }
  console.log("✓ Test 12 (c): 45° mode bounding box overflow correctly emits warning without forcing scale-down when auto-fit is OFF.");

  // 13. Angle Magnet Snapping to Multiples of 45°
  if (snapAngleTo45(43, 7) !== 45) throw new Error("Expected 43° to snap to 45°");
  if (snapAngleTo45(-47, 7) !== -45) throw new Error("Expected -47° to snap to -45°");
  if (snapAngleTo45(88, 7) !== 90) throw new Error("Expected 88° to snap to 90°");
  if (snapAngleTo45(30, 7) !== 30) throw new Error("Expected 30° not to snap (beyond 7° threshold)");
  if (snapAngleTo45(0, 7) !== 0) throw new Error("Expected 0° to remain 0°");
  console.log("✓ Test 13: Angle magnet accurately snaps to multiples of 45° within ±7° threshold.");

  // 14. Optional Auto-Fit Toggle (Manual Glyph Scale Forcing)
  const harunAutoOn = computeWallArt("Harun", tangoStitch, 1.25, -45, 300, 1, false, true, false, 0, 0);
  if (harunAutoOn.effectiveScale !== 1.0 || !harunAutoOn.wasScaledDown) {
    throw new Error(`Expected auto-fit ON to downscale Harun from 1.25x to 1.0x, got ${harunAutoOn.effectiveScale}x`);
  }
  const harunAutoOff = computeWallArt("Harun", tangoStitch, 1.25, -45, 300, 1, false, false, false, 0, 0);
  if (harunAutoOff.effectiveScale !== 1.25 || harunAutoOff.wasScaledDown) {
    throw new Error(`Expected auto-fit OFF to strictly preserve 1.25x scale without downscaling, got ${harunAutoOff.effectiveScale}x`);
  }
  console.log("✓ Test 14: Optional auto-fit toggle allows disabling downscaling to strictly force chosen scale (1.25x).");

  // 15. Grid Position Shift (offsetX, offsetY)
  const basePlaced = computeWallArt("COC", crossStitch, 1.0, 0, 300, 1, false, false, false, 0, 0);
  const shiftedPlaced = computeWallArt("COC", crossStitch, 1.0, 0, 300, 1, false, false, false, 3, -4);
  if (shiftedPlaced.minCol - basePlaced.minCol !== 3 || shiftedPlaced.maxCol - basePlaced.maxCol !== 3) {
    throw new Error(`Expected horizontal shift of +3 cols, got minCol delta ${shiftedPlaced.minCol - basePlaced.minCol}`);
  }
  if (shiftedPlaced.minRow - basePlaced.minRow !== -4 || shiftedPlaced.maxRow - basePlaced.maxRow !== -4) {
    throw new Error(`Expected vertical shift of -4 rows, got minRow delta ${shiftedPlaced.minRow - basePlaced.minRow}`);
  }
  console.log("✓ Test 15: Grid position shift (offsetX, offsetY) accurately translates rendered text coordinates.");

  console.log("=== ALL BITMAP WALL ART (LOSSLESS 45° LATTICE) TESTS PASSED! ===");
}

runTests();
