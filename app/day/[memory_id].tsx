// ================================
// Imports
// ================================
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { DateTime } from "luxon";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import MasonryGrid from "@/components/masonry/MasonryGrid";
import type { FeedItem } from "@/components/masonry/types";
import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { router, useNavigation } from "expo-router";


// ================================
// Types
// ================================
type Entry = {
  memory_entry_id: number;
  image_url: string | null;
  created_at: string;
  timezone: string | null;
  location: string | null;
  content: string | null;
};

type ViewMode = "grid" | "story";
type FeedItemEx = FeedItem & { content?: string };
type MemoryRow = { memory_id: number; date: string };


// ================================
// Helpers
// ================================
function formatYmdDots(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}.`;
}

// ================================
// Component
// ================================
export default function DayByMemory() {
  const navigation = useNavigation();

  const { profileId } = useAuthStore();
  const { memory_id } = useLocalSearchParams();
  const [mode, setMode] = useState<ViewMode>("grid");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [memoryDate, setMemoryDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const W = Dimensions.get("window").width;
  const viewerTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );

  useEffect(() => {
    navigation.setOptions({
       headerLeft: () => (
        <Pressable
          style={{ flexDirection: "row", alignItems: "center" }}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={24} color="black" />
        </Pressable>
      ),
      headerTitle: () => (
        <View style={{ alignItems: "center" }}>
          <Text style={ styles.headerTitle }>
            Dearday
          </Text>
          <Text style={ styles.headerSubtitle }>
            {memoryDate ? formatYmdDots(memoryDate) : ""}
          </Text>
        </View>
      ),
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={onFlip}>
            <Feather name="repeat" size={20} color="#5B8DEF" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/today/${memory_id}`)}
            disabled={!memory_id}
          >
            <Feather
              name="edit"
              size={20}
              color={memory_id ? "#000" : "#bbb"}
              style={{ marginHorizontal: 8 }}
            />
          </TouchableOpacity>
        </View>
      )
    });
  }, [navigation, memoryDate]);

  //  {/* HEADER */}
  //     <View style={styles.header}>
  //       <View style={{ flex: 1 }}>
  //         <Text style={styles.title}>{memoryDate ? formatYmdDots(memoryDate) : ""}</Text>
  //         <Text style={styles.title}>{memoryDate ? weekdayKoFromYmd(memoryDate) : ""}</Text>
  //       </View>
  //       <Pressable onPress={onFlip} hitSlop={10} style={styles.flipBtn}>
  //         <Feather name="repeat" size={18} color="#333" />
  //       </Pressable>
  //     </View>

  useEffect(() => {
    if (!profileId || !memory_id) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: memoryData, error: memoryError } = await supabase
        .from("memories")
        .select("memory_id, date")
        .eq("profile_id", profileId)
        .eq("memory_id", memory_id)
        .maybeSingle<MemoryRow>();

      if (memoryError || !memoryData) {
        Alert.alert("에러", "메모리 정보를 불러오지 못했습니다.");
        return;
      }

      setMemoryDate(memoryData.date);

      const { data: entriesData, error: entriesError } = await supabase
        .from("memory_entries")
        .select("memory_entry_id, image_url, timezone, created_at, location, content")
        .eq("memory_id", memory_id)
        .eq("is_selected", true)
        .order("entry_index", { ascending: true });

      if (entriesError) {
        console.error(entriesError);
        setEntries([]);
      } else {
        setEntries(entriesData ?? []);
      }

      setLoading(false);
    };

    fetchData();
  }, [profileId, memory_id]);

  const feedItems: FeedItemEx[] = useMemo(
    () =>
      entries.map((e) => ({
        id: String(e.memory_entry_id),
        imageUrl: e.image_url ?? "",
        dateISO: DateTime.fromISO(e.created_at, { zone: "utc" })
          .setZone(e.timezone ?? viewerTz)
          .toFormat("h:mm a"),
        place: e.location ?? "",
        content: e.content ?? "",
      })),
    [entries, viewerTz]
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
      {/* BODY */}
      {mode === "grid" ? (
        <MasonryGrid
          items={feedItems}
          gap={6}
          padding={16}
          options={{
            seed: 20250810,
            initialOrder: ["L1", "L2", "L3"],
            noConsecutive: true,
            allowed: ["L1", "L2", "L3"],
          }}
        />
      ) : (
        <StoryView width={W} items={feedItems} />
      )}
    </SafeAreaView>
  );
}


// ================================
// Sub Views
// ================================
function StoryView({ width, items }: { width: number; items: FeedItemEx[] }) {
  const PADDING = 16; // 14
  const GAP = 6; // 16
  return (
    <ScrollView contentContainerStyle={{ padding: PADDING, gap: GAP, backgroundColor: "#fff" }}> 
      {items.map((it) => (
        <View key={it.id} style={{ backgroundColor: "#fff" }}>
          {it.imageUrl ? (
            <View>
              <Image
                source={{ uri: it.imageUrl }}
                style={{ width: "100%", height: width * 0.75, borderRadius: 16 }}
                contentFit="cover"
              />
              <TopLeftBadge time={it.dateISO} place={it.place} />
            </View>
          ) : null}
          <View style={it.content && { padding: 16 }}>
             {/*  */}
            {it.content ? (
              <Text style={ styles.bodyText }>
                {it.content}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}


// ================================
// UI Bits
// ================================
function TopLeftBadge({ time, place }: { time?: string; place?: string }) {
  return (
    <View style={{ position: "absolute", left: 10, top: 10 }}>
      {!!time && (
        <Text style={{ 
            fontFamily: "Pretendard-Bold",
            color: "white", 
            //fontWeight: "600", 
            textShadowColor: "rgba(0,0,0,0.6)", 
            textShadowRadius: 4 
          }}>
          {time}
        </Text>
      )}
      {!!place && (
        <Text style={{ 
            fontFamily: "Pretendard-SemiBold",
            color: "white", 
            opacity: 0.85, 
            textShadowColor: "rgba(0,0,0,0.6)", 
            textShadowRadius: 4, 
            fontSize: 12 
          }}>
          {place}
        </Text>
      )}
    </View>
  );
}

// ================================
// Styles
// ================================
const styles = {
  center: { 
    fontFamily: "Pretendard-Regular",
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  } as const,
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  } as const,
  title: { 
    fontFamily: "Pretendard-Bold",
    fontSize: 20, 
    //fontWeight: "700" 
  } as const,
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
  headerTitle: { 
    fontFamily: "Pretendard-Bold", 
    fontSize: 20, 
    color: "#5B8DEF" 
  },
  headerSubtitle: { 
    fontFamily: "Pretendard-Regular", 
    fontSize: 12, 
    color: "#929292", 
    marginTop: 2 
  },
  bodyText: { 
    fontFamily: "Pretendard-Regular",
    fontSize: 14, 
    lineHeight: 20, 
    color: "#0D0D0D" 
  }
};
