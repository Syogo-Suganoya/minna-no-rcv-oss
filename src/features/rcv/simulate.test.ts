import { test } from "node:test";
import assert from "node:assert/strict";
// .ts 拡張子明示は node --test（型ストリップ実行）が拡張子を補完しないため必要。
import { normalizeSimParams, simulateBallots, SIM_PRESETS, type SimParams } from "./simulate.ts";
import { tallyRcv } from "./tally.ts";

function preset(id: string, seed: string): SimParams {
  const p = SIM_PRESETS.find((x) => x.id === id);
  assert.ok(p, id);
  return { ...p.params, seed };
}

function run(p: SimParams) {
  const { options, ballots } = simulateBallots(p);
  const tally = tallyRcv(ballots, options.map((o) => o.id), { lotSeed: p.seed });
  const r1 = tally.rounds[0].snap;
  const r1Leader = Object.keys(r1).reduce((a, b) => (r1[a] >= r1[b] ? a : b));
  const winner = tally.rounds[tally.rounds.length - 1].winner;
  return { options, ballots, tally, r1Leader, winner };
}

const SEEDS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];

test("同じ条件・同じ seed なら同じ票束（URL を共有すれば同じ開票になる）", () => {
  const p = preset("split", "abc");
  assert.deepEqual(simulateBallots(p), simulateBallots(p));
  assert.notDeepEqual(simulateBallots(p).ballots, simulateBallots({ ...p, seed: "abd" }).ballots);
});

test("票数・候補数が条件どおりで、票は重複のない有効な順位になっている", () => {
  const p = { ...preset("split3", "x"), voters: 2_000 };
  const { options, ballots } = simulateBallots(p);
  assert.equal(options.length, p.candidates);
  assert.equal(ballots.length, p.voters);
  const ids = new Set(options.map((o) => o.id));
  for (const b of ballots) {
    assert.ok(b.length >= 1 && b.length <= p.candidates);
    assert.equal(new Set(b).size, b.length);
    assert.ok(b.every((id) => ids.has(id)));
  }
});

test("プリセット「票割れで逆転」: 1位票は少数派の B が最多だが、RCV では多数派側が勝つ", () => {
  for (const seed of SEEDS) {
    const { r1Leader, winner } = run(preset("split", seed));
    assert.equal(r1Leader, "b", `seed=${seed}`);
    assert.match(winner ?? "", /^a\d$/, `seed=${seed}`);
  }
});

test("プリセット「似た候補が3人」: 同じく 1位票と RCV の結果が食い違う", () => {
  for (const seed of SEEDS.slice(0, 3)) {
    const { r1Leader, winner } = run(preset("split3", seed));
    assert.equal(r1Leader, "b", `seed=${seed}`);
    assert.match(winner ?? "", /^a\d$/, `seed=${seed}`);
  }
});

test("プリセット「1位票だけで決まる」「一騎打ち」: 1回目の集計で決着する", () => {
  for (const seed of SEEDS) {
    assert.equal(run(preset("landslide", seed)).tally.rounds.length, 1, `landslide seed=${seed}`);
    assert.equal(run(preset("duel", seed)).tally.rounds.length, 1, `duel seed=${seed}`);
  }
});

test("normalizeSimParams: 範囲外・不正な入力は丸める", () => {
  const p = normalizeSimParams({
    voters: "999999999",
    candidates: "1",
    similar: "5",
    majorityShare: "abc",
    spread: "huge",
    seed: "<script>",
  });
  assert.equal(p.voters, 100_000);
  assert.equal(p.candidates, 2);
  assert.equal(p.similar, 1); // 候補数 − 1 まで
  assert.equal(p.majorityShare, SIM_PRESETS[0].params.majorityShare);
  assert.equal(p.spread, SIM_PRESETS[0].params.spread);
  assert.equal(p.seed, "");
});
