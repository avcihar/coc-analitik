import { ASSETS_CONFIG, getSceneryConfig, mapGridToScenery, mapSceneryToGrid } from "./assetsConfig";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

console.log("=== RUNNING ASSETS CONFIG TESTS ===");

// 1. Sceneries count
assert(ASSETS_CONFIG.sceneries.length === 70, `Expected 70 sceneries, got ${ASSETS_CONFIG.sceneries.length}`);
console.log(`✓ Test 1: Exactly 70 sceneries configured.`);

// 2. Default scenery is winter
assert(ASSETS_CONFIG.defaultSceneryId === "winter", "Default scenery must be 'winter'");
const defaultScenery = getSceneryConfig();
assert(defaultScenery.id === "winter", "getSceneryConfig() without args must return winter");
assert(defaultScenery.naturalWidth === 3705, "Winter naturalWidth must be 3705");
assert(defaultScenery.naturalHeight === 2545, "Winter naturalHeight must be 2545");
assert(defaultScenery.buildArea.top.x === 1894.5 && defaultScenery.buildArea.top.y === 265.5, "Winter top corner");
assert(defaultScenery.buildArea.right.x === 3107.0 && defaultScenery.buildArea.right.y === 1175.0, "Winter right corner");
assert(defaultScenery.buildArea.bottom.x === 1894.5 && defaultScenery.buildArea.bottom.y === 2084.5, "Winter bottom corner");
assert(defaultScenery.buildArea.left.x === 682.0 && defaultScenery.buildArea.left.y === 1175.0, "Winter left corner");
assert(defaultScenery.status === "Doğrulandı", "Winter status must be 'Doğrulandı'");
assert(defaultScenery.method === "calibrated", "Winter method must be 'calibrated'");
console.log(`✓ Test 2: Default winter scenery calibration strictly preserved.`);

// 3. Priority 5 Test Set Validation
const pWinter = getSceneryConfig("winter");
assert(pWinter.verified === true && pWinter.status === "Doğrulandı", "Winter priority test failed");

const pFire = getSceneryConfig("fireandice");
assert(pFire.verified === true && pFire.status === "Doğrulandı" && pFire.method === "tile-pattern", "Fire & Ice priority test failed");
assert(pFire.buildArea.right.x - pFire.buildArea.left.x === 2131.0, "Fire & Ice diamond width must be 2131.0");

const pBarbarian = getSceneryConfig("barbarian_odyssey");
assert(pBarbarian.verified === true && pBarbarian.status === "Elle düzeltildi" && pBarbarian.method === "manual", "Barbarian Odyssey priority test failed");
assert(pBarbarian.buildArea.right.x - pBarbarian.buildArea.left.x === 919.0, "Barbarian Odyssey diamond width must be 919.0");

const pGlory = getSceneryConfig("glory_arena");
assert(pGlory.verified === false && pGlory.status === "Güvenilmez", "Glory Arena priority test failed: must be unverified/güvenilmez");

const p9th = getSceneryConfig("9th_clashiversary");
assert(p9th.verified === true && p9th.status === "Doğrulandı" && p9th.method === "tile-pattern", "9th Clashiversary priority test failed");
assert(p9th.buildArea.top.x === 511.3 && p9th.buildArea.top.y === 72.6, "9th Clashiversary top corner");
console.log(`✓ Test 3: Priority 5 Test Set (Winter, Fire & Ice, Barbarian Odyssey, Glory Arena, 9th Clashiversary) verified.`);

// 4. Verification & Classification counts
const verifiedSceneries = ASSETS_CONFIG.sceneries.filter((s) => s.verified !== false);
const unverifiedSceneries = ASSETS_CONFIG.sceneries.filter((s) => s.verified === false);
assert(verifiedSceneries.length === 65, `Expected 65 verified sceneries, got ${verifiedSceneries.length}`);
assert(unverifiedSceneries.length === 5, `Expected 5 unverified sceneries, got ${unverifiedSceneries.length}`);
console.log(`✓ Test 4: Exactly 65 verified and 5 unverified (güvenilmez) sceneries classified.`);

// 5. Ratio check across verified sceneries
for (const sc of verifiedSceneries) {
  const bw = sc.buildArea.right.x - sc.buildArea.left.x;
  const bh = sc.buildArea.bottom.y - sc.buildArea.top.y;
  assert(bh > 0, `Height must be > 0 for ${sc.id}`);
  const ratio = bw / bh;
  assert(Math.abs(ratio - 4 / 3) < 0.05, `Scenery ${sc.id} ratio must be approx 4/3, got ${ratio}`);
  assert(sc.src.startsWith("/sceneries/"), `Scenery ${sc.id} src must start with /sceneries/`);
  assert(sc.thumb.startsWith("/sceneries/icons/"), `Scenery ${sc.id} thumb must start with /sceneries/icons/`);
}
console.log(`✓ Test 5: All 65 verified sceneries satisfy 4/3 aspect ratio and asset paths.`);

// 6. Bijective coordinate mapping test
const testCorners = [
  { c: 0, r: 0 },
  { c: 44, r: 0 },
  { c: 44, r: 44 },
  { c: 0, r: 44 },
  { c: 22, r: 22 },
];

for (const { c, r } of testCorners) {
  const pt = mapGridToScenery(c, r, defaultScenery.buildArea);
  const back = mapSceneryToGrid(pt.x, pt.y, defaultScenery.buildArea);
  assert(Math.abs(back.col - c) < 1e-4, `Inverse col failed for (${c},${r}): got ${back.col}`);
  assert(Math.abs(back.row - r) < 1e-4, `Inverse row failed for (${c},${r}): got ${back.row}`);
}
console.log(`✓ Test 6: Grid <-> Scenery pixel coordinate mapping is strictly bijective.`);

// 7. Fallback lookup test
const fallback = getSceneryConfig("non_existent_id");
assert(fallback.id === "winter", "Unknown ID must fallback to winter");
console.log(`✓ Test 7: Fallback behavior for unknown scenery ID works correctly.`);

console.log("=== ALL ASSETS CONFIG TESTS PASSED! ===");
