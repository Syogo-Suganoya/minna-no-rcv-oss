import { test } from "node:test";
import assert from "node:assert/strict";
// .ts 拡張子明示は node --test（型ストリップ実行）が拡張子を補完しないため必要。
import { seededShuffle } from "./shuffle.ts";

const IDS = ["a", "b", "c", "d", "e", "f"];

test("同じ種なら何度呼んでも同じ並び（リロードしても変わらない）", () => {
  assert.deepEqual(seededShuffle(IDS, "voter1:poll1"), seededShuffle(IDS, "voter1:poll1"));
});

test("要素の過不足がなく、元の配列は書き換えない", () => {
  const before = [...IDS];
  const out = seededShuffle(IDS, "voter1:poll1");
  assert.deepEqual([...out].sort(), [...IDS].sort());
  assert.deepEqual(IDS, before);
});

test("種が違えば並びも変わる（投票者ごと・poll ごとに違う並びになる）", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 50; i++) seen.add(seededShuffle(IDS, `voter${i}:poll1`).join(""));
  // 6! = 720 通り。50 人がほぼ同じ並びになるなら偏っている。
  assert.ok(seen.size >= 40, `並びの種類が少なすぎる: ${seen.size}`);
});

test("どの候補も先頭に来うる（先頭が特定の候補に偏らない）", () => {
  const firstCount = new Map<string, number>();
  const N = 6000;
  for (let i = 0; i < N; i++) {
    const first = seededShuffle(IDS, `v${i}:p`)[0];
    firstCount.set(first, (firstCount.get(first) ?? 0) + 1);
  }
  for (const id of IDS) {
    const share = (firstCount.get(id) ?? 0) / N;
    // 期待値 1/6 ≈ 0.167。大きく外れていなければよい。
    assert.ok(share > 0.13 && share < 0.2, `${id} が先頭に来る割合 ${share}`);
  }
});

test("0〜1 件はそのまま返す", () => {
  assert.deepEqual(seededShuffle([], "s"), []);
  assert.deepEqual(seededShuffle(["x"], "s"), ["x"]);
});
