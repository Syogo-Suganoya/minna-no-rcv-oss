import { CheckCircle, Equals, Warning } from "@phosphor-icons/react/dist/ssr";

/**
 * トップページ「RCV で目指していること」。
 *
 * Why RCV? の卒業旅行は RCV が効くケースだけを見せるので、使った人から
 * 「何のためにやるのか」「候補2人なら意味がないのでは」「デメリットは？」という
 * 声が出た（#22）。目指す姿を一言で示したうえで、効く場面・多数決と変わらない場面・
 * 弱点を並べて、過大評価も過小評価もされないようにする。
 */

type Item = { title: string; body: string };

const FITS: Item[] = [
  {
    title: "候補が3つ以上あって、似た候補に票が割れそうなとき",
    body: "似た案どうしで1位票を食い合っても、除外された案の票が次の希望へ移るので、支持の厚い方向性が負けにくい。",
  },
  {
    title: "「どうせ勝てないから」と本命以外に入れたくなるとき",
    body: "本命が敗退しても票は次の順位に移るので、気をつかわずに本当の1位から並べられる（戦略投票を減らせる）。",
  },
  {
    title: "結果に反映されない票（死票）を減らしたいとき",
    body: "1位に入れた案が負けても、2位・3位の希望が決着に使われる。",
  },
];

const SAME: Item[] = [
  {
    title: "候補が2つだけのとき",
    body: "移す先の候補がないので、ふつうの多数決と必ず同じ結果になる。",
  },
  {
    title: "1位票だけで過半数を取る候補がいるとき",
    body: "最初の集計で決まるので、結果は多数決と同じ。",
  },
];

const CAVEATS: Item[] = [
  {
    title: "集計の流れがわかりにくい",
    body: "なぜその結果になったかが一目では伝わらない。このアプリでは、除外と票の移動をラウンドごとに再生して見せている。",
  },
  {
    title: "順位をつけるのは、1つ選ぶより手間がかかる",
    body: "候補が多いと迷いやすい。全部に順位をつける必要はなく、希望する候補だけで投票できる。",
  },
  {
    title: "「過半数」は最後まで残った票の過半数",
    body: "下位まで順位をつけていない票は途中で数えられなくなる（順位切れ）。そのぶん、全投票者の過半数より少ない票で決まることがある。",
  },
];

function Group({
  icon,
  heading,
  items,
  tone,
}: {
  icon: React.ReactNode;
  heading: string;
  items: Item[];
  tone: "teal" | "gray" | "warn";
}) {
  const box =
    tone === "teal"
      ? "border-[1.5px] border-tm-teal bg-white"
      : tone === "gray"
        ? "border border-tm-gray-150 bg-tm-gray-50"
        : "border border-tm-gray-150 bg-white";
  return (
    <div className={`rounded-xl p-4 ${box}`}>
      <div className="mb-2.5 flex items-center gap-2">
        {icon}
        <span className="font-[family-name:var(--tm-font-jp-display)] text-[14px] font-black">
          {heading}
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {items.map((it) => (
          <li key={it.title} className="flex flex-col gap-0.5">
            <b className="text-[12.5px] leading-[1.6]">{it.title}</b>
            <span className="text-[12px] leading-[1.75] text-tm-gray-600">{it.body}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RcvFitGuide() {
  return (
    <section className="bg-white px-6 pb-10">
      <div className="mb-1.5 font-[family-name:var(--tm-font-latin)] text-[12px] font-semibold tracking-[0.12em] text-tm-teal-hover">
        What we aim for
      </div>
      <h2 className="m-0 font-[family-name:var(--tm-font-jp-display)] text-[22px] font-black leading-[1.5] tracking-[0.04em]">
        RCV で目指していること
      </h2>
      <p className="mb-[22px] mt-2.5 text-[13px] leading-[1.9] text-tm-gray-600">
        声の大きな一部だけで決まるのではなく、
        <b>「みんなの2番目に良い案」が消えずに残る</b>
        決め方。一人ひとりの「これなら納得できる」をできるだけ拾って、結果に反映させることを目指しています。
        ただし、どんな場面でも多数決より良くなるわけではありません。
      </p>

      <div className="flex flex-col gap-3">
        <Group
          tone="teal"
          icon={<CheckCircle size={18} weight="fill" className="flex-none text-tm-teal" />}
          heading="RCV が効く場面"
          items={FITS}
        />
        <Group
          tone="gray"
          icon={<Equals size={18} weight="bold" className="flex-none text-tm-gray-500" />}
          heading="多数決と結果が変わらない場面"
          items={SAME}
        />
        <Group
          tone="warn"
          icon={<Warning size={18} weight="fill" className="flex-none text-tm-gray-500" />}
          heading="知っておきたい弱点"
          items={CAVEATS}
        />
      </div>
    </section>
  );
}
