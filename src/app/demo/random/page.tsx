import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { ArrowLeft, ArrowsClockwise, Play, Users } from "@phosphor-icons/react/dist/ssr";
import { tallyRcv } from "@/features/rcv/tally";
import {
  normalizeSimParams,
  simulateBallots,
  SIM_LIMITS,
  SIM_PRESETS,
  type SimParams,
} from "@/features/rcv/simulate";
import { RcvResultsPresenter } from "@/features/rcv/presenter/RcvResultsPresenter";

export const metadata: Metadata = {
  title: "大人数の開票デモ",
  description:
    "有権者の数・候補の数・支持の偏りを決めて票をランダムに作り、RCV（優先順位付投票）の開票をその場で再生できます。",
};

export const dynamic = "force-dynamic";

type Query = Record<string, string | string[] | undefined>;

/** 条件をクエリ文字列にする。seed を省くと、開いたときに新しい乱数が振られる。 */
function toQuery(p: Omit<SimParams, "seed"> & { seed?: string }, run: boolean): string {
  const q = new URLSearchParams({
    voters: String(p.voters),
    candidates: String(p.candidates),
    similar: String(p.similar),
    majorityShare: String(p.majorityShare),
    spread: p.spread,
  });
  if (p.seed) q.set("seed", p.seed);
  if (run) q.set("run", "1");
  return q.toString();
}

/**
 * 大人数の開票デモ（DB 非依存）。
 *
 * - クエリなし（または run なし）: 条件を決めるフォームとプリセット
 * - run=1: 条件から票束を作り（features/rcv/simulate.ts）、本番と同じ tallyRcv に
 *   通して開票プレゼンで再生する。seed が無ければ振ってリダイレクトするので、
 *   URL を共有すれば同じ開票をもう一度見られる
 */
export default async function RandomDemoPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
  );
  const params = normalizeSimParams(flat);

  if (flat.run !== "1") return <SettingsView params={params} />;

  if (!params.seed) {
    redirect(`/demo/random?${toQuery({ ...params, seed: randomBytes(6).toString("hex") }, true)}`);
  }

  const { options, ballots } = simulateBallots(params);
  const tally = tallyRcv(ballots, options.map((o) => o.id), { lotSeed: params.seed });
  const title = `有権者 ${params.voters.toLocaleString()}人・候補 ${params.candidates}人`;

  return (
    <>
      <RcvResultsPresenter title={title} options={options} tally={tally} demo />
      {/* プレゼンは全面固定（z-50）でクリックを全部「次へ」に使うので、操作は
          その外側（兄弟要素）に重ねる。子にするとクリックがスライド送りに食われる。 */}
      <nav className="fixed bottom-3 right-3 z-[60] flex flex-wrap justify-end gap-2">
        <Link
          href={`/demo/random?${toQuery(params, false)}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-2 text-[12.5px] font-bold text-tm-ink shadow-[var(--tm-shadow-card)] backdrop-blur transition-colors hover:bg-white"
        >
          <ArrowLeft size={14} weight="bold" />
          条件を変える
        </Link>
        <Link
          href={`/demo/random?${toQuery({ ...params, seed: undefined }, true)}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-2 text-[12.5px] font-bold text-tm-ink shadow-[var(--tm-shadow-card)] backdrop-blur transition-colors hover:bg-white"
        >
          <ArrowsClockwise size={14} weight="bold" />
          別の乱数でもう一度
        </Link>
      </nav>
    </>
  );
}

const FIELD = "flex flex-col gap-1.5";
const LABEL = "text-[13.5px] font-bold";
const HINT = "text-[12px] leading-[1.7] text-tm-fg-muted";
const INPUT =
  "w-full rounded-[10px] border border-tm-gray-250 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-tm-teal focus:ring-2 focus:ring-tm-teal-200";

