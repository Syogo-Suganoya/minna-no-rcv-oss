import type { RcvTallyResult } from "./tally";

/**
 * 結果ページの比較カードに出す「今回の結果で RCV は何をしたか」の判定。
 *
 * RCV は候補が2つだけ・1位票で過半数が出たときは多数決と同じ結果になる。そこで
 * 「票が移って結果が変わった」とだけ言い続けると誇張になるので、実際の集計から
 * どのケースかを決めて、文言を出し分ける。
 */
export type RcvInsight =
  /** 候補が2つ以下。RCV でも多数決と必ず同じ結果になる。 */
  | { kind: "twoOptions" }
  /** 第1ラウンドで過半数が出た。1位票だけで決めても同じ結果。 */
  | { kind: "firstRound" }
  /** 1位票だけなら別の候補（leaderId）が選ばれていた。 */
  | { kind: "overturned"; leaderId: string }
  /** 票の移動を経たが、1位票トップがそのまま勝った（または1位票トップが同数で決めきれない）。 */
  | { kind: "confirmed" };

export function rcvInsight(result: RcvTallyResult, optionCount: number): RcvInsight {
  if (optionCount <= 2) return { kind: "twoOptions" };
  if (result.rounds.length <= 1) return { kind: "firstRound" };

  const winnerId = result.rounds[result.rounds.length - 1].winner;
  const r1 = result.rounds[0].snap;
  const top = Math.max(0, ...Object.values(r1));
  const leaders = Object.keys(r1).filter((id) => top > 0 && r1[id] === top);
  // 1位票トップが同数のときは「1位票だけならこれだった」と言い切れないので比較しない。
  if (leaders.length === 1 && winnerId && leaders[0] !== winnerId) {
    return { kind: "overturned", leaderId: leaders[0] };
  }
  return { kind: "confirmed" };
}
