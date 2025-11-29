// components/HomePhotoGrid.tsx
import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, Text, View } from "react-native";
import HomePhotoCard from "./HomePhotoCard";

const GAP = 5;
const PADDING = 14;

/* =========================
 * Types
 * ========================= */
type LayoutType = "L1" | "L2" | "L3";

export type PhotoCategory = "추억" | "일상" | "여행" | "공부" | "기타";

export type HomePhoto = {
  id: string;
  categoryId?: string;
  category?: PhotoCategory;
  imageUrl: string;
  memo?: string;
  isRecorded: boolean;
  createdAt: string;
};

type Metrics = {
  CELL: number;
  TOTAL_W: number;
  H2x2: number;
};

type LayoutBlock = {
  key: string;
  type: LayoutType;
  items: (HomePhoto | null)[];
};

type BuildBlocksOptions = {
  seed?: number;
  initialOrder?: LayoutType[];
  noConsecutive?: boolean;
  allowed?: LayoutType[];
};

/* =========================
 * Metrics
 * ========================= */
function createMetrics(): Metrics {
  const screenW = Dimensions.get("window").width;
  const CELL = (screenW - PADDING * 2 - GAP * 3) / 4;
  const TOTAL_W = CELL * 4 + GAP * 3;
  const H2x2 = CELL * 2 + GAP;
  return { CELL, TOTAL_W, H2x2 };
}

/* =========================
 * Utils
 * ========================= */
