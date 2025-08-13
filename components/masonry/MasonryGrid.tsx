import { FlashList } from "@shopify/flash-list";
import React, { Fragment, useMemo } from "react";
import { View } from "react-native";

import { buildBlocks } from "./blockBuilder";
import { Tile } from "./layouts";
import { createMetrics } from "./metrics";
import type { BuildBlocksOptions, FeedItem, LayoutBlock } from "./types";

export type MasonryProps = {
  items: FeedItem[];
  gap?: number;
  padding?: number;
  options?: BuildBlocksOptions;
  header?: React.ReactElement | null;
  stickyHeader?: boolean;
  backgroundColor?: string;
  onPressItem?: (item: FeedItem) => void;
  /** ✅ 추가: 외부 스크롤을 쓸 땐 false */
  scrollEnabled?: boolean;
};

export default function MasonryGrid({
  items,
  gap,
  padding,
  options,
  header = null,
  stickyHeader = false,
  backgroundColor = "#fff",
  onPressItem,
  scrollEnabled = true, // ✅ 기본값 true
}: MasonryProps) {
  const m = useMemo(() => createMetrics({ gap, padding }), [gap, padding]);
  const blocks = useMemo(() => buildBlocks(items, options), [items, options]);

  // 공통 블록 렌더러 (FlashList/비가상화 공용)
  const renderBlock = (item: LayoutBlock) => {
    if (item.type === "L1") {
      const W = m.TOTAL_W;
      const H = m.H2x2 * 2 + m.GAP;
      return <Tile it={item.items[0]} width={W} height={H} radius={0} onPressItem={onPressItem} />;
    }

    if (item.type === "L2") {
      const size = m.H2x2;
      return (
        <View style={{ width: m.TOTAL_W, height: m.H2x2 }}>
          <View style={{ flexDirection: "row", gap: m.GAP }}>
            {item.items.map((it, idx) => (
              <Tile
                key={(it && it.id) || `ph-${idx}`}
                it={it}
                width={size}
                height={size}
                radius={0}
                onPressItem={onPressItem}
              />
            ))}
          </View>
        </View>
      );
    }

    // L3
    const [a, b, c, d] = item.items;
    return (
      <View style={{ width: m.TOTAL_W, height: m.H2x2 }}>
        <View style={{ flexDirection: "row" }}>
          <View style={{ width: m.H2x2, height: m.H2x2 }}>
            <View style={{ flexDirection: "row", gap: m.GAP, marginBottom: m.GAP }}>
              <Tile it={a} width={m.CELL} height={m.CELL} radius={0} onPressItem={onPressItem} />
              <Tile it={b} width={m.CELL} height={m.CELL} radius={0} onPressItem={onPressItem} />
            </View>
            <Tile it={c} width={m.H2x2} height={m.CELL} radius={0} onPressItem={onPressItem} />
          </View>

          <View style={{ width: m.GAP }} />
          <Tile it={d} width={m.H2x2} height={m.H2x2} radius={0} onPressItem={onPressItem} />
        </View>
      </View>
    );
  };

  // ✅ 1) 내부가 스크롤 주체 — 기존 FlashList 경로
  if (scrollEnabled) {
    return (
      <FlashList
        data={blocks}
        keyExtractor={(it) => it.key}
        getItemType={(it) => it.type}
        estimatedItemSize={m.H2x2}
        contentContainerStyle={{ padding: m.PADDING, backgroundColor }}
        ItemSeparatorComponent={() => <View style={{ height: m.GAP }} />}
        renderItem={({ item }) => renderBlock(item)}
        ListHeaderComponent={header ?? undefined}
        stickyHeaderIndices={stickyHeader && header ? [0] : undefined}
        showsVerticalScrollIndicator={false}
        // scrollEnabled 기본 true
      />
    );
  }

  // ✅ 2) 외부가 스크롤 주체 — 비가상화 View 렌더 (ScrollView 안에 넣어 쓰기)
  return (
    <View style={{ padding: m.PADDING, backgroundColor }}>
      {header}
      {blocks.map((blk, idx) => (
        <Fragment key={blk.key}>
          {idx > 0 && <View style={{ height: m.GAP }} />}
          {renderBlock(blk)}
        </Fragment>
      ))}
    </View>
  );
}