function SettingsView({ params }: { params: SimParams }) {
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col gap-5 px-[18px] py-6 pb-16">
      <div className="flex flex-col gap-2">
        <b
          className="font-[family-name:var(--tm-font-jp-display)] text-[22px] leading-[1.5] tracking-[0.04em]"
          style={{ fontWeight: 900 }}
        >
          大人数の開票デモ
        </b>
        <p className="m-0 text-[13.5px] leading-[1.85] text-tm-gray-600">
          有権者の数や候補の数を決めると、票をランダムに作ってその場で開票します。選挙くらいの規模で
          RCV がどう動くのか、どんなときに「1位票だけ」の結果と食い違うのかを試せます。
        </p>
      </div>

      {/* ── プリセット ──── */}
      <section className="flex flex-col gap-2.5">
        <b className="text-[15px] tracking-[0.04em]">よくある展開から選ぶ</b>
        <div className="flex flex-col gap-2">
          {SIM_PRESETS.map((p) => (
            <Link
              key={p.id}
              href={`/demo/random?${toQuery(p.params, true)}`}
              className="group flex items-start gap-3 rounded-[14px] border border-tm-border-soft bg-white p-4 no-underline text-tm-ink transition-colors hover:border-tm-teal"
            >
              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-tm-teal-100 text-tm-teal-deep transition-colors group-hover:bg-tm-teal group-hover:text-white">
                <Play size={16} weight="fill" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <b className="text-[14.5px]">{p.title}</b>
                <span className="text-[12.5px] leading-[1.75] text-tm-fg-muted">{p.body}</span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] text-tm-fg-faint">
                  <Users size={12} />
                  有権者 {p.params.voters.toLocaleString()}人・候補 {p.params.candidates}人
                  {p.params.similar > 1 && `（うち似た候補 ${p.params.similar}人）`}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 条件を決める（GET フォーム。JS なしでも動く）──── */}
      <form
        action="/demo/random"
        method="get"
        className="flex flex-col gap-4 rounded-[16px] border border-tm-border-soft bg-white p-4"
      >
        <b className="text-[15px] tracking-[0.04em]">条件を決めて開票する</b>
        <input type="hidden" name="run" value="1" />

        <label className={FIELD}>
          <span className={LABEL}>有権者の数</span>
          <input
            type="number"
            name="voters"
            min={SIM_LIMITS.voters.min}
            max={SIM_LIMITS.voters.max}
            step={1}
            defaultValue={params.voters}
            className={INPUT}
          />
          <span className={HINT}>
            {SIM_LIMITS.voters.min.toLocaleString()}〜{SIM_LIMITS.voters.max.toLocaleString()}人
          </span>
        </label>

        <label className={FIELD}>
          <span className={LABEL}>候補の数</span>
          <select name="candidates" defaultValue={params.candidates} className={INPUT}>
            {Array.from(
              { length: SIM_LIMITS.candidates.max - SIM_LIMITS.candidates.min + 1 },
              (_, i) => SIM_LIMITS.candidates.min + i
            ).map((n) => (
              <option key={n} value={n}>
                {n}人
              </option>
            ))}
          </select>
        </label>

        <label className={FIELD}>
          <span className={LABEL}>多数派が支持する、似た候補の数</span>
          <select name="similar" defaultValue={params.similar} className={INPUT}>
            {Array.from({ length: SIM_LIMITS.candidates.max - 1 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "1人（票割れなし）" : `${n}人`}
              </option>
            ))}
          </select>
          <span className={HINT}>
            多数派の1位票が、似た候補（候補A1・A2…）のあいだで割れます。少数派は候補Bに集まります。候補の数より少なくなるよう自動で調整します。
          </span>
        </label>

        <label className={FIELD}>
          <span className={LABEL}>多数派の割合（%）</span>
          <input
            type="number"
            name="majorityShare"
            min={SIM_LIMITS.majorityShare.min}
            max={SIM_LIMITS.majorityShare.max}
            step={1}
            defaultValue={params.majorityShare}
            className={INPUT}
          />
          <span className={HINT}>
            {SIM_LIMITS.majorityShare.min}〜{SIM_LIMITS.majorityShare.max}%。残りが少数派です。
          </span>
        </label>

        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className={`${LABEL} mb-1.5`}>好みのばらつき</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["low", "小さい（陣営どおりに投票）"],
                ["mid", "ふつう"],
                ["high", "大きい（陣営をまたぐ人が多い）"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-tm-gray-250 px-3 py-1.5 text-[13px] has-[:checked]:border-tm-teal has-[:checked]:bg-tm-teal-100 has-[:checked]:text-tm-teal-deep"
              >
                <input
                  type="radio"
                  name="spread"
                  value={value}
                  defaultChecked={params.spread === value}
                  className="accent-[var(--tm-teal)]"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-full bg-tm-teal px-4 py-3.5 text-[15px] font-bold tracking-[0.04em] text-white transition-[background-color,transform] duration-150 ease-out hover:bg-tm-teal-hover active:scale-[0.97]"
        >
          <Play size={16} weight="fill" />
          この条件で開票する
        </button>
      </form>

      <p className="m-0 text-[12.5px] leading-[1.8] text-tm-fg-muted">
        票は、有権者と候補の「立ち位置」が近いほど上の順位になるように、乱数で作っています。全員が最後まで順位をつけるわけではなく、上位の1〜2人だけ書く人もいます。実在の選挙のデータではありません。
      </p>
    </main>
  );
}
