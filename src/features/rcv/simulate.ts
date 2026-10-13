/**
 * 大人数の開票デモ（/demo/random）用に、条件から票束をランダムに作る。
 *
 * 実際の投票を開いても票はなかなか集まらないので、選挙くらいの規模で RCV がどう
 * 動くかを試せるようにする。モデルは 1 次元の「立ち位置」:
 *
 * - 有権者は 2 つの陣営に分かれる。多数派（割合 majorityShare）は 0.25 付近、
 *   少数派は 0.75 付近に立ち位置を持つ（ばらつきは spread で決まる）。
 * - 多数派側には似た候補（similar 人）が 0.25 付近に集まり、少数派側には
 *   候補 B が 1 人立つ。残りの候補は間や端に散らばる。
 * - 各有権者は「立ち位置が近い候補ほど上」に、好みの揺らぎ（ノイズ）を足して順位を
 *   つける。全員が全候補に順位をつけるわけではない（一部は上位だけ書く）。
 *
 * 似た候補が多いほど多数派の 1 位票が割れ、1 位票だけなら少数派の B が勝つのに
 * RCV では多数派側が勝つ、という逆転が起きやすくなる。
 *
 * seed から決定的に生成するので、同じ条件・同じ seed なら何度でも同じ票束になる
 * （URL を共有すれば同じ開票を再生できる）。
 */

export type SimSpread = "low" | "mid" | "high";

export type SimParams = {
  /** 有権者（投票者）の数。 */
  voters: number;
  /** 候補の数。 */
  candidates: number;
  /** 多数派側に立つ、似た候補の数（1 なら票割れなし）。 */
  similar: number;
  /** 多数派陣営の割合（%）。 */
  majorityShare: number;
  /** 立ち位置と好みのばらつき。 */
  spread: SimSpread;
  /** 乱数の種。 */
  seed: string;
};

export const SIM_LIMITS = {
  voters: { min: 10, max: 100_000 },
  candidates: { min: 2, max: 8 },
  majorityShare: { min: 30, max: 80 },
} as const;

export type SimPreset = {
  id: string;
  title: string;
  body: string;
  params: Omit<SimParams, "seed">;
};

/** よくある展開をすぐ試せるプリセット。1 位票だけの結果と食い違うケースを先頭に置く。 */
export const SIM_PRESETS: SimPreset[] = [
  {
    id: "split",
    title: "似た候補で票が割れて逆転",
    body: "多数派が支持する似た候補が2人いて1位票が割れる。1位票だけなら少数派の候補Bが勝つが、RCVでは結果が変わる。",
    params: { voters: 10_000, candidates: 5, similar: 2, majorityShare: 58, spread: "mid" },
  },
  {
    id: "split3",
    title: "似た候補が3人で大きく割れる",
    body: "多数派の候補が3人に分かれ、1位票では3人とも少数派に届かない。除外のたびに票が仲間の候補へ集まっていく。",
    params: { voters: 50_000, candidates: 6, similar: 3, majorityShare: 60, spread: "mid" },
  },
  {
    id: "landslide",
    title: "1位票だけで決まる",
    body: "支持が1人に集まり、最初の集計で過半数に届く。この場合は多数決と同じ結果になる。",
    params: { voters: 10_000, candidates: 4, similar: 1, majorityShare: 66, spread: "low" },
  },
  {
    id: "duel",
    title: "候補2人の一騎打ち",
    body: "候補が2人だけなので、票を移す先がない。RCVでも多数決と必ず同じ結果になる。",
    params: { voters: 10_000, candidates: 2, similar: 1, majorityShare: 53, spread: "mid" },
  },
];

const SPREAD: Record<SimSpread, { voter: number; taste: number }> = {
  low: { voter: 0.08, taste: 0.04 },
  mid: { voter: 0.12, taste: 0.08 },
  high: { voter: 0.18, taste: 0.16 },
};

