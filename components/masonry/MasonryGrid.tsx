// import { FlashList } from "@shopify/flash-list";
// import React, { Fragment, useMemo } from "react";
// import { View } from "react-native";

// import { buildBlocks } from "./blockBuilder";
// import { Tile } from "./layouts";
// import { createMetrics } from "./metrics";
// import type { BuildBlocksOptions, FeedItem, LayoutBlock, LayoutType } from "./types";

// export type MasonryProps = {
//   items: FeedItem[];
//   gap?: number;
//   padding?: number;
//   options?: BuildBlocksOptions;
//   header?: React.ReactElement | null;
//   stickyHeader?: boolean;
//   backgroundColor?: string;
//   onPressItem?: (item: FeedItem) => void;
//   scrollEnabled?: boolean;
// };

// export default function MasonryGrid({
//   items,
//   gap,
//   padding,
//   options,
//   header = null,
//   stickyHeader = false,
//   backgroundColor = "#fff",
//   onPressItem,
//   scrollEnabled = true,
// }: MasonryProps) {
//   const m = useMemo(() => createMetrics({ gap, padding }), [gap, padding]);
//   const blocks = useMemo(() => buildBlocks(items, options), [items, options]);

//   const W = m.widthForCols;
//   const H = m.heightForRows;
//   const G = m.GAP;

//   const renderL2 = (
//     a: FeedItem, b: FeedItem, c: FeedItem,
//     side: "right" | "left", topIsTall: boolean
//   ) => {
//     // A = 3x3 (showInfo), B = 1x2, C = 1x1
//     const rightCol = (
//       <View style={{ width: W(1) }}>
//         <Tile it={topIsTall ? b : c} width={W(1)} height={topIsTall ? H(2) : H(1)} radius={16} onPressItem={onPressItem} showInfo={false}/>
//         <View style={{ height: G }} />
//         <Tile it={topIsTall ? c : b} width={W(1)} height={topIsTall ? H(1) : H(2)} radius={16} onPressItem={onPressItem} showInfo={false}/>
//       </View>
//     );

//     const leftCol = (
//       <View style={{ width: W(1) }}>
//         <Tile it={topIsTall ? b : c} width={W(1)} height={topIsTall ? H(2) : H(1)} radius={16} onPressItem={onPressItem} showInfo={false}/>
//         <View style={{ height: G }} />
//         <Tile it={topIsTall ? c : b} width={W(1)} height={topIsTall ? H(1) : H(2)} radius={16} onPressItem={onPressItem} showInfo={false}/>
//       </View>
//     );

//     return (
//       <View style={{ width: m.TOTAL_W, height: H(3) }}>
//         <View style={{ flexDirection: "row" }}>
//           {side === "left" && leftCol}
//           {side === "left" && <View style={{ width: G }} />}

//           <Tile it={a} width={W(3)} height={H(3)} radius={16} onPressItem={onPressItem} showInfo />

//           {side === "right" && <View style={{ width: G }} />}
//           {side === "right" && rightCol}
//         </View>
//       </View>
//     );
//   };

//   const renderL3 = (
//     a: FeedItem, b: FeedItem,
//     side: "right" | "left"
//   ) => {
//     // A = 3x2 (showInfo), B = 1x2
//     return (
//       <View style={{ width: m.TOTAL_W, height: H(2) }}>
//         <View style={{ flexDirection: "row" }}>
//           {side === "left" ? (
//             <>
//               <Tile it={b} width={W(1)} height={H(2)} radius={16} onPressItem={onPressItem} showInfo={false} />
//               <View style={{ width: G }} />
//               <Tile it={a} width={W(3)} height={H(2)} radius={16} onPressItem={onPressItem} showInfo />
//             </>
//           ) : (
//             <>
//               <Tile it={a} width={W(3)} height={H(2)} radius={16} onPressItem={onPressItem} showInfo />
//               <View style={{ width: G }} />
//               <Tile it={b} width={W(1)} height={H(2)} radius={16} onPressItem={onPressItem} showInfo={false} />
//             </>
//           )}
//         </View>
//       </View>
//     );
//   };

//   const renderBlock = (blk: LayoutBlock) => {
//     const t = blk.type as LayoutType;

//     if (t === "L1") {
//       const width = m.TOTAL_W;
//       const height = m.H2x2 * 2 + m.GAP;
//       return <Tile it={blk.items[0]} width={width} height={height} radius={16} onPressItem={onPressItem} showInfo />;
//     }

//     if (t === "L4") {
//       const [A, B] = blk.items;
//       return (
//         <View style={{ width: m.TOTAL_W, height: H(3) }}>
//           <View style={{ flexDirection: "row" }}>
//             <Tile it={A} width={W(2)} height={H(3)} radius={16} onPressItem={onPressItem} showInfo />
//             <View style={{ width: G }} />
//             <Tile it={B} width={W(2)} height={H(3)} radius={16} onPressItem={onPressItem} showInfo />
//           </View>
//         </View>
//       );
//     }

