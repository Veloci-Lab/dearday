import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import React, { useMemo } from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";

/* =========================
 * Types
 * ========================= */
export type FeedItem = {
  id: string;
  imageUrl: string;
  dateISO: string;
  place: string;
};

type LayoutType = "L1" | "L2" | "L3";

type LayoutBlock = {
  key: string;
  type: LayoutType;
  items: FeedItem[]; // 항상 필요 개수로 패딩 (placeholder 포함)
};

type BuildBlocksOptions = {
  seed?: number;
  initialOrder?: LayoutType[]; // ex) ["L1","L2","L3"]
  noConsecutive?: boolean;     // 연속 동일 타입 금지
  allowed?: LayoutType[];      // 허용 레이아웃 집합
};

type MasonryProps = {
  items: FeedItem[];
  gap?: number;                 // 칸 사이 간격
  padding?: number;             // 리스트 패딩
  options?: BuildBlocksOptions; // 배치 옵션
  header?: React.ReactElement | null;
  stickyHeader?: boolean;
  backgroundColor?: string;

  /** 아이템을 눌렀을 때 호출 (shouldLink가 true인 경우에만 동작) */
  onPressItem?: (item: FeedItem) => void;
  /** 아이템별로 링크(터치) 허용 여부 결정. 기본값: 모두 true */
  shouldLink?: (item: FeedItem) => boolean;
};

/* =========================
 * Metrics
 * ========================= */
function createMetrics({
  gap = 6,
  padding = 14,
  screenW = Dimensions.get("window").width,
} = {}) {
  const CELL = (screenW - padding * 2 - gap * 3) / 4; // 4칸 그리드 1칸
  const TOTAL_W = CELL * 4 + gap * 3;                 // 블록 전체 너비
  const H2x2 = CELL * 2 + gap;                        // 2x2 한 변(=높이)
  return { GAP: gap, PADDING: padding, CELL, TOTAL_W, H2x2 };
}

/* =========================
 * Utils
 * ========================= */
function makeRand(seed = 123456) {
  let s = seed % 2147483647;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

const PLACEHOLDER_ID = "__ph__";
const PH: FeedItem = { id: PLACEHOLDER_ID, imageUrl: "", dateISO: "", place: "" };
const isPH = (it?: FeedItem) => !it || it.id === PLACEHOLDER_ID;

/* 필요한 개수만큼 slice + placeholder 패딩 */
function takeWithPad<T>(arr: T[], start: number, need: number, pad: T): { list: T[]; used: number; padded: boolean } {
  const slice = arr.slice(start, start + need);
  const used = Math.min(need, Math.max(0, arr.length - start));
  const padded = slice.length < need;
  while (slice.length < need) slice.push(pad);
  return { list: slice, used, padded };
}

/* =========================
 * Block Builder
 * ========================= */
function buildBlocks(
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

  // 1) 초기 고정 시퀀스
  for (const t of initialOrder) {
    if (finished) break;

    if (canExact(t)) {
      pushWithPad(t);
    } else if (allowed.includes(t) && i < items.length) {
      // 남은 아이템은 있으나 정확히 맞지는 않을 때 -> placeholder로 채우고 종료
      pushWithPad(t);
    } else if (allowed.includes(t) && items.length === 0) {
      // items 자체가 0인데 초기 시퀀스를 억지로 만들 필요는 없음 -> 스킵
      break;
    }
  }

  // 2) 이후 랜덤
  while (!finished && i < items.length) {
    // 정확히 맞는 후보 우선
    let candidates: LayoutType[] = (["L3", "L2", "L1"] as LayoutType[]).filter(canExact);

    // 연속 금지
    if (noConsecutive && last) {
      const filtered = candidates.filter((t) => t !== last);
      if (filtered.length) candidates = filtered;
    }

    // 정확히 맞는 후보가 없으면 아무거나 하나 뽑아서 마지막 블록을 placeholder로 채우고 종료
    let pick: LayoutType;
    if (candidates.length === 0) {
      const anyAllowed = (["L3", "L2", "L1"] as LayoutType[]).filter((t) => allowed.includes(t));
      const pool = noConsecutive && last ? anyAllowed.filter((t) => t !== last) || anyAllowed : anyAllowed;
      pick = pool[Math.floor(rand() * pool.length)];
      pushWithPad(pick); // placeholder가 들어가며 finished=true
      break;
    } else {
      pick = candidates[Math.floor(rand() * candidates.length)];
      pushWithPad(pick);
    }
  }

  return out;
}

/* =========================
 * Presentation helpers
 * ========================= */
function PlaceholderBox({
  width,
  height,
  radius,
}: {
  width: number;
  height: number;
  radius: number;
}) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        // 완전 빈 공간처럼 보이도록 투명
        backgroundColor: "transparent",
      }}
    />
  );
}

