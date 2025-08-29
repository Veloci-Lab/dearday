// app/(tabs)/index.tsx
import MasonryGrid from "@/components/masonry/MasonryGrid";
import type { FeedItem } from "@/components/masonry/types";
import { useAuthStore } from "@/utils/authStore";
import { getLocalDateString } from "@/utils/date";
import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Camera } from "expo-camera";
import { Image as ExpoImage } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { DateTime } from "luxon";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* =========================
 * Types
 * ========================= */
type MemoryThumbRow = {
  memory_id: number;
  date: string;
  thumb: {
    memory_entry_id: number;
    image_url: string | null;
    image_thumb_url: string | null;
    location: string | null;
  } | null;
};

type Dashboard = {
  nickname: string;
  avatarUrl: string | null;
  joinedAt: string | null;
  days: number;
  photos: number;
};

/* =========================
 * Helpers
 * ========================= */
async function checkPermissions(): Promise<boolean> {
  const v = await AsyncStorage.getItem("hasRequestedPermissions");
  return v === "true";
}

async function updateExpoPushToken(profileId: string, token: string) {
  const column =
    Platform.OS === "android"
      ? "expo_push_token_android"
      : Platform.OS === "ios"
      ? "expo_push_token_ios"
      : null;

  if (!column) return;

  const { error } = await supabase
    .from("profiles")
    .update({ [column]: token })
    .eq("profile_id", profileId);

  if (error) throw error;
}

/* =========================
 * Component
 * ========================= */
