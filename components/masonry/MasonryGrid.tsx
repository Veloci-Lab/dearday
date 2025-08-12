import { FlashList } from "@shopify/flash-list";
import React, { useMemo } from "react";
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
};

export default function MasonryGrid({
  items,
  gap,
  padding,
  options,
  header = null,
  stickyHeader = false,
  backgroundColor = "#F3F5F7",
  onPressItem,
}: MasonryProps) {
  const m = useMemo(() => createMetrics({ gap, padding }), [gap, padding]);
  const blocks = useMemo(() => buildBlocks(items, options), [items, options]);

  const render = ({ item }: { item: LayoutBlock }) => {
    if (item.type === "L1") {
      // 4x4 전체 (2x2 두 줄)
      const W = m.TOTAL_W;
      const H = m.H2x2 * 2 + m.GAP;
      return (
        <Tile it={item.items[0]} width={W} height={H} radius={0} onPressItem={onPressItem} />
      );
    }

    if (item.type === "L2") {
      // 2x2, 2x2
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

    // L3: (왼쪽: 1x1+1x1, 아래 2x1) + (오른쪽: 2x2)
    const [a, b, c, d] = item.items;
    return (
      <View style={{ width: m.TOTAL_W, height: m.H2x2 }}>
        <View style={{ flexDirection: "row" }}>
          {/* 왼쪽 2x2 */}
          <View style={{ width: m.H2x2, height: m.H2x2 }}>
            {/* 위: 1x1 두 장 */}
            <View style={{ flexDirection: "row", gap: m.GAP, marginBottom: m.GAP }}>
              <Tile it={a} width={m.CELL} height={m.CELL} radius={0} onPressItem={onPressItem} />
              <Tile it={b} width={m.CELL} height={m.CELL} radius={0} onPressItem={onPressItem} />
            </View>
            {/* 아래: 2x1 한 장 */}
            <Tile it={c} width={m.H2x2} height={m.CELL} radius={0} onPressItem={onPressItem} />
          </View>

          {/* GAP */}
          <View style={{ width: m.GAP }} />

          {/* 오른쪽 2x2 한 장 */}
          <Tile it={d} width={m.H2x2} height={m.H2x2} radius={0} onPressItem={onPressItem} />
        </View>
      </View>
    );
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
