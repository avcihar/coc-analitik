import {
  COC_GRID_SIZE,
  DEFAULT_MAX_WALLS,
  WALL_FONTS,
  zhangSuenThinning,
  extractContour,
  analyzeGrid,
  generateBuildGuide,
  computeWallArt,
  checkTextSupport,
} from "./wallArtEngine.ts";

// Test suite for Wall Art Engine
function runTests() {
  console.log("=== RUNNING WALL ART ENGINE UNIT TESTS ===");

  // Test 1: Grid Constants
  if (COC_GRID_SIZE !== 44) {
    throw new Error(`Expected COC_GRID_SIZE 44, got ${COC_GRID_SIZE}`);
  }
  if (DEFAULT_MAX_WALLS !== 325) {
    throw new Error(`Expected DEFAULT_MAX_WALLS 325, got ${DEFAULT_MAX_WALLS}`);
  }
  console.log("✓ Test 1: Grid size is strictly 44x44 and default wall budget is 325.");

  // Test 2: Font Registry & Turkish Support
  if (WALL_FONTS.length < 6) {
    throw new Error(`Expected at least 6 fonts, found ${WALL_FONTS.length}`);
  }
  for (const font of WALL_FONTS) {
    if (!font.filename || !font.license) {
      throw new Error(`Font ${font.name} missing license or filename`);
    }
    const missing = checkTextSupport("ÇŞĞÖÜIçşğöüı", font);
    if (missing.length > 0) {
      throw new Error(`Font ${font.name} failed Turkish characters: ${missing}`);
    }
  }
  console.log(`✓ Test 2: All ${WALL_FONTS.length} local fonts have valid licenses and full Turkish support.`);

  // Test 3: Zhang-Suen Thinning Algorithm
  // Create a 7x7 grid with a solid 3x3 block in the center
  const blockGrid: number[][] = Array.from({ length: 7 }, () => Array(7).fill(0));
  for (let r = 2; r <= 4; r++) {
    for (let c = 2; c <= 4; c++) {
      blockGrid[r][c] = 1;
    }
  }
  const thinned = zhangSuenThinning(blockGrid);
  const blockCountBefore = analyzeGrid(blockGrid).count;
  const blockCountAfter = analyzeGrid(thinned).count;
  if (blockCountBefore !== 9) throw new Error("Expected 9 filled cells before thinning");
  if (blockCountAfter >= 9 || blockCountAfter === 0) {
    throw new Error(`Thinning failed: count before ${blockCountBefore}, after ${blockCountAfter}`);
  }
  console.log(`✓ Test 3: Zhang-Suen thinning successfully reduced 3x3 block from ${blockCountBefore} to ${blockCountAfter} cell(s).`);

  // Test 4: Contour Extraction
  const contour = extractContour(blockGrid);
  const contourAnalysis = analyzeGrid(contour);
  // Center pixel (3,3) in 3x3 block should be hollow (0), borders should be 1
  if (contour[3][3] !== 0) {
    throw new Error("Center pixel of 3x3 block should be hollow in contour mode");
  }
  if (contourAnalysis.count !== 8) {
    throw new Error(`Expected 8 perimeter pixels in 3x3 contour, got ${contourAnalysis.count}`);
  }
  console.log("✓ Test 4: Contour extraction hollowed 3x3 block leaving 8 perimeter cells.");

  // Test 5: Build Guide Generation
  const guideGrid: number[][] = Array.from({ length: 44 }, () => Array(44).fill(0));
  // Place walls on Row 10 (cols 5..9 and 20..25)
  for (let c = 5; c <= 9; c++) guideGrid[9][c] = 1; // 5 walls
  for (let c = 20; c <= 25; c++) guideGrid[9][c] = 1; // 6 walls
  const guide = generateBuildGuide(guideGrid);
  if (guide.length !== 1) throw new Error(`Expected 1 guide row, got ${guide.length}`);
  if (guide[0].row !== 10) throw new Error(`Expected Row 10 (1-indexed), got ${guide[0].row}`);
  if (guide[0].wallCount !== 11) throw new Error(`Expected 11 walls, got ${guide[0].wallCount}`);
  if (guide[0].segments.length !== 2) throw new Error(`Expected 2 segments, got ${guide[0].segments.length}`);
  console.log("✓ Test 5: Build guide correctly segmented Row 10 into 2 contiguous ranges (5 and 6 walls).");

  console.log("=== ALL UNIT TESTS PASSED SUCCESSFULLY! ===");
}

runTests();
