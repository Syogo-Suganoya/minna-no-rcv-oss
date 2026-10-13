-- 候補の表示順（shuffle_options と reorder_poll_options）
--
-- 全員が同じ並びで候補を見ると、先頭ほど選ばれやすい「順序効果」で結果が偏りうる。
-- shuffle_options = true の poll は、投票画面で候補を投票者ごとにランダムな順で見せる
-- （並びはブラウザごとに固定。アプリ側の src/features/rcv/shuffle.ts）。
--
-- default false にしているのは expand / contract のため（docs/migrations.md）。
-- 既存の poll と、デプロイ中に古いアプリが作る poll は「作成順のまま」になり、挙動が
-- 変わらない。新しいアプリは作成フォームの選択（既定はランダム）を明示的に渡す。
--
-- 表示順は集計に影響しない。tallyRcv のくじ順は lotSeed（poll_id）のハッシュで決まり、
-- 候補の並び（sort_order）には依存しないので、公開後に並べ替えても勝者は変わらない。
alter table poll add column shuffle_options boolean not null default false;

-- ── reorder_poll_options: 公開後に表示順（sort_order）を並べ替える ──────────────
-- p_option_ids はこの poll の候補 id を「過不足なく・重複なく」並べたもの。1 つでも
-- 違えば何もせず false を返す（候補の追加・削除にはこの関数を使わせない）。
-- 1 tx で全行を更新するので、途中の半端な並びが読まれることはない。
create or replace function reorder_poll_options(
  p_poll_id    uuid,
  p_option_ids uuid[]
) returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_given    int := coalesce(cardinality(p_option_ids), 0);
  v_distinct int;
  v_existing int;
  v_matched  int;
begin
  select count(distinct e) into v_distinct from unnest(p_option_ids) as e;
  select count(*) into v_existing from poll_option where poll_id = p_poll_id;
  select count(*) into v_matched
    from poll_option
   where poll_id = p_poll_id
     and id = any(p_option_ids);

  if v_given = 0 or v_distinct <> v_given
     or v_existing <> v_given or v_matched <> v_given then
    return false;
  end if;

  update poll_option o
     set sort_order = t.ord - 1
    from unnest(p_option_ids) with ordinality as t(id, ord)
   where o.poll_id = p_poll_id
     and o.id = t.id;

  return true;
end;
$$;

-- ── 権限: service_role だけが実行できる（フル BFF）──────────────────────────
revoke all on function reorder_poll_options(uuid, uuid[]) from public;
grant execute on function reorder_poll_options(uuid, uuid[]) to service_role;
