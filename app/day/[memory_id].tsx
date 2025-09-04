// app/day/[memory_id].tsx

// ================================
// Imports
// ================================
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { DateTime } from "luxon";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import MasonryGrid from "@/components/masonry/MasonryGrid";
import { dailyUserSeed } from "@/components/masonry/seed";
import type { FeedItem } from "@/components/masonry/types";
import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { LinearGradient } from "expo-linear-gradient";

import * as MediaLibrary from "expo-media-library";
import ViewShot from "react-native-view-shot";

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
type FeedItemEx = FeedItem & { content?: string; aspectRatio: number };
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
  const [mode, setMode] = useState<ViewMode>("story"); // ✅ 기본값을 "story"로 변경
  const [entries, setEntries] = useState<Entry[]>([]);
  const [memoryDate, setMemoryDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparingCapture, setPreparingCapture] = useState(false);

  const captureRef = useRef<ViewShot>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  const W = Dimensions.get("window").width;
  const H = Dimensions.get("window").height;
  const viewerTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );

  const buttonHeight = H * (40 / 844);
  const downloadbuttonWidth = buttonHeight * (175 / 40);
  const donesavebuttonWidth = buttonHeight * (212 / 40);

  useEffect(() => {
    navigation.setOptions({
      headerShadowVisible: false,
      headerStyle: {
        borderBottomWidth: 1,
        borderBottomColor: '#f2f2f2',
      },
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
          <Text style={styles.headerTitle}>Dearday</Text>
          <Text style={styles.headerSubtitle}>
            {memoryDate ? formatYmdDots(memoryDate) : ""}
          </Text>
        </View>
      ),
      headerTitleAlign: "center",
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={onFlip}>
            <Feather name="repeat" size={20} color="#5B8DEF" style={{ marginHorizontal: 20 }} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/today/${memory_id}`)}
            disabled={!memory_id}
          >
            <Image
              source={require("@/assets/images/edit_record.png")}
              style={{
                width: 30,
                height: 30,
                marginHorizontal: -3,
                opacity: memory_id ? 1 : 0.3
              }}
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, memoryDate, mode]);

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
      entries.map((e) => {
        return {
          id: String(e.memory_entry_id),
          imageUrl: e.image_url ?? "",
          dateISO: DateTime.fromISO(e.created_at, { zone: "utc" })
            .setZone(e.timezone ?? viewerTz)
            .toFormat("h:mm a"),
          place: e.location ?? "",
          content: e.content ?? "",
          aspectRatio: 1,
        };
      }),
    [entries, viewerTz]
  );

  const onFlip = () => setMode((m) => (m === "grid" ? "story" : "grid"));

  const handleSaveImage = async () => {
    if (preparingCapture || showSaveConfirmation) return;

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("권한 필요", "사진첩 접근 권한이 필요합니다.");
        return;
      }

      setPreparingCapture(true);

      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
      }

      setTimeout(async () => {
        try {
          if (captureRef.current) {
            const localUri = await captureRef.current.capture();
            await MediaLibrary.createAssetAsync(localUri);

            setPreparingCapture(false);
            setShowSaveConfirmation(true);
            setTimeout(() => setShowSaveConfirmation(false), 2000);
          }
        } catch (captureError) {
          console.error("캡처 실패:", captureError);
          setPreparingCapture(false);
          Alert.alert("오류", "이미지를 저장하는 데 실패했습니다.");
        }
      }, 1000);

    } catch (e) {
      console.error("권한 요청 실패:", e);
      setPreparingCapture(false);
      Alert.alert("오류", "권한을 확인하는 데 실패했습니다.");
    }
  };

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

  if (preparingCapture) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: mode === "story" ? "#FEFEFE" : "#F3F5F7" }}>
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          scrollEnabled={false}
        >
          <ViewShot
            ref={captureRef}
            style={{ backgroundColor: mode === "story" ? "#FEFEFE" : "#F3F5F7" }}
            options={{
              fileName: `dearday-${memoryDate}-${Date.now()}`,
              format: "jpg",
              quality: 0.9,
            }}
          >
            <View style={styles.captureHeader}>
              <Image
                source={require("@/assets/images/textmark_blue.png")}
                style={styles.captureLogo}
              />
              <Text style={styles.captureDateText}>
                {memoryDate ? formatYmdDots(memoryDate) : ""}
              </Text>
            </View>

            {/* ✅ 현재 모드에 따라 다른 컴포넌트 렌더링 */}
            {mode === "story" ? (
              <View style={{ padding: 16, gap: 16, backgroundColor: "#FEFEFE" }}>
                {feedItems.map((it) => (
                  <StoryCard key={it.id} item={it} />
                ))}
              </View>
            ) : (
              <MasonryGrid
                items={feedItems}
                gap={6}
                padding={16}
                options={{
                  seed: dailyUserSeed(profileId ?? "anon"),
                  initialOrder: ["L1"],
                  noConsecutive: true,
                  allowed: ["L1", "L2", "L3", "L4", "L5"],
                }}
                scrollEnabled={false}
              />
            )}
          </ViewShot>
        </ScrollView>

        <View style={styles.captureLoadingContainer}>
          <ActivityIndicator size="large" color="#5B8DEF" />
          <Text style={styles.captureLoadingText}>이미지 저장 준비중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F5F7" }}>
      {showSaveConfirmation && (
        <View style={styles.snackbarContainer}>
          <Image
            source={require("@/assets/images/done_save.png")}
            style={{ width: donesavebuttonWidth, height: buttonHeight, contentFit: "contain" }}
          />
        </View>
      )}

      {/* ✅ 조건문 순서 변경: story가 먼저, grid가 나중에 */}
      {mode === "story" ? (
        <StoryView 
          items={feedItems} 
          onSaveImage={handleSaveImage}
          buttonWidth={downloadbuttonWidth}
          buttonHeight={buttonHeight}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <MasonryGrid
            items={feedItems}
            gap={6}
            padding={16}
            options={{
              seed: dailyUserSeed(profileId ?? "anon"),
              initialOrder: ["L1"],
              noConsecutive: true,
              allowed: ["L1", "L2", "L3", "L4", "L5"],
            }}
            footer={
              <View style={{ height: 100, alignItems: "center", paddingTop: 40 }}>
                <TouchableOpacity onPress={handleSaveImage}>
                  <Image
                    source={require("@/assets/images/download.png")}
                    style={{ width: downloadbuttonWidth, height: buttonHeight, contentFit: "contain" }}
                  />
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// ================================
// Sub Views
// ================================

function StoryCard({ item }: { item: FeedItemEx }) {
  const [aspectRatio, setAspectRatio] = useState(item.aspectRatio);
  const hasFooterContent = !!item.place || !!item.content;

  return (
    <View style={styles.storyCard}>
      <View style={styles.storyHeader}>
        <Text style={styles.storyTime}>{item.dateISO}</Text>
      </View>

      <View>
        {item.imageUrl ? (
          <>
            <Image
              source={{ uri: item.imageUrl }}
              style={[styles.storyImage, { aspectRatio }]}
              contentFit="cover"
              onLoad={(e) => {
                const { width, height } = e.source;
                if (height > 0) {
                  setAspectRatio(width / height);
                }
              }}
            />
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)']}
              locations={[0, 0.6, 1]}
              style={styles.gradientOverlay}
            />
          </>
        ) : null}
      </View>

      {hasFooterContent ? (
        <View style={styles.storyFooter}>
          {!!item.place && (
            <View style={styles.storyLocationRow}>
              <Feather name="map-pin" size={14} color="#C3C3C3" />
              <Text style={styles.storyLocationText}>{item.place}</Text>
            </View>
          )}
          {!!item.content && (
            <Text style={[styles.storyContent, !item.place && { marginTop: 0 }]}>
              {item.content}
            </Text>
          )}
        </View>
      ) : (
        <View style={{ height: 12 }} />
      )}
    </View>
  );
}

function StoryView({ items, onSaveImage, buttonWidth, buttonHeight }: { 
  items: FeedItemEx[];
  onSaveImage: () => void;
  buttonWidth: number;
  buttonHeight: number;
}) {
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        gap: 16,
        backgroundColor: "#FEFEFE",
      }}
    >
      {items.map((it) => (
        <StoryCard key={it.id} item={it} />
      ))}
      
      {/* ✅ StoryView에도 저장 버튼 추가 */}
      <View style={{ height: 100, alignItems: "center", paddingTop: 40 }}>
        <TouchableOpacity onPress={onSaveImage}>
          <Image
            source={require("@/assets/images/download.png")}
            style={{ width: buttonWidth, height: buttonHeight, contentFit: "contain" }}
          />
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    alignItems: "center",
  } as const,
  headerTitle: {
    fontFamily: "Pretendard-Bold",
    fontSize: 20,
    color: "#5B8DEF",
  },
  headerSubtitle: {
    fontFamily: "Pretendard-Regular",
    fontSize: 12,
    color: "#929292",
    marginTop: -1,
  },
  captureHeader: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: -15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  captureLogo: {
    width: 120,
    height: 25,
    contentFit: "contain",
  },
  captureDateText: {
    fontFamily: "RedHat-Regular",
    fontSize: 16,
    color: "#929292",
  },
  captureLoadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#5B8DEF",
    fontFamily: "Pretendard-Regular",
  },
  snackbarContainer: {
    position: "absolute",
    top: 30,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  storyCard: {
    backgroundColor: "#FEFEFE",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#F2F2F2",
  },
  storyHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  storyTime: {
    fontFamily: "RedHat-Bold",
    fontSize: 20,
    color: "#333",
  },
  storyImage: {
    width: "100%",
    backgroundColor: "#eee",
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  storyFooter: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  storyLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  storyLocationText: {
    fontFamily: "Pretendard-Normal",
    fontSize: 13,
    color: "#929292",
  },
  storyContent: {
    fontFamily: "Pretendard-Normal",
    fontSize: 15,
    lineHeight: 22,
    color: "#0d0d0d",
  },
};