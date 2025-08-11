import type { BuildBlocksOptions, FeedItem, LayoutBlock, LayoutType } from "./types";
import { makeRand, PH, takeWithPad } from "./utils";

export function buildBlocks(
  items: FeedItem[],
  {
    seed = 20250810,
    initialOrder = ["L1", "L2", "L3"],
    noConsecutive = true,
    allowed = ["L1", "L2", "L3"],
  }: BuildBlocksOptions = {}
): LayoutBlock[] {
  const rand = makeRand(seed);
  const out: LayoutBlock[] = [];
  let i = 0;
  let last: LayoutType | null = null;
  let finished = false;

  const needCount = (t: LayoutType) => (t === "L1" ? 1 : t === "L2" ? 2 : 4);
  const canExact = (t: LayoutType) =>
    allowed.includes(t) && (i + needCount(t) <= items.length);

  const pushWithPad = (t: LayoutType) => {
    const need = needCount(t);
    const { list, used, padded } = takeWithPad(items, i, need, PH as FeedItem);
    out.push({ key: `${t}-${i}`, type: t, items: list });
    i += used;     // 실제 소비한 실제 아이템만 증가
    last = t;
    if (padded) finished = true; // 부족해서 placeholder 썼으면 여기서 마감
  };

  // 초기 고정 시퀀스
  for (const t of initialOrder) {
    if (finished) break;

    if (canExact(t)) {
      pushWithPad(t);
    } else if (allowed.includes(t) && i < items.length) {
      // 남은 아이템은 있으나 정확히 맞지 않을 때 -> placeholder 채우고 종료
      pushWithPad(t);
    } else if (allowed.includes(t) && items.length === 0) {
      // items가 0일 때는 무리해서 만들지 않음
      break;
    }
  }

  // 이후 랜덤
  while (!finished && i < items.length) {
    let candidates: LayoutType[] = (["L3", "L2", "L1"] as LayoutType[]).filter(canExact);

    if (noConsecutive && last) {
      const filtered = candidates.filter((t) => t !== last);
      if (filtered.length) candidates = filtered;
    }

    // 정확 후보 없으면 아무거나 뽑아 placeholder로 마무리
    let pick: LayoutType;
    if (candidates.length === 0) {
      const anyAllowed = (["L3", "L2", "L1"] as LayoutType[]).filter((t) => allowed.includes(t));
      const pool = noConsecutive && last ? anyAllowed.filter((t) => t !== last) || anyAllowed : anyAllowed;
      pick = pool[Math.floor(rand() * pool.length)];
      pushWithPad(pick);
      break;
    } else {
      pick = candidates[Math.floor(rand() * candidates.length)];
      pushWithPad(pick);
    }
  }

  return out;
}
