import { buildCopyArmyLink, COPY_ARMY_BASE_URL } from "./armyLink";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

console.log("=== RUNNING ARMY LINK & COPY TESTS ===");

// 1. Basic army share code link formatting
const sampleCode = "u4x0-2x1s1x0-2x1";
const generatedLink = buildCopyArmyLink(sampleCode);
assert(
  generatedLink === `${COPY_ARMY_BASE_URL}${sampleCode}`,
  `Expected ${COPY_ARMY_BASE_URL}${sampleCode}, got ${generatedLink}`
);
console.log("✓ Test 1: buildCopyArmyLink produces valid in-game deep link without encoding.");

// 2. Already full link idempotency
const fullLink = `${COPY_ARMY_BASE_URL}u10x0-5x1`;
const formattedLink = buildCopyArmyLink(fullLink);
assert(
  formattedLink === fullLink,
  `Expected ${fullLink}, got ${formattedLink}`
);
console.log("✓ Test 2: Full link input preserved without duplicate prefixes.");

// 3. Empty code fallback
assert(buildCopyArmyLink("") === "", "Empty code must return empty string");
console.log("✓ Test 3: Empty code handled safely.");

console.log("=== ALL ARMY LINK TESTS PASSED! ===");

