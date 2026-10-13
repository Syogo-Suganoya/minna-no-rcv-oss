"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Shuffle } from "@phosphor-icons/react";
import { updateOptionDisplayAction } from "@/app/actions";

type Option = { id: string; label: string };

/**
 * 管理ページ「候補の表示順」。受付中に、投票画面での候補の並びを変える。
 *
 * - ランダム表示（既定）: 投票者ごとに違う順で見せる（順序効果を避ける）
 * - 固定表示: 全員にこの一覧の順で見せる。↑↓ で並べ替える
 *
 * 表示順は集計に影響しない（tallyRcv のくじ順は poll_id のハッシュで決まる）ので、
 * 票が入ったあとでも変えてよい。管理ページは 15 秒ごとに refresh されるが、編集中の
 * 並びは初期値だけ props から取り、以降はこのコンポーネントの state を正とする。
 */
export function OptionOrderEditor({
  slug,
  adminKey,
  options,
  shuffleOptions,
}: {
  slug: string;
  adminKey: string;
  options: Option[];
  shuffleOptions: boolean;
}) {
  const [items, setItems] = useState(options);
  const [shuffle, setShuffle] = useState(shuffleOptions);
  const [saved, setSaved] = useState({ ids: options.map((o) => o.id), shuffle: shuffleOptions });
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty =
    shuffle !== saved.shuffle || items.some((o, i) => o.id !== saved.ids[i]);

  function move(i: number, delta: -1 | 1) {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    setMessage(null);
    setItems((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function save() {
    const ids = items.map((o) => o.id);
    startTransition(async () => {
      const res = await updateOptionDisplayAction(slug, adminKey, ids, shuffle);
      if (res?.error) {
        setMessage({ kind: "error", text: res.error });
        return;
      }
      setSaved({ ids, shuffle });
      setMessage({ kind: "ok", text: "保存しました。投票ページを開き直すと反映されます。" });
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-tm-border-soft bg-white p-4">
      <b className="text-[14px] tracking-[0.04em]">候補の表示順</b>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={shuffle}
          onChange={(e) => {
            setMessage(null);
            setShuffle(e.target.checked);
          }}
          className="mt-1 h-4.5 w-4.5 accent-[var(--tm-teal)]"
        />
        <span className="flex flex-col gap-0.5">
          <b className="inline-flex items-center gap-1.5 text-[13.5px]">
            <Shuffle size={15} className="text-tm-teal-hover" />
            人ごとにランダムな順で表示する
          </b>
          <span className="text-[12.5px] leading-[1.7] text-tm-fg-muted">
            {shuffle
              ? "投票者ごとに違う並びで表示します（同じ人には毎回同じ並び）。下の順番は使われません。"
              : "全員に下の順番で表示します。上にある候補ほど選ばれやすくなる点に注意してください。"}
          </span>
        </span>
      </label>

      <ol className={`m-0 flex list-none flex-col gap-1.5 p-0 ${shuffle ? "opacity-50" : ""}`}>
        {items.map((o, i) => (
          <li
            key={o.id}
            className="flex items-center gap-2 rounded-[10px] border border-tm-gray-150 bg-tm-gray-50 px-3 py-2"
          >
            <span className="w-5 flex-none text-center font-[family-name:var(--tm-font-latin)] text-[12px] font-bold text-tm-gray-500">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 break-words text-[13.5px] font-bold">{o.label}</span>
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={shuffle || i === 0}
              aria-label={`${o.label}を上へ`}
              className="grid h-8 w-8 flex-none place-items-center rounded-full border border-tm-gray-250 bg-white text-tm-gray-600 transition-colors hover:bg-tm-teal-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowUp size={14} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={shuffle || i === items.length - 1}
              aria-label={`${o.label}を下へ`}
              className="grid h-8 w-8 flex-none place-items-center rounded-full border border-tm-gray-250 bg-white text-tm-gray-600 transition-colors hover:bg-tm-teal-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowDown size={14} weight="bold" />
            </button>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="inline-flex items-center gap-1.5 rounded-full bg-tm-teal px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-tm-teal-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "保存中…" : "表示順を保存する"}
        </button>
        {message && (
          <span
            role="status"
            className={`inline-flex items-center gap-1 text-[12.5px] ${
              message.kind === "ok" ? "text-tm-teal-deep" : "text-tm-red"
            }`}
          >
            {message.kind === "ok" && <Check size={13} weight="bold" />}
            {message.text}
          </span>
        )}
      </div>
      <span className="text-[12px] leading-[1.7] text-tm-fg-muted">
        表示順を変えても、すでに入った票や集計結果は変わりません。
      </span>
    </div>
  );
}