/** 似た候補・B 以外の候補を置く立ち位置（先頭から使う）。 */
const OTHER_POSITIONS = [0.5, 0.02, 0.98, 0.38, 0.62, 0.88];

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * URL のクエリなど、信用できない入力を範囲内に丸める。
 * 似た候補は「候補数 − 1」まで（少数派の B を必ず残す）。
 */
export function normalizeSimParams(raw: Record<string, unknown>): SimParams {
  const base = SIM_PRESETS[0].params;
  const candidates = clampInt(
    raw.candidates,
    SIM_LIMITS.candidates.min,
    SIM_LIMITS.candidates.max,
    base.candidates
  );
  const spread: SimSpread =
    raw.spread === "low" || raw.spread === "mid" || raw.spread === "high" ? raw.spread : base.spread;
  const seed =
    typeof raw.seed === "string" && /^[0-9a-z]{1,32}$/i.test(raw.seed) ? raw.seed : "";
  return {
    voters: clampInt(raw.voters, SIM_LIMITS.voters.min, SIM_LIMITS.voters.max, base.voters),
    candidates,
    similar: clampInt(raw.similar, 1, candidates - 1, Math.min(base.similar, candidates - 1)),
    majorityShare: clampInt(
      raw.majorityShare,
      SIM_LIMITS.majorityShare.min,
      SIM_LIMITS.majorityShare.max,
      base.majorityShare
    ),
    spread,
    seed,
  };
}

/** FNV-1a 32bit。種の文字列を 32bit 整数にするだけ（暗号用途ではない）。 */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32。[0, 1) の擬似乱数列を返す。 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 標準正規分布（Box–Muller）。 */
function gaussian(rand: () => number): number {
  const u = 1 - rand(); // (0, 1]
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export type SimOption = { id: string; label: string };

export type SimResult = { options: SimOption[]; ballots: string[][] };

export function simulateBallots(p: SimParams): SimResult {
  const rand = mulberry32(fnv1a(`${p.seed}:${p.voters}:${p.candidates}:${p.similar}:${p.majorityShare}:${p.spread}`));
  const sd = SPREAD[p.spread];

  // ── 候補と立ち位置 ──
  const cands: Array<SimOption & { pos: number }> = [];
  for (let i = 0; i < p.similar; i++) {
    // 似た候補は 0.25 を中心にわずかにずらして並べる（完全に同じだと順位がノイズだけで決まる）。
    const pos = 0.25 + (i - (p.similar - 1) / 2) * 0.03;
    cands.push({ id: `a${i + 1}`, label: p.similar === 1 ? "候補A" : `候補A${i + 1}`, pos });
  }
  cands.push({ id: "b", label: "候補B", pos: 0.75 });
  const others = p.candidates - p.similar - 1;
  for (let i = 0; i < others; i++) {
    cands.push({
      id: `c${i + 1}`,
      label: `候補${String.fromCharCode(67 + i)}`, // C, D, E, …
      pos: OTHER_POSITIONS[i % OTHER_POSITIONS.length],
    });
  }

  // ── 票 ──
  const majority = p.majorityShare / 100;
  const ballots: string[][] = [];
  const utility = new Float64Array(cands.length);
  const idx = cands.map((_, i) => i);
  for (let v = 0; v < p.voters; v++) {
    const center = rand() < majority ? 0.25 : 0.75;
    const x = center + gaussian(rand) * sd.voter;
    for (let i = 0; i < cands.length; i++) {
      utility[i] = -Math.abs(x - cands[i].pos) + gaussian(rand) * sd.taste;
    }
    idx.sort((a, b) => utility[b] - utility[a]);
    // 全員が最後まで順位をつけるわけではない（6割は全部、残りは上位 2 つか 1 つだけ）。
    const r = rand();
    const depth = r < 0.6 ? cands.length : r < 0.85 ? 2 : 1;
    ballots.push(idx.slice(0, Math.min(depth, cands.length)).map((i) => cands[i].id));
  }

  return { options: cands.map(({ id, label }) => ({ id, label })), ballots };
}
