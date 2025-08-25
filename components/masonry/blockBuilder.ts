import type { BuildBlocksOptions, FeedItem, LayoutBlock, LayoutType } from "./types";
import { makeRand, PH, takeWithPad } from "./utils";

const L2_VARIANTS = ["L2-1","L2-2","L2-3","L2-4"] as const;
const L3_VARIANTS = ["L3-1","L3-2","L3-3","L3-4"] as const;

const expandKind = (k: LayoutType): LayoutType[] => {
  if (k === "L2") return [...L2_VARIANTS];
  if (k === "L3") return [...L3_VARIANTS];
  return [k];
};
const expandList = (list: LayoutType[]) => list.flatMap(expandKind);

// ✅ 베이스 타입(L2-3 → L2)만 뽑기
const baseOf = (t: LayoutType) => (t.split("-")[0]) as LayoutType;

const needCount = (t: LayoutType) => {
  const b = baseOf(t);
  if (b === "L1") return 1;
  if (b === "L2") return 3;
  if (b === "L3") return 2;
  if (b === "L4") return 2;
  if (b === "L5") return 2;
  return 2;
};

export function buildBlocks(
  items: FeedItem[],
  {
    seed = 20250810,
    initialOrder = ["L1", "L2", "L3", "L4", "L5"],
    noConsecutive = true,
    allowed = ["L1", "L2", "L3", "L4", "L5"],
  }: BuildBlocksOptions = {}
): LayoutBlock[] {
  const rand = makeRand(seed);
  const out: LayoutBlock[] = [];
  let i = 0;
  let lastBase: LayoutType | null = null;  // ✅ 마지막 베이스 타입만 기억
  let finished = false;

  const allowedExpanded = expandList(allowed);
  const initialExpanded = expandList(initialOrder);

  const canExact = (t: LayoutType) =>
    allowedExpanded.includes(t) && (i + needCount(t) <= items.length);

  const pushWithPad = (t: LayoutType) => {
    const need = needCount(t);
    const { list, used, padded } = takeWithPad(items, i, need, PH as FeedItem);
    out.push({ key: `${t}-${i}`, type: t, items: list });
    i += used;
    lastBase = baseOf(t);                  // ✅ 갱신
    if (padded) finished = true;
  };

  // 초기 시퀀스
  for (const t0 of initialExpanded) {
    if (finished) break;
    if (noConsecutive && lastBase && baseOf(t0) === lastBase) continue; // ✅ 초기에도 적용
    if (canExact(t0)) pushWithPad(t0);
    else if (allowedExpanded.includes(t0) && i < items.length) { pushWithPad(t0); break; }
  }

  // 이후 랜덤
  while (!finished && i < items.length) {
    let candidates = allowedExpanded.filter(canExact);

    // ✅ 같은 베이스 타입은 제거
    if (noConsecutive && lastBase) {
      const filtered = candidates.filter((t) => baseOf(t) !== lastBase);
      if (filtered.length) candidates = filtered;
    }

    if (!candidates.length) {
      // 아무거나 하나 골라 패딩으로 마감
      const pool = allowedExpanded.filter((t) => baseOf(t) !== lastBase) || allowedExpanded;
      const pick = pool[Math.floor(rand() * pool.length)];
      pushWithPad(pick);
      break;
    }

    const pick = candidates[Math.floor(rand() * candidates.length)];
    pushWithPad(pick);
  }

  return out;
}
