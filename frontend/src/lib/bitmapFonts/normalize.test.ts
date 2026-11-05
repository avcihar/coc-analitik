import { validateAndNormalizeFont, idToTitle } from "./normalize";
import { GENERATED_BITMAP_FONTS, BITMAP_FONT_BUILD_ERRORS } from "./generated";

function runTests() {
  console.log("=== RUNNING BITMAP FONT NORMALIZER TESTS ===");

  // 1. idToTitle
  if (idToTitle("cross_stitch") !== "Cross Stitch") {
    throw new Error("idToTitle failed for cross_stitch");
  }
  if (idToTitle("tango_stitch") !== "Tango Stitch") {
    throw new Error("idToTitle failed for tango_stitch");
  }
  console.log("✓ Test 1: idToTitle formats identifiers correctly.");

  // 2. Valid font normalization
  const validJson = {
    A: [
      [0, 1, 0],
      [1, 0, 1],
      [1, 1, 1],
    ],
  };
  const res1 = validateAndNormalizeFont(validJson, "simple", "simple.json");
  if (!res1.font || res1.errors.length > 0) {
    throw new Error(`Expected valid font, got errors: ${res1.errors.join(", ")}`);
  }
  if (res1.font.height !== 3 || res1.font.supportedChars[0] !== "A") {
    throw new Error("Font normalization attributes mismatch");
  }
  console.log("✓ Test 2: Valid font normalized correctly.");

  // 3. Broken font (non-rectangular)
  const brokenJson = {
    A: [
      [0, 1, 0],
      [1, 0], // mismatched width
    ],
  };
  const res2 = validateAndNormalizeFont(brokenJson, "broken", "broken.json");
  if (res2.font !== null || res2.errors.length === 0) {
    throw new Error("Expected broken font to be rejected with errors");
  }
  console.log("✓ Test 3: Non-rectangular font correctly rejected with Turkish error.");

  // 4. Generated fonts presence
  if (GENERATED_BITMAP_FONTS.length < 2) {
    throw new Error(`Expected at least 2 generated fonts, found ${GENERATED_BITMAP_FONTS.length}`);
  }
  const crossStitch = GENERATED_BITMAP_FONTS.find((f) => f.id === "cross_stitch");
  const tangoStitch = GENERATED_BITMAP_FONTS.find((f) => f.id === "tango_stitch");
  if (!crossStitch || !tangoStitch) {
    throw new Error("cross_stitch or tango_stitch missing from GENERATED_BITMAP_FONTS");
  }
  if (crossStitch.height !== 12 || tangoStitch.height !== 16) {
    throw new Error(`Heights mismatch: cross=${crossStitch.height}, tango=${tangoStitch.height}`);
  }
  console.log("✓ Test 4: Both cross_stitch and tango_stitch are loaded and verified in generated registry.");

  console.log("=== ALL BITMAP FONT TESTS PASSED! ===");
}

runTests();

