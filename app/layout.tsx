// app/feed-grid-pattern.tsx
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import React, { useMemo } from "react";
import { Dimensions, SafeAreaView, StyleSheet, View } from "react-native";

type FeedItem = {
  id: string;
  imageUrl: string;
  dateISO: string;
  place: string;
};

const GAP = 6;
const PADDING = 14;
const W = Dimensions.get("window").width;

// 4칸 그리드 한 칸 크기
const CELL = (W - PADDING * 2 - GAP * 3) / 4;
const TOTAL_W = CELL * 4 + GAP * 3;      // 블록 전체 너비
const H2x2    = CELL * 2 + GAP;          // 2x2 한 변(=높이)

// ---- 데모 데이터 ----
const FEED_ITEMS: FeedItem[] = Array.from({ length: 40 }).map((_, i) => ({
  id: `m${i}`,
  imageUrl: `https://picsum.photos/id/1/900/900`,
  dateISO: `2025-08-${String((i % 28) + 1).padStart(2, "0")}`,
  place: ["서울, 성수동", "부산, 해운대", "제주, 성산"][i % 3],
}));

type LayoutType = "L1" | "L2" | "L3";

// 시드 랜덤
function makeRand(seed = 123456) {
  let s = seed % 2147483647;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

// L1: 4x4(=2x2 전체)
function Layout1({ item }: { item: FeedItem }) {
  return (
    <View style={{ width: TOTAL_W, height: H2x2 * 2 + GAP }}>
      <Image source={{ uri: item.imageUrl }} style={styles.fillBig} contentFit="cover" />
    </View>
  );
}

// L2: 2x2, 2x2
function Layout2({ items }: { items: FeedItem[] }) {
  return (
    <View style={{ width: TOTAL_W, height: H2x2 }}>
      <View style={{ flexDirection: "row", gap: GAP }}>
        {items.map((it) => (
          <Image
            key={it.id}
            source={{ uri: it.imageUrl }}
            style={{ width: H2x2, height: H2x2, borderRadius: 8 }}
            contentFit="cover"
          />
        ))}
      </View>
    </View>
  );
}

// L3: 왼쪽 2x2 = [1x1 + 1x1] + [2x1], 오른쪽 2x2 한 장  (총 4장 사용)
function Layout3({ items }: { items: FeedItem[] }) {
  const [a, b, c, d] = items; // a,b: 위 1x1 두 장, c: 아래 2x1, d: 오른쪽 2x2
  return (
    <View style={{ width: TOTAL_W, height: H2x2 }}>
      <View style={{ flexDirection: "row" }}>
        {/* 왼쪽 2x2 */}
        <View style={{ width: H2x2, height: H2x2 }}>
          {/* 위쪽: 1x1 두 장 */}
          <View style={{ flexDirection: "row", gap: GAP, marginBottom: GAP }}>
            <Image source={{ uri: a.imageUrl }} style={{ width: CELL, height: CELL, borderRadius: 6 }} contentFit="cover" />
            <Image source={{ uri: b.imageUrl }} style={{ width: CELL, height: CELL, borderRadius: 6 }} contentFit="cover" />
          </View>
          {/* 아래쪽: 2x1 */}
          <Image source={{ uri: c.imageUrl }} style={{ width: H2x2, height: CELL, borderRadius: 8 }} contentFit="cover" />
        </View>

        {/* GAP */}
        <View style={{ width: GAP }} />

        {/* 오른쪽 2x2 */}
        <Image source={{ uri: d.imageUrl }} style={{ width: H2x2, height: H2x2, borderRadius: 8 }} contentFit="cover" />
      </View>
    </View>
  );
}

export default function FeedGridPattern() {
  // 1) L1 → L2 → L3 순차, 이후 랜덤(연속 중복 금지, 단 선택지가 하나뿐이면 허용)
  const blocks = useMemo(() => {
    const rand = makeRand(20250810);
    const out: { key: string; type: LayoutType; items: FeedItem[] }[] = [];
    let i = 0;
    let lastType: LayoutType | null = null;

    const push = (type: LayoutType, n: number) => {
      if (!FEED_ITEMS[i + (n - 1)]) return false;
      out.push({ key: `${type}-${i}`, type, items: FEED_ITEMS.slice(i, i + n) });
      i += n;
      lastType = type;
      return true;
    };

    const pushL1 = () => push("L1", 1);
    const pushL2 = () => push("L2", 2);
    const pushL3 = () => push("L3", 4);

    // 순차 3개
    pushL1();
    pushL2();
    pushL3();

    // 이후 랜덤 with no-consecutive
    while (i < FEED_ITEMS.length) {
      const remain = FEED_ITEMS.length - i;
      const candidates: LayoutType[] = [];
      if (remain >= 4) candidates.push("L3");
      if (remain >= 2) candidates.push("L2");
      if (remain >= 1) candidates.push("L1");

      // 직전 타입 제외(가능하면)
      const nonRepeat = candidates.filter((t) => t !== lastType);
      const pool = nonRepeat.length ? nonRepeat : candidates;
      const pick = pool[Math.floor(rand() * pool.length)];

      if (pick === "L3") pushL3();
      else if (pick === "L2") pushL2();
      else pushL1();
    }

    return out;
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F5F7" }}>
      <FlashList
        data={blocks}
        keyExtractor={(it) => it.key}
        getItemType={(it) => it.type}
        estimatedItemSize={H2x2}
        contentContainerStyle={{ padding: PADDING }}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        renderItem={({ item }) => {
          if (item.type === "L1") return <Layout1 item={item.items[0]} />;
          if (item.type === "L2") return <Layout2 items={item.items} />;
          return <Layout3 items={item.items} />;
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fillBig: { width: "100%", height: "100%", borderRadius: 8 },
});
