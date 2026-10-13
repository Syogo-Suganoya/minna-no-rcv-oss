import { test } from "node:test";
import assert from "node:assert/strict";
// .ts 拡張子明示は node --test（型ストリップ実行）が拡張子を補完しないため必要。
import { tallyRcv, type RcvBallot } from "./tally.ts";
import { rcvInsight } from "./insight.ts";

const A = "a";
const B = "b";
const C = "c";
const D = "d";

/** [票の中身, 枚数] の組から票束を作る補助。 */
function ballots(...specs: Array<[RcvBallot, number]>): RcvBallot[] {
  const out: RcvBallot[] = [];
  for (const [b, n] of specs) for (let i = 0; i < n; i++) out.push([...b]);
  return out;
}

test("候補が2つなら、票の中身によらず twoOptions", () => {
  const t = tallyRcv(ballots([[A, B], 3], [[B, A], 2]), [A, B]);
  assert.deepEqual(rcvInsight(t, 2), { kind: "twoOptions" });
});

test("第1ラウンドで過半数が出たら firstRound（多数決と同じ結果）", () => {
  const t = tallyRcv(ballots([[A, B, C], 6], [[B, A, C], 3], [[C, B, A], 1]), [A, B, C]);
  assert.deepEqual(rcvInsight(t, 3), { kind: "firstRound" });
});

test("1位票トップが票の移動で逆転されたら overturned（トップのidを返す）", () => {
  // トップページの卒業旅行と同じ形: 富士山(A)4・温泉(B)3・ビーチ(C)2・高原(D)1 → 温泉が勝つ
  const t = tallyRcv(
    ballots([[A], 4], [[B, C, D], 3], [[C, B, D], 2], [[D, B, C], 1]),
    [A, B, C, D]
  );
  assert.equal(t.rounds[t.rounds.length - 1].winner, B);
  assert.deepEqual(rcvInsight(t, 4), { kind: "overturned", leaderId: A });
});

test("票は移ったが1位票トップがそのまま勝ったら confirmed", () => {
  const t = tallyRcv(ballots([[A, B], 4], [[B, A], 3], [[C, A], 2]), [A, B, C]);
  assert.ok(t.rounds.length > 1);
  assert.equal(t.rounds[t.rounds.length - 1].winner, A);
  assert.deepEqual(rcvInsight(t, 3), { kind: "confirmed" });
});

test("1位票トップが同数なら、逆転とは言い切れないので confirmed", () => {
  const t = tallyRcv(ballots([[A, C], 3], [[B, C], 3], [[C, B], 1]), [A, B, C]);
  assert.ok(t.rounds.length > 1);
  assert.deepEqual(rcvInsight(t, 3), { kind: "confirmed" });
});
