/**
 * 投票画面の候補を、投票者ごとにランダムな順で並べる（poll.shuffle_options）。
 *
 * 全員が同じ並びで見ると、先頭ほど選ばれやすい「順序効果」で結果が偏りうる。
 * 並びは「ブラウザごとの種 × poll_id」から決定的に作るので、同じ人がリロードしても
 * 変わらず、別の人とは違う並びになる。表示順だけの話で、集計（tally.ts）には関わらない。
 */

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

/** seed から決定的に並べ替えたコピーを返す（Fisher–Yates）。元の配列は変えない。 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const rand = mulberry32(fnv1a(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