//     if (t === "L5") {
//       const [A, B] = blk.items;
//       return (
//         <View style={{ width: m.TOTAL_W, height: H(2) }}>
//           <View style={{ flexDirection: "row" }}>
//             <Tile it={A} width={W(2)} height={H(2)} radius={16} onPressItem={onPressItem} showInfo />
//             <View style={{ width: G }} />
//             <Tile it={B} width={W(2)} height={H(2)} radius={16} onPressItem={onPressItem} showInfo />
//           </View>
//         </View>
//       );
//     }

//     // --- L2 변형 ---
//     if (t === "L2" || t.startsWith("L2-")) {
//       const [A, B, C] = blk.items;
//       switch (t) {
//         case "L2":
//         case "L2-1": return renderL2(A, B, C, "right", true);  // 우측, 위 1x2
//         case "L2-2": return renderL2(A, B, C, "right", false); // 우측, 위 1x1
//         case "L2-3": return renderL2(A, B, C, "left", true);   // 좌측, 위 1x2
//         case "L2-4": return renderL2(A, B, C, "left", false);  // 좌측, 위 1x1
//       }
//     }

//     // --- L3 변형 ---
//     if (t === "L3" || t.startsWith("L3-")) {
//       const [A, B] = blk.items;
//       switch (t) {
//         case "L3":
//         case "L3-1": return renderL3(A, B, "right"); // 얇은 컬럼 우측
//         case "L3-2": return renderL3(A, B, "left");  // 얇은 컬럼 좌측
//         case "L3-3": return renderL3(A, B, "right"); // 여유로 4변형 슬롯
//         case "L3-4": return renderL3(A, B, "left");
//       }
//     }

//     return null;
//   };

//   if (scrollEnabled) {
//     return (
//       <FlashList
//         data={blocks}
//         keyExtractor={(it) => it.key}
//         getItemType={(it) => it.type}
//         estimatedItemSize={H(2)}
//         contentContainerStyle={{ padding: m.PADDING, backgroundColor }}
//         ItemSeparatorComponent={() => <View style={{ height: m.GAP }} />}
//         renderItem={({ item }) => renderBlock(item)}
//         ListHeaderComponent={header ?? undefined}
//         stickyHeaderIndices={stickyHeader && header ? [0] : undefined}
//         showsVerticalScrollIndicator={false}
//       />
//     );
//   }

//   return (
//     <View style={{ padding: m.PADDING, backgroundColor }}>
//       {header}
//       {blocks.map((blk, idx) => (
//         <Fragment key={blk.key}>
//           {idx > 0 && <View style={{ height: m.GAP }} />}
//           {renderBlock(blk)}
//         </Fragment>
//       ))}
//     </View>
//   );
// }

import { FlashList } from "@shopify/flash-list";
import React, { Fragment, useMemo } from "react";
import { View } from "react-native";

import { buildBlocks } from "./blockBuilder";
import { Tile } from "./layouts";
import { createMetrics } from "./metrics";
import type { BuildBlocksOptions, FeedItem, LayoutBlock, LayoutType } from "./types";

export type MasonryProps = {
  items: FeedItem[];
  gap?: number;
  padding?: number;
  options?: BuildBlocksOptions;
  header?: React.ReactElement | null;
  footer?: React.ReactElement | null;
  stickyHeader?: boolean;
  backgroundColor?: string;
  onPressItem?: (item: FeedItem) => void;
  scrollEnabled?: boolean;
};