/** 공통 타일: placeholder면 비활성, 아니면 shouldLink + onPressItem 조건에 따라 Pressable */
function Tile({
  it,
  width,
  height,
  radius,
  onPressItem,
  shouldLink,
}: {
  it: FeedItem;
  width: number;
  height: number;
  radius: number;
  onPressItem?: (item: FeedItem) => void;
  shouldLink?: (item: FeedItem) => boolean;
}) {
  if (isPH(it)) {
    return <PlaceholderBox width={width} height={height} radius={radius} />;
  }

  const pressable = !!onPressItem && (shouldLink ? shouldLink(it) : true);

  const content = (
    <Image
      source={{ uri: it.imageUrl }}
      style={{ width, height, borderRadius: radius }}
      contentFit="cover"
    />
  );

  if (!pressable) return content;

  return (
    <Pressable
      onPress={() => onPressItem?.(it)}
      accessibilityRole="button"
      style={{ width, height, borderRadius: radius, overflow: "hidden" }}
      android_ripple={{}}
    >
      {content}
    </Pressable>
  );
}

/* =========================
 * Layout Components
 * ========================= */
// L1: 전체(4x4 = 2x2 전체)
function L1({
  item,
  m,
  onPressItem,
  shouldLink,
}: {
  item: FeedItem;
  m: ReturnType<typeof createMetrics>;
  onPressItem?: (item: FeedItem) => void;
  shouldLink?: (item: FeedItem) => boolean;
}) {
  const W = m.TOTAL_W;
  const H = m.H2x2 * 2 + m.GAP;
  return (
    <Tile it={item} width={W} height={H} radius={8} onPressItem={onPressItem} shouldLink={shouldLink} />
  );
}

// L2: 2x2, 2x2
function L2({
  items,
  m,
  onPressItem,
  shouldLink,
}: {
  items: FeedItem[];
  m: ReturnType<typeof createMetrics>;
  onPressItem?: (item: FeedItem) => void;
  shouldLink?: (item: FeedItem) => boolean;
}) {
  const size = m.H2x2;
  return (
    <View style={{ width: m.TOTAL_W, height: m.H2x2 }}>
      <View style={{ flexDirection: "row", gap: m.GAP }}>
        {items.map((it, idx) => (
          <Tile
            key={isPH(it) ? `ph-${idx}` : it.id}
            it={it}
            width={size}
            height={size}
            radius={8}
            onPressItem={onPressItem}
            shouldLink={shouldLink}
          />
        ))}
      </View>
    </View>
  );
}

// L3: 왼쪽(위 1x1+1x1, 아래 2x1) + 오른쪽 2x2
function L3({
  items,
  m,
  onPressItem,
  shouldLink,
}: {
  items: FeedItem[];
  m: ReturnType<typeof createMetrics>;
  onPressItem?: (item: FeedItem) => void;
  shouldLink?: (item: FeedItem) => boolean;
}) {
  const [a, b, c, d] = items;
  return (
    <View style={{ width: m.TOTAL_W, height: m.H2x2 }}>
      <View style={{ flexDirection: "row" }}>
        {/* 왼쪽 2x2 */}
        <View style={{ width: m.H2x2, height: m.H2x2 }}>
          {/* 위: 1x1 두 장 */}
          <View style={{ flexDirection: "row", gap: m.GAP, marginBottom: m.GAP }}>
            <Tile it={a} width={m.CELL} height={m.CELL} radius={6} onPressItem={onPressItem} shouldLink={shouldLink} />
            <Tile it={b} width={m.CELL} height={m.CELL} radius={6} onPressItem={onPressItem} shouldLink={shouldLink} />
          </View>
          {/* 아래: 2x1 한 장 */}
          <Tile it={c} width={m.H2x2} height={m.CELL} radius={8} onPressItem={onPressItem} shouldLink={shouldLink} />
        </View>

        {/* GAP */}
        <View style={{ width: m.GAP }} />

        {/* 오른쪽 2x2 한 장 */}
        <Tile it={d} width={m.H2x2} height={m.H2x2} radius={8} onPressItem={onPressItem} shouldLink={shouldLink} />
      </View>
    </View>
  );
}

/* =========================
 * MasonryGrid (Single-file)
 * ========================= */
export default function MasonryGrid({
  items,
  gap,
  padding,
  options,
  header = null,
  stickyHeader = false,
  backgroundColor = "#F3F5F7",
  onPressItem,
  shouldLink,
}: MasonryProps) {
  const m = useMemo(() => createMetrics({ gap, padding }), [gap, padding]);
  const blocks = useMemo(() => buildBlocks(items, options), [items, options]);

  const render = ({ item }: { item: LayoutBlock }) => {
    if (item.type === "L1")
      return <L1 item={item.items[0]} m={m} onPressItem={onPressItem} shouldLink={shouldLink} />;
    if (item.type === "L2")
      return <L2 items={item.items} m={m} onPressItem={onPressItem} shouldLink={shouldLink} />;
    return <L3 items={item.items} m={m} onPressItem={onPressItem} shouldLink={shouldLink} />;
  };

  return (
    <FlashList
      data={blocks}
      keyExtractor={(it) => it.key}
      getItemType={(it) => it.type}
      estimatedItemSize={m.H2x2}
      contentContainerStyle={{ padding: m.PADDING, backgroundColor }}
      ItemSeparatorComponent={() => <View style={{ height: m.GAP }} />}
      renderItem={render}
      ListHeaderComponent={header ?? undefined}
      stickyHeaderIndices={stickyHeader && header ? [0] : undefined}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  fillBig: { width: "100%", height: "100%", borderRadius: 8 },
});
