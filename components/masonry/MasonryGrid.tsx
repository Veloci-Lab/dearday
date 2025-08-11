// MasonryGrid.tsx (변경된 부분만 발췌)
type MasonryProps = {
  items: FeedItem[];
  gap?: number;
  padding?: number;
  options?: BuildBlocksOptions;
  header?: React.ReactElement | null;
  stickyHeader?: boolean;
  backgroundColor?: string;
  onPressItem?: (item: FeedItem) => void; // ✅ 유지
};

export default function MasonryGrid({
  items,
  gap,
  padding,
  options,
  header = null,
  stickyHeader = false,
  backgroundColor = "#F3F5F7",
  onPressItem, // ✅ 유지
}: MasonryProps) {
  // ...
  const render = ({ item }: { item: LayoutBlock }) => {
    if (item.type === "L1") {
      const W = m.TOTAL_W;
      const H = m.H2x2 * 2 + m.GAP;
      return <Tile it={item.items[0]} width={W} height={H} radius={8} onPressItem={onPressItem} />;
    }

    if (item.type === "L2") {
      const size = m.H2x2;
      return (
        <View style={{ width: m.TOTAL_W, height: m.H2x2 }}>
          <View style={{ flexDirection: "row", gap: m.GAP }}>
            {item.items.map((it, idx) => (
              <Tile
                key={it.id || `ph-${idx}`}
                it={it}
                width={size}
                height={size}
                radius={8}
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
              <Tile it={a} width={m.CELL} height={m.CELL} radius={6} onPressItem={onPressItem} />
              <Tile it={b} width={m.CELL} height={m.CELL} radius={6} onPressItem={onPressItem} />
            </View>
            <Tile it={c} width={m.H2x2} height={m.CELL} radius={8} onPressItem={onPressItem} />
          </View>
          <View style={{ width: m.GAP }} />
          <Tile it={d} width={m.H2x2} height={m.H2x2} radius={8} onPressItem={onPressItem} />
        </View>
      </View>
    );
  };
  // ...
}