export default function MasonryGrid({
  items,
  gap,
  padding,
  options,
  header = null,
  footer = null,
  stickyHeader = false,
  backgroundColor = "#fff",
  onPressItem,
  scrollEnabled = true,
}: MasonryProps) {
  const m = useMemo(() => createMetrics({ gap, padding }), [gap, padding]);
  const blocks = useMemo(() => buildBlocks(items, options), [items, options]);

  const W = m.widthForCols;
  const H = m.heightForRows;
  const G = m.GAP;

  const renderL2 = (
    a: FeedItem, b: FeedItem, c: FeedItem,
    side: "right" | "left", topIsTall: boolean
  ) => {
    // A = 3x3 (showInfo), B = 1x2, C = 1x1
    const rightCol = (
      <View style={{ width: W(1) }}>
        <Tile it={topIsTall ? b : c} width={W(1)} height={topIsTall ? H(2) : H(1)} radius={16} onPressItem={onPressItem} showInfo={false}/>
        <View style={{ height: G }} />
        <Tile it={topIsTall ? c : b} width={W(1)} height={topIsTall ? H(1) : H(2)} radius={16} onPressItem={onPressItem} showInfo={false}/>
      </View>
    );

    const leftCol = (
      <View style={{ width: W(1) }}>
        <Tile it={topIsTall ? b : c} width={W(1)} height={topIsTall ? H(2) : H(1)} radius={16} onPressItem={onPressItem} showInfo={false}/>
        <View style={{ height: G }} />
        <Tile it={topIsTall ? c : b} width={W(1)} height={topIsTall ? H(1) : H(2)} radius={16} onPressItem={onPressItem} showInfo={false}/>
      </View>
    );

    return (
      <View style={{ width: m.TOTAL_W, height: H(3) }}>
        <View style={{ flexDirection: "row" }}>
          {side === "left" && leftCol}
          {side === "left" && <View style={{ width: G }} />}

          <Tile it={a} width={W(3)} height={H(3)} radius={16} onPressItem={onPressItem} showInfo />

          {side === "right" && <View style={{ width: G }} />}
          {side === "right" && rightCol}
        </View>
      </View>
    );
  };

  const renderL3 = (
    a: FeedItem, b: FeedItem,
    side: "right" | "left"
  ) => {
    // A = 3x2 (showInfo), B = 1x2
    return (
      <View style={{ width: m.TOTAL_W, height: H(2) }}>
        <View style={{ flexDirection: "row" }}>
          {side === "left" ? (
            <>
              <Tile it={b} width={W(1)} height={H(2)} radius={16} onPressItem={onPressItem} showInfo={false} />
              <View style={{ width: G }} />
              <Tile it={a} width={W(3)} height={H(2)} radius={16} onPressItem={onPressItem} showInfo />
            </>
          ) : (
            <>
              <Tile it={a} width={W(3)} height={H(2)} radius={16} onPressItem={onPressItem} showInfo />
              <View style={{ width: G }} />
              <Tile it={b} width={W(1)} height={H(2)} radius={16} onPressItem={onPressItem} showInfo={false} />
            </>
          )}
        </View>
      </View>
    );
  };

  const renderBlock = (blk: LayoutBlock) => {
    const t = blk.type as LayoutType;

    if (t === "L1") {
      const width = m.TOTAL_W;
      const height = m.H2x2 * 2 + m.GAP;
      return <Tile it={blk.items[0]} width={width} height={height} radius={16} onPressItem={onPressItem} showInfo />;
    }

    if (t === "L4") {
      const [A, B] = blk.items;
      return (
        <View style={{ width: m.TOTAL_W, height: H(3) }}>
          <View style={{ flexDirection: "row" }}>
            <Tile it={A} width={W(2)} height={H(3)} radius={16} onPressItem={onPressItem} showInfo />
            <View style={{ width: G }} />
            <Tile it={B} width={W(2)} height={H(3)} radius={16} onPressItem={onPressItem} showInfo />
          </View>
        </View>
      );
    }

    if (t === "L5") {
      const [A, B] = blk.items;
      return (
        <View style={{ width: m.TOTAL_W, height: H(2) }}>
          <View style={{ flexDirection: "row" }}>
            <Tile it={A} width={W(2)} height={H(2)} radius={16} onPressItem={onPressItem} showInfo />
            <View style={{ width: G }} />
            <Tile it={B} width={W(2)} height={H(2)} radius={16} onPressItem={onPressItem} showInfo />
          </View>
        </View>
      );
    }

    // --- L2 변형 ---
    if (t === "L2" || t.startsWith("L2-")) {
      const [A, B, C] = blk.items;
      switch (t) {
        case "L2":
        case "L2-1": return renderL2(A, B, C, "right", true);  // 우측, 위 1x2
        case "L2-2": return renderL2(A, B, C, "right", false); // 우측, 위 1x1
        case "L2-3": return renderL2(A, B, C, "left", true);   // 좌측, 위 1x2
        case "L2-4": return renderL2(A, B, C, "left", false);  // 좌측, 위 1x1
      }
    }

    // --- L3 변형 ---
    if (t === "L3" || t.startsWith("L3-")) {
      const [A, B] = blk.items;
      switch (t) {
        case "L3":
        case "L3-1": return renderL3(A, B, "right"); // 얇은 컬럼 우측
        case "L3-2": return renderL3(A, B, "left");  // 얇은 컬럼 좌측
        case "L3-3": return renderL3(A, B, "right"); // 여유로 4변형 슬롯
        case "L3-4": return renderL3(A, B, "left");
      }
    }

    return null;
  };

  if (scrollEnabled) {
    return (
      <FlashList
        data={blocks}
        keyExtractor={(it) => it.key}
        getItemType={(it) => it.type}
        estimatedItemSize={H(2)}
        contentContainerStyle={{ padding: m.PADDING, backgroundColor }}
        ItemSeparatorComponent={() => <View style={{ height: m.GAP }} />}
        renderItem={({ item }) => renderBlock(item)}
        ListHeaderComponent={header ?? undefined}
        ListFooterComponent={footer ?? undefined}
        stickyHeaderIndices={stickyHeader && header ? [0] : undefined}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <View style={{ padding: m.PADDING, backgroundColor }}>
      {header}
      {blocks.map((blk, idx) => (
        <Fragment key={blk.key}>
          {idx > 0 && <View style={{ height: m.GAP }} />}
          {renderBlock(blk)}
        </Fragment>
      ))}
      {footer}
    </View>
  );
}