function makeRand(seed = 123456) {
  let s = seed % 2147483647;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

function takeWithPad<T>(
  arr: T[],
  start: number,
  need: number,
  pad: T
): { list: T[]; used: number; padded: boolean } {
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
  items: HomePhoto[],
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
    allowed.includes(t) && i + needCount(t) <= items.length;

  const pushWithPad = (t: LayoutType) => {
    const need = needCount(t);
    const { list, used, padded } = takeWithPad(
      items,
      i,
      need,
      null as HomePhoto | null
    );
    out.push({ key: `${t}-${i}`, type: t, items: list });
    i += used;
    last = t;
    if (padded) finished = true;
  };

  for (const t of initialOrder) {
    if (finished) break;
    if (canExact(t)) {
      pushWithPad(t);
    } else if (allowed.includes(t) && i < items.length) {
      pushWithPad(t);
    } else if (allowed.includes(t) && items.length === 0) {
      break;
    }
  }

  while (!finished && i < items.length) {
    let candidates: LayoutType[] = (["L3", "L2", "L1"] as LayoutType[]).filter(
      canExact
    );

    if (noConsecutive && last) {
      const filtered = candidates.filter((t) => t !== last);
      if (filtered.length) candidates = filtered;
    }

    let pick: LayoutType;
    if (candidates.length === 0) {
      const anyAllowed = (["L3", "L2", "L1"] as LayoutType[]).filter((t) =>
        allowed.includes(t)
      );
      const pool =
        noConsecutive && last
          ? anyAllowed.filter((t) => t !== last) || anyAllowed
          : anyAllowed;
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

/* =========================
 * Layout Components
 * ========================= */
type L1Props = {
  item: HomePhoto | null;
  m: Metrics;
  onPressPhoto: (photo: HomePhoto) => void;
};

function L1({ item, m, onPressPhoto }: L1Props) {
  return (
    <HomePhotoCard
      photo={item}
      width={m.TOTAL_W}
      height={m.H2x2 * 2 + GAP}
      radius={12}
      onPress={item ? () => onPressPhoto(item) : undefined}
    />
  );
}

type L2Props = {
  items: (HomePhoto | null)[];
  m: Metrics;
  onPressPhoto: (photo: HomePhoto) => void;
};

function L2({ items, m, onPressPhoto }: L2Props) {
  return (
    <View style={{ flexDirection: "row", gap: GAP, height: m.H2x2 }}>
      {items.map((it, idx: number) => (
        <HomePhotoCard
          key={it?.id ?? `ph-${idx}`}
          photo={it}
          width={m.H2x2}
          height={m.H2x2}
          radius={12}
          onPress={it ? () => onPressPhoto(it) : undefined}
        />
      ))}
    </View>
  );
}

type L3Props = {
  items: (HomePhoto | null)[];
  m: Metrics;
  onPressPhoto: (photo: HomePhoto) => void;
};

function L3({ items, m, onPressPhoto }: L3Props) {
  const [a, b, c, d] = items;
  return (
    <View style={{ flexDirection: "row" }}>
      <View style={{ width: m.H2x2, height: m.H2x2 }}>
        <View style={{ flexDirection: "row", gap: GAP, marginBottom: GAP }}>
          <HomePhotoCard
            photo={a}
            width={m.CELL}
            height={m.CELL}
            radius={10}
            onPress={a ? () => onPressPhoto(a) : undefined}
          />
          <HomePhotoCard
            photo={b}
            width={m.CELL}
            height={m.CELL}
            radius={10}
            onPress={b ? () => onPressPhoto(b) : undefined}
          />
        </View>
        <HomePhotoCard
          photo={c}
          width={m.H2x2}
          height={m.CELL}
          radius={12}
          onPress={c ? () => onPressPhoto(c) : undefined}
        />
      </View>

      <View style={{ width: GAP }} />

      <HomePhotoCard
        photo={d}
        width={m.H2x2}
        height={m.H2x2}
        radius={12}
        onPress={d ? () => onPressPhoto(d) : undefined}
      />
    </View>
  );
}

/* =========================
 * Grid Component
 * ========================= */
export default function HomePhotoGrid() {
  const router = useRouter();
  const { profileId } = useAuthStore();

  const [photos, setPhotos] = useState<HomePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const m = useMemo<Metrics>(() => createMetrics(), []);

  // Supabase에서 사진 불러오기
  useEffect(() => {
    async function fetchPhotos() {
      if (!profileId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: photosError } = await supabase
          .from("photos")
          .select(
            `
            id,
            category_id,
            image_url,
            memo,
            created_at,
            categories (name)
          `
          )
          .eq("profile_id", profileId)
          .order("created_at", { ascending: false });

        if (photosError) throw photosError;

        // DB 데이터를 HomePhoto 타입으로 변환
        const mappedPhotos: HomePhoto[] = (data || []).map((item: any) => ({
          id: item.id,
          categoryId: item.category_id,
          category: item.categories?.name as PhotoCategory,
          imageUrl: item.image_url,
          memo: item.memo,
          isRecorded: !!item.memo, // memo가 있으면 기록된 것으로 간주
          createdAt: item.created_at,
        }));

        setPhotos(mappedPhotos);
      } catch (err) {
        console.error("Error fetching photos:", err);
        setError(
          err instanceof Error ? err.message : "사진을 불러오는데 실패했습니다."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchPhotos();
  }, [profileId]);

  const blocks = useMemo<LayoutBlock[]>(
    () =>
      buildBlocks(photos, {
        seed: 20250810,
        initialOrder: ["L1", "L2", "L3"],
        noConsecutive: true,
        allowed: ["L1", "L2", "L3"],
      }),
    [photos]
  );

  const handlePressPhoto = (photo: HomePhoto) => {
    router.push({ pathname: "/photo/[id]", params: { id: photo.id } });
  };

  // 로딩 상태
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ color: "#FF3B30", textAlign: "center" }}>{error}</Text>
      </View>
    );
  }

  // 사진이 없는 경우
  if (photos.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#8E8E93", fontSize: 16 }}>
          아직 사진이 없어요
        </Text>
      </View>
    );
  }

  return (
    <FlashList<LayoutBlock>
      data={blocks}
      keyExtractor={(b) => b.key}
      estimatedItemSize={m.H2x2}
      contentContainerStyle={{ padding: PADDING }}
      ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
      renderItem={({ item }: { item: LayoutBlock }) => {
        if (item.type === "L1")
          return (
            <L1 item={item.items[0]} m={m} onPressPhoto={handlePressPhoto} />
          );
        if (item.type === "L2")
          return (
            <L2 items={item.items} m={m} onPressPhoto={handlePressPhoto} />
          );
        return <L3 items={item.items} m={m} onPressPhoto={handlePressPhoto} />;
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}
