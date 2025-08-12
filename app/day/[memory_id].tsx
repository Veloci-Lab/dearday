import MasonryGrid from "@/components/masonry/MasonryGrid";
import type { FeedItem } from "@/components/masonry/types";
import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

type Entry = {
  memory_entry_id: number; // int8
  memory_id: number;       // int8
  image_url: string | null;
  content: string | null;
  location: string | null;
  created_at: string;      // timestamp (now() default)
  entry_index: number;     // int2
  is_selected: boolean;    // bool
};

type ViewMode = "grid" | "story";

export default function DayByMemory() {
  const { profileId } = useAuthStore();
  const { memory_id } = useLocalSearchParams<{ memory_id: string }>();
  const [mode, setMode] = useState<ViewMode>("grid");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const W = Dimensions.get("window").width;

  useEffect(() => {
    const id = Array.isArray(memory_id) ? memory_id[0] : memory_id;
    if (!id) return;

    (async () => {
      setLoading(true);

      // TODO: memory테이블 join해서 profile_id 체크
      const { data, error } = await supabase
        .from("memory_entries")
        .select(
          "memory_entry_id, memory_id, image_url, content, location, created_at, entry_index, is_selected"
        )
        .eq("memory_id", id)
        // .eq("profile_id", profileId)
        .eq("is_selected", true)
        .order("entry_index", { ascending: true });
      console.log(id, data, error);

      if (!error && data) setEntries(data as Entry[]);
      setLoading(false);
    })();
  }, [memory_id]);

  const dateTitle = useMemo(() => {
    const ref = entries[0]?.created_at;
    return formatKoreanDate(ref);
  }, [entries]);

  // MasonryGrid용 아이템 
  const feedItems: FeedItem[] = useMemo(
    () =>
      entries.map((e) => ({
        id: String(e.memory_entry_id),
        imageUrl: e.image_url ?? "",
        dateISO: e.created_at.slice(0, 10),
        place: e.location ?? "",
      })),
    [entries]
  );

  const onFlip = () => setMode((m) => (m === "grid" ? "story" : "grid"));

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!entries.length) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>이 날짜의 기록이 없어요.</Text>
      </SafeAreaView>
    );
  }

  return (
    
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F5F7" }}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{dateTitle}</Text>
        </View>
        {/* 1) 아이콘 고정 */}
        <Pressable onPress={onFlip} hitSlop={10} style={styles.flipBtn}>
          <Feather name="repeat" size={18} color="#333" />
        </Pressable>
      </View>

      {/* BODY */}
      {mode === "grid" ? (
        // 3) 첫 번째 뷰: MasonryGrid
        <MasonryGrid
              items={feedItems}
              gap={6}
              padding={0}
              options={{
                seed: 20250810,
                initialOrder: ["L1", "L2", "L3"], 
                noConsecutive: true,
                allowed: ["L1", "L2", "L3"],
              }}
            />
      ) : (
        // 두 번째 뷰: 스토리형 — 모든 이미지 라운드/보더 없음
        <StoryView width={W} entries={entries} />
      )}
    </SafeAreaView>
  );
}

/* ================= Sub Views ================= */

function StoryView({ width, entries }: { width: number; entries: Entry[] }) {
  const PADDING = 14;
  return (
    <ScrollView contentContainerStyle={{ padding: PADDING, gap: 16 }}>
      {entries.map((e) => (
        <View key={e.memory_entry_id} style={{ backgroundColor: "#fff" }}>
          {e.image_url ? (
            <View>
              {/* 라운드/보더 없음 */}
              <Image
                source={{ uri: e.image_url }}
                style={{ width: "100%", height: width * 0.75, backgroundColor: "#ddd" }}
                contentFit="cover"
              />
              <TopLeftBadge entry={e} />
            </View>
          ) : null}
          {e.content ? (
            <View style={{ padding: 12 }}>
              <Text style={{ fontSize: 14, lineHeight: 20 }}>{e.content}</Text>
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

/* ================= UI Bits ================= */

function TopLeftBadge({ entry }: { entry: Entry }) {
  const time = formatAMPM(entry.created_at);
  return (
    <View style={{ position: "absolute", left: 10, top: 10 }}>
      <Text style={{ color: "white", fontWeight: "600", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4 }}>
        {time}
      </Text>
      {!!entry.location && (
        <Text style={{ color: "white", opacity: 0.85, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4, fontSize: 12 }}>
          {entry.location}
        </Text>
      )}
    </View>
  );
}

/* ================= Helpers ================= */

function formatKoreanDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const weekday = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"][d.getDay()];
  return `${yyyy}.${mm}.${dd} ${weekday}`;
}
function formatAMPM(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true };
  return new Intl.DateTimeFormat("en-US", opts).format(d).toUpperCase();
}

/* ================= Styles ================= */
const styles = {
  center: { flex: 1, justifyContent: "center", alignItems: "center" } as const,
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  } as const,
  title: { fontSize: 20, fontWeight: "700" } as const,
  flipBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  } as const,
};
