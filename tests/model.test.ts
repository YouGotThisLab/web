import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { candidates } from "../src/data";
import {
  offices,
  counties,
  normalizeCounty,
  density,
  filterCandidates,
  loadCounts,
  rollHit,
  daysUntilElection,
} from "../src/model";

test("corrupt or hostile stored counts cannot create invalid scores", () => {
  for (const raw of ["broken", "null", "[]", "false"])
    assert.deepEqual(loadCounts(raw, ["chiang"]), {});
  assert.deepEqual(
    loadCounts(
      '{"chiang":12,"shen":-1,"miao":2.5,"lee":9007199254740992,"unknown":4}',
      ["chiang", "shen", "miao", "lee"],
    ),
    { chiang: 12 },
  );
});
test("filters keep geography and office boundaries and match nicknames", () => {
  assert.deepEqual(
    filterCandidates(candidates, "新北市", "metro-mayor").map((c) => c.name),
    ["李四川", "蘇巧慧"],
  );
  assert.equal(
    filterCandidates(candidates, null, "all", "水獺媽媽")[0]?.name,
    "蘇巧慧",
  );
  assert.equal(filterCandidates(candidates, "新北市", "town-mayor").length, 0);
  assert.equal(
    filterCandidates(candidates, null, "all", "根本不存在的人").length,
    0,
  );
});
test("election countdown uses Taiwan calendar and never becomes negative", () => {
  assert.equal(daysUntilElection(new Date("2026-10-04T05:00:00Z")), 55);
  assert.equal(daysUntilElection(new Date("2026-11-27T16:00:00Z")), 0);
  assert.equal(daysUntilElection(new Date("2026-11-26T16:00:00Z")), 1);
  assert.equal(daysUntilElection(new Date("2026-12-01T00:00:00Z")), 0);
});
test("every hit adds exactly one point, including visual combo bursts", () => {
  for (const combo of [1, 2, 4, 5, 6, 10, 100]) {
    assert.equal(rollHit(combo).points, 1);
    assert.equal(rollHit(combo).critical, combo >= 5 && combo % 5 === 0);
  }
});
test("records only use allowed offices and counties and carry sources", () => {
  assert.equal(offices.length, 9);
  assert.equal(counties.length, 22);
  assert.equal(new Set(candidates.map((c) => c.id)).size, candidates.length);
  assert.equal(new Set(candidates.map((c) => c.office)).size, 9);
  for (const c of candidates) {
    assert.ok(offices.some((o) => o.id === c.office));
    assert.ok(counties.includes(c.county));
    assert.ok(c.nicknames.length >= 1 && c.nicknames.length <= 3);
    assert.match(c.candidacySource, /^https:\/\//);
    assert.match(c.news.url, /^https:\/\//);
    assert.ok(existsSync(new URL(`../public${c.image}`, import.meta.url)));
    for (const n of c.nicknames)
      if (n.kind === "public") assert.match(n.source ?? "", /^https:\/\//);
  }
});
test("density reflects actual collection count, not opinion or vote count", () => {
  assert.deepEqual([0, 1, 2, 4, 5, 10].map(density), [
    "empty",
    "light",
    "medium",
    "medium",
    "dense",
    "dense",
  ]);
  assert.equal(normalizeCounty("台東縣"), "臺東縣");
  assert.equal(normalizeCounty("桃園縣"), "桃園市");
});