export default function IndexScreen() {
  const { profileId } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(false);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [rows, setRows] = useState<MemoryThumbRow[]>([]);

  // DASHBOARD
  const [Dashboard, setDashboard] = useState<Dashboard>({
    nickname: "",
    avatarUrl: null,
    joinedAt: null,
    days: 0,
    photos: 0,
  });

  // TODAY
  const [todayImages, setTodayImages] = useState<string[]>([]);
  const [showToday, setShowToday] = useState(false);
  const [todayCompleted, setTodayCompleted] = useState(false); // ✅ 추가

  // Masonry
  const feedItems: FeedItem[] = useMemo(
    () =>
      rows
        .filter((m) => !!m.thumb?.image_url)
        .map((m) => ({
          id: String(m.memory_id),
          imageUrl: m.thumb?.image_thumb_url || m.thumb?.image_url!,
          dateISO: m.date.replace(/-/g, ".") + ".",
          place: m.thumb?.location ?? "",
        })),
    [rows]
  );

  /* -------------------------
   * Loaders 
   * ------------------------- */
  const fetchDashboard = useCallback(async () => {
    if (!profileId) return;

    try {
      const [{ data: prof, error: profError }, memIdsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("nickname, avatar_url, created_at, timezone")
          .eq("profile_id", Number(profileId))
          .single(),

        supabase
          .from("memories")
          .select("memory_id")
          .eq("profile_id", Number(profileId)),
      ]);

      let photos = 0;
      if (!memIdsRes.error && memIdsRes.data.length) {
        const memIds = memIdsRes.data.map((m) => m.memory_id);
        const { count, error: countError } = await supabase
          .from("memory_entries")
          .select("memory_entry_id", { count: "exact", head: true })
          .in("memory_id", memIds)
          .not("image_url", "is", null);

        if (!countError) {
          photos = count ?? 0;
        }
      }

      const tz =
        (prof?.timezone as string | null) ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        "UTC";

      let days = 0;
      let joinedAtYear: string | null = null;

      if (!profError && prof?.created_at) {
        const createdLocal = DateTime.fromISO(prof.created_at, { zone: "utc" }).setZone(tz);
        const todayLocal = DateTime.now().setZone(tz);
        const diffDays = todayLocal.startOf("day").diff(createdLocal.startOf("day"), "days").days;
        days = Math.max(1, Math.floor(diffDays) + 1);
        joinedAtYear = createdLocal.toFormat("yyyy.LL");
      }

      setDashboard({
        nickname: prof?.nickname ?? "-",
        avatarUrl: prof?.avatar_url ?? null,
        joinedAt: joinedAtYear ?? "-",
        days,
        photos,
      });
    } catch (e) {
      console.error("fetchDashboard error:", e);
      setDashboard({
        nickname: "-",
        avatarUrl: null,
        joinedAt: "-",
        days: 0,
        photos: 0,
      });
    }
  }, [profileId]);

  const fetchTodayImages = useCallback(async () => {
    if (!profileId) return;

    try {
      setShowToday(true);
      const today = getLocalDateString();

      const { data: mem, error: memErr } = await supabase
        .from("memories")
        .select("memory_id, is_completed") // ✅ is_completed 추가
        .eq("profile_id", profileId)
        .eq("date", today)
        .single();

      if (memErr || !mem) {
        setTodayImages([]);
        setTodayCompleted(false); // ✅ 기록 없음
        return;
      }

      setTodayCompleted(mem.is_completed || false); // ✅ 완료 상태 저장

      const { data: entries, error: entErr } = await supabase
        .from("memory_entries")
        .select("image_url, image_thumb_url, created_at")
        .eq("memory_id", mem.memory_id)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false });

      if (entErr) throw entErr;

      const urls = (entries ?? [])
        .map((e: any) => (e.image_thumb_url || e.image_url) as string)
        .filter(Boolean);
      
      setTodayImages(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(urls)) return urls;
        return prev;
      });
    } catch (e) {
      console.error("❌ today images fetch error:", (e as Error).message);
      setTodayCompleted(false); // ✅ 에러 시에도 false
    }
  }, [profileId]);

  const fetchThumbnails = useCallback(
    async (showLoading: boolean = true) => {
      if (!profileId) return;

      if (showLoading) setMemoriesLoading(true);

      try {
        const { data, error } = await supabase
          .from("memories")
          .select(`
            memory_id,
            date,
            thumb:memory_entries!memories_thumbnail_entry_id_fkey (
              memory_entry_id,
              image_url,
              image_thumb_url,
              location
            )
          `)
          .eq("profile_id", profileId)
          .eq("is_completed", true)
          .order("date", { ascending: false });

        if (error) throw error;
        const list = (data as unknown as MemoryThumbRow[]) ?? [];

        setRows(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(list)) return list;
          return prev;
        });
      } catch (e) {
        console.error("❌ memory fetch error:", (e as Error).message);
        if (showLoading) setRows([]);
      } finally {
        if (showLoading) setMemoriesLoading(false);
      }
    },
    [profileId]
  );

  useEffect(() => {
    if (!profileId) return;
    let mounted = true;

    (async () => {
      const alreadyRequested = await checkPermissions();
      if (mounted && !alreadyRequested) setVisible(true);
      await fetchDashboard();
      await fetchTodayImages();
      await fetchThumbnails(true);
    })();

    return () => { mounted = false; };
  }, [profileId, fetchTodayImages, fetchThumbnails, fetchDashboard]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      fetchTodayImages();
      fetchThumbnails(false);
    }, [fetchTodayImages, fetchThumbnails, fetchDashboard])
  );

  const handleRequestPermissions = useCallback(async () => {
    if (!profileId) return;

    try {
      const token = await registerForPushNotificationsAsync();
      if (token) await updateExpoPushToken(profileId, token);
    } catch (err) {
      console.error("푸시 알림 권한/토큰 처리 실패:", err);
    }

    try {
      await Camera.requestCameraPermissionsAsync();
    } catch (err) {
      console.error("카메라 권한 요청 실패:", err);
    }

    try {
      await AsyncStorage.setItem("hasRequestedPermissions", "true");
    } catch (err) {
      console.error("AsyncStorage 저장 실패:", err);
    }

    setVisible(false);
  }, [profileId]);

  const { totalImages, remainingCount, renderItems } = useMemo(() => {
    const totalImages = todayImages.length;
    const displayImages = todayImages.slice(0, 3);
    const remainingCount = totalImages > 3 ? totalImages - 3 : 0;

    const renderItems = new Array(3).fill(null);
    displayImages.forEach((uri, i) => (renderItems[i] = uri));
    
    return { totalImages, remainingCount, renderItems };
  }, [todayImages]);

  if (!profileId) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#5B8DEF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}>
        <View style={styles.dashboardContainer}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <ExpoImage
              source={
                Dashboard.avatarUrl
                  ? { uri: Dashboard.avatarUrl }
                  : require("@/assets/images/avatar.png")
              }
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="normal"
              transition={150}
              recyclingKey={Dashboard.avatarUrl ?? "avatar-placeholder"}
            />

            <View style={{ marginLeft: 16 }}>
              <Text style={styles.nickname}>{Dashboard.nickname}</Text>
              {Dashboard.joinedAt && (
                <Text style={styles.sinceText}>Since {Dashboard.joinedAt}</Text>
              )}
            </View>
          </View>

          <View style={[styles.statsContainer, { justifyContent: "flex-end" }]}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{Dashboard.photos}</Text>
              <Text style={styles.statLabel}>PHOTOS</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{Dashboard.days}</Text>
              <Text style={styles.statLabel}>DAYS</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 2, backgroundColor: "#F2F2F2", marginBottom: 16 }} />

        {showToday && (
          <View style={styles.todayContainer}>
            {/* 1. TODAY 텍스트 블록 */}
            <View style={[styles.todayItem, styles.todayTextBox]}>
              <Text style={styles.count}>{totalImages}</Text>
              <Text style={styles.todayText}>TODAY</Text>
            </View>

            {/* 2. 이미지 3개 */}
            {renderItems.map((uri, index) => (
              <View key={index} style={styles.todayItem}>
                {uri ? (
                  <ExpoImage source={{ uri }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, styles.placeholderThumb]} />
                )}
                {index === 2 && remainingCount > 0 && (
                  <View style={styles.overlay}>
                    <Text style={styles.overlayText}>+{remainingCount}</Text>
                  </View>
                )}
              </View>
            ))}

            {/* 3. 수정 버튼 */}
            <TouchableOpacity style={[styles.todayItem, styles.arrowBtn]} onPress={() => router.push("/today/-1")}>
              {todayCompleted ? (
                <Image
                  source={require("@/assets/images/edit.png")}
                  style={{ width: 30, height: 30 }}
                />
              ) : (
                <Feather name="arrow-right" size={24} color="#5B8DEF" />
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ flex: 1, alignSelf: "stretch", width: "100%" }}>
          {memoriesLoading ? (
            <ActivityIndicator size="small" color="#5B8DEF" style={{ marginTop: 24 }} />
          ) : feedItems.length === 0 && todayImages.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Image
                source={require("@/assets/images/logo_center.png")}
                style={{ width: 35, height: 26, resizeMode: "contain" }}
              />
              <Text style={styles.emptyText}>아무것도 없어요!</Text>
            </View>
          ) : (
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
              onPressItem={(item) => router.push(`/day/${item.id}`)}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>필요한 권한 요청이 있어요.</Text>
            <Text style={styles.modalDesc}>
              Dearday를 원활히 사용하기 위해서,{"\n"}알림과 카메라 권한을 요청드릴 예정이에요.
            </Text>

            <Pressable style={styles.confirmButton} onPress={handleRequestPermissions}>
              <Text style={styles.confirmText}>확인했어요</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 8, color: "#0d0d0d" },
  modalDesc: { fontSize: 16, color: "#000000ff", textAlign: "left", marginBottom: 24 },
  confirmButton: {
    backgroundColor: "#5B8DEF",
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 12,
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
  },
  confirmText: { color: "#fff", fontWeight: "bold" },
  
  dashboardContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statBox: {
    alignItems: "center",
    marginLeft: 13,
    marginRight: 5
  },
  statLabel: {
    fontFamily: "Pretendard-Regular",
    fontSize: 15,
    color: "#C3C3C3",
    marginTop: -5
  },
  statValue: {
    fontFamily: "Pretendard-Medium",
    fontSize: 35,
    color: "#5B8DEF",
  },

  // todayContainer: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   backgroundColor: "#fff",
  //   marginHorizontal: 16,
  // },
  left: { marginRight: 12, alignItems: 'center' },
  todayText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 15,
    color: "#C3C3C3",
    marginTop: -5,
    marginLeft: -3,
    // marginRight: 4
  },
  count: {
    fontFamily: "Pretendard-Medium",
    fontSize: 35,
    color: "#5B8DEF",
    textAlign: "center",
    marginLeft: -2
  },
  center: {
    flex: 1,
    flexDirection: "row",
    gap: 3,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 250,
  },
  emptyText: {
    marginTop: 13,
    fontFamily: "Pretendard-Regular",
    fontSize: 15,
    color: "#0D0D0D",
  },
  nickname: {
    fontFamily: "Pretendard-Bold",
    fontSize: 17,
    color: '#0F172A',
  },
  sinceText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 13,
    color: "#929292",
  },
  thumbContainer: {
    flex: 1,
    aspectRatio: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderThumb: {
    backgroundColor: '#F0F3F8',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 7,
  },
  overlayText: {
    color: 'white',
    fontFamily: 'Pretendard-Bold',
    fontSize: 16,
  },
  // ✅ 수정: todayContainer 스타일 변경
  todayContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 5, // 5개 아이템 사이의 간격
  },
  // ✅ 추가: 5개 아이템에 공통으로 적용될 스타일
  todayItem: {
    flex: 1, // 공간을 1/5씩 나눠가짐
    aspectRatio: 1, // 정사각형 비율 유지
    borderRadius: 7,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ✅ 추가: TODAY 텍스트 박스 전용 스타일
  todayTextBox: {
    // 필요시 배경색 등 추가
    // backgroundColor: '#f0f0f0',
  },
  arrowBtn: {
    backgroundColor: "#EFF3FF",
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: 7,
  },
});