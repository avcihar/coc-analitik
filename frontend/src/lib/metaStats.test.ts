/**
 * Unit tests for Meta Dashboard Usage Statistics (Phase 2)
 */

interface StatItem {
  name: string;
  count: number;
  usagePct: number;
  hero?: string;
}

function calculateUsagePct(count: number, totalAttacks: number): number {
  if (totalAttacks <= 0) return 0;
  return Number(((count / totalAttacks) * 100).toFixed(1));
}

function sortByUsageDesc<T extends { usagePct: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.usagePct - a.usagePct);
}

function filterByHero<T extends { hero?: string }>(items: T[], selectedHero: string): T[] {
  if (selectedHero === "Tümü") return items;
  return items.filter((item) => item.hero === selectedHero);
}

function paginateTop12<T>(items: T[], showAll: boolean): T[] {
  return showAll ? items : items.slice(0, 12);
}

console.log("=== RUNNING META USAGE STATISTICS TESTS ===");

// Test 1: Usage percentage formula
const totalRankedAttacks = 3371;
const sampleAttackCount = 2827; // Archer count
const usagePct = calculateUsagePct(sampleAttackCount, totalRankedAttacks);
if (usagePct !== 83.9) {
  throw new Error(`Test 1 Failed: Expected 83.9%, got ${usagePct}%`);
}
console.log("✓ Test 1: Usage percentage formula correctly computes and rounds to 1 decimal place.");

// Test 2: Descending sort by usage percentage
const dummyItems: StatItem[] = [
  { name: "Balloon", count: 1791, usagePct: 53.1 },
  { name: "Archer", count: 2827, usagePct: 83.9 },
  { name: "Ice Golem", count: 2063, usagePct: 61.2 },
];
const sorted = sortByUsageDesc(dummyItems);
if (sorted[0].name !== "Archer" || sorted[1].name !== "Ice Golem" || sorted[2].name !== "Balloon") {
  throw new Error(`Test 2 Failed: Sorting incorrect: ${JSON.stringify(sorted)}`);
}
console.log("✓ Test 2: Descending sort strictly orders higher usage items first.");

// Test 3: Filter equipments by hero
const dummyEquipments: StatItem[] = [
  { name: "Giant Arrow", count: 990, usagePct: 32.5, hero: "Archer Queen" },
  { name: "Spiky Ball", count: 865, usagePct: 39.6, hero: "Barbarian King" },
  { name: "Action Figure", count: 2901, usagePct: 95.2, hero: "Archer Queen" },
];
const kingOnly = filterByHero(dummyEquipments, "Barbarian King");
if (kingOnly.length !== 1 || kingOnly[0].name !== "Spiky Ball") {
  throw new Error(`Test 3 Failed: Hero filter failed for Barbarian King`);
}
const allHeroes = filterByHero(dummyEquipments, "Tümü");
if (allHeroes.length !== 3) {
  throw new Error(`Test 3 Failed: 'Tümü' filter should return all items`);
}
console.log("✓ Test 3: Hero filter correctly isolates hero equipment and returns all for 'Tümü'.");

// Test 4: Top 12 pagination logic
const twentyTroops = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));
const paginatedCollapsed = paginateTop12(twentyTroops, false);
if (paginatedCollapsed.length !== 12) {
  throw new Error(`Test 4 Failed: Expected 12 items when collapsed, got ${paginatedCollapsed.length}`);
}
const paginatedExpanded = paginateTop12(twentyTroops, true);
if (paginatedExpanded.length !== 20) {
  throw new Error(`Test 4 Failed: Expected 20 items when expanded, got ${paginatedExpanded.length}`);
}
console.log("✓ Test 4: Top 12 initial view with full view toggle behaves correctly.");

// Test 5: Boundary conditions
if (calculateUsagePct(0, 3000) !== 0) throw new Error("Zero count failed");
if (calculateUsagePct(3000, 0) !== 0) throw new Error("Zero total attacks failed");
if (calculateUsagePct(3000, 3000) !== 100.0) throw new Error("100% usage failed");
console.log("✓ Test 5: Edge cases (0 attacks, 0 total, 100% saturation) handled gracefully.");

console.log("=== ALL META USAGE STATISTICS TESTS PASSED! ===");

