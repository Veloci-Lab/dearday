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
// import * as Location from "expo-location";
// import * as MediaLibrary from "expo-media-library";
import { getSignedUrl } from "@/utils/signedUrlCache";
import { router, useFocusEffect } from "expo-router";
import { DateTime } from "luxon";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* =========================
 * Types
 * ========================= */
type MemoryThumbRow = {
  memory_id: number;
  date: string; // DATE (YYYY-MM-DD)
  thumb: {
    memory_entry_id: number;
    image_url: string | null;
    location: string | null;
  } | null;
};

type Dashboard = {
  nickname: string;
  avatarUrl: string | null;
  joinedAt: string | null;  // YYYY
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

  const [visible, setVisible] = useState(false); // 권한 모달
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [rows, setRows] = useState<MemoryThumbRow[]>([]);

  const isFirstLoad = useRef(true);

  // DASHBOARD
  const [Dashboard, setDashboard] = useState<Dashboard>({
    nickname: "",
    avatarUrl: null,
    joinedAt: null,
    days: 0,
    photos: 0,
  });

  // TODAY
  type TodayItem = { path: string; url: string };
  const [todayCount, setTodayCount] = useState(0);
  const [todayImages, setTodayImages] = useState<TodayItem[]>([]);
  const [showToday, setShowToday] = useState(false); // ← 오늘 영역 노출 여부

  // 화면 가로 폭/표시 썸네일 수 계산
  const screenWidth = Dimensions.get("window").width;
  const arrowWidth = 36;
  const thumbSize = 40;
  const thumbGap = 4;
  const leftWidth = 50;
  const horizontalPadding = 12 * 2;
  const availableWidth = screenWidth - (arrowWidth + leftWidth + horizontalPadding + 16);
  const maxThumbs = Math.floor(availableWidth / (thumbSize + thumbGap));

  // Masonry
  const feedItems: FeedItem[] = useMemo(
    () =>
      rows
        .filter((m) => !!m.thumb?.image_url)
        .map((m) => ({
          id: String(m.memory_id),
          imageUrl: m.thumb?.image_url ?? "./assets/images/thumbnail.png",
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

      // PHOTOS 카운트 
      let photos = 0;
      if (!memIdsRes.error && memIdsRes.data.length) {
        const memIds = memIdsRes.data.map((m) => m.memory_id);
        const { count, error: countError } = await supabase
          .from("memory_entries")
          .select("memory_entry_id", { count: "exact", head: true })
          .in("memory_id", memIds)
          .or("image_path.not.is.null,image_thumb_path.not.is.null");
        if (!countError) {
          photos = count ?? 0;
        }
      }

      // DAYS 카운트 
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

      const next = {
        nickname: prof?.nickname ?? "-",
        avatarUrl: prof?.avatar_url ?? null,
        joinedAt: joinedAtYear ?? "-",
        days,
        photos,
      };

      // 값이 동일하면 setState 스킵 → 리렌더 방지
      setDashboard((prev) => (
        prev.nickname === next.nickname &&
        prev.avatarUrl === next.avatarUrl &&
        prev.joinedAt === next.joinedAt &&
        prev.days === next.days &&
        prev.photos === next.photos
          ? prev
          : next
      ));
    } catch (e) {
      console.error("fetchDashboard error:", e);
      setDashboard((prev) => prev ?? {
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
      const today = getLocalDateString();

      // 1) 오늘 memory
      const { data: mem, error: memErr } = await supabase
        .from("memories")
        .select("memory_id, is_completed")
        .eq("profile_id", profileId)
        .eq("date", today)
        .single();

      // 없거나 완료면 감춤
      if (memErr || !mem || mem.is_completed === true) {
        setTodayImages([]);
        setTodayCount(0);
        setShowToday(false);
        return;
      }

      // 2) entries (원본/썸네일 하나라도 있는 것만)
      const { data: entries, error: entErr, count } = await supabase
        .from("memory_entries")
        .select("created_at, image_path, image_thumb_path", { count: "exact" })
        .eq("memory_id", mem.memory_id)
        .or("image_path.not.is.null,image_thumb_path.not.is.null")
        .order("created_at", { ascending: false })
        .limit(3);

      if (entErr) throw entErr;

      // 3) path -> signed URL (썸네일 우선), 병렬 처리
      const items = await Promise.all(
        (entries ?? []).map(async (e: any) => {
          const path: string | null = e.image_thumb_path ?? e.image_path ?? null;
          if (!path) return null;
          const url = await getSignedUrl(path, "pictures", 3600); // 버킷/TTL 필요하면 변경
          return url ? { path, url } : null;
        })
      );

      const next = (items.filter(Boolean) as TodayItem[]);
      console.log(next);
      

      setTodayCount(count ?? 0);
      // 동일 데이터면 스킵(깜빡임 방지)
      setTodayImages(prev => {
        const same =
          prev.length === next.length &&
          prev.every((p, i) => p.path === next[i].path && p.url === next[i].url);
        return same ? prev : next;
      });
      setShowToday((count ?? 0) > 0);
    } catch (e) {
      console.error("❌ fetchTodayImages error:", (e as Error).message);
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
              location
            )
          `)
          .eq("profile_id", profileId)
          .eq("is_completed", true)
          .order("date", { ascending: false });

        if (error) throw error;
        const list = (data as unknown as MemoryThumbRow[]) ?? [];

        // 동일 데이터면 setRows 스킵 → 재진입 시 깜빡임 최소화
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

  /* -------------------------
   * Effects
   * ------------------------- */
  // 최초 진입
  useEffect(() => {
    if (!profileId) return;
    let mounted = true;

    (async () => {
      const alreadyRequested = await checkPermissions();
      if (mounted && !alreadyRequested) setVisible(true);
    })();

    return () => { mounted = false; };
  }, [profileId]);

  // 재진입
  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      fetchTodayImages();
      fetchThumbnails(isFirstLoad.current);
      isFirstLoad.current = false;
    }, [fetchDashboard, fetchTodayImages, fetchThumbnails])
  );

  /* -------------------------
   * Handlers
   * ------------------------- */
  const handleRequestPermissions = useCallback(async () => {
    if (!profileId) return;

    // 1. 푸시 알림 권한 + 토큰 저장 (에러 나도 계속 진행)
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) await updateExpoPushToken(profileId, token);
    } catch (err) {
      console.error("푸시 알림 권한/토큰 처리 실패:", err);
    }

    // 2. 카메라 권한
    try {
      const { status: camStatus } = await Camera.requestCameraPermissionsAsync();
      // if (camStatus !== "granted") {
      //   console.warn("카메라 권한 거부됨");
      // }
    } catch (err) {
      console.error("카메라 권한 요청 실패:", err);
    }

    // // 3. 갤러리 권한
    // try {
    //   const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
    //   // if (mediaStatus !== "granted") {
    //   //   console.warn("미디어 라이브러리 권한 거부됨");
    //   // }
    // } catch (err) {
    //   console.error("미디어 라이브러리 권한 요청 실패:", err);
    // }

    // 4. 위치 권한
    // try {
    //   const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    //   // if (locStatus !== "granted") {
    //   //   console.warn("위치 권한 거부됨");
    //   // }
    // } catch (err) {
    //   console.error("위치 권한 요청 실패:", err);
    // }

    // 플래그 저장
    try {
      await AsyncStorage.setItem("hasRequestedPermissions", "true");
    } catch (err) {
      console.error("AsyncStorage 저장 실패:", err);
    }

    setVisible(false);
  }, [profileId]);


  /* -------------------------
   * Render
   * ------------------------- */
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
        {/* 대시보드 */}
        <View style={styles.dashboardContainer}>
          {/* 왼쪽 영역 */}
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <ExpoImage
              source={
                Dashboard.avatarUrl
                  ? { uri: Dashboard.avatarUrl }
                  : require("@/assets/images/avatar.png")  // 기본 아바타
              }
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"   // 디스크+메모리 캐시 활용
              priority="normal"           // 리스트 우선순위 normal
              transition={150}            // 페이드 인
              recyclingKey={Dashboard.avatarUrl ?? "avatar-placeholder"}
            />

            <View style={{ marginLeft: 16 }}>
              <Text style={styles.nickname}>{Dashboard.nickname}</Text>
              {Dashboard.joinedAt && (
                <Text style={styles.sinceText}>Since {Dashboard.joinedAt}</Text>
              )}
            </View>
          </View>

          {/* 오른쪽 영역 */}
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

        <View style={{ height: 1, backgroundColor: "#F2F2F2", marginBottom: 16 }} />

        {/* 오늘 찍은 사진 */}
        {showToday && (
          <View style={styles.todayContainer}>
            <View style={styles.left}>
              <Text style={styles.count}>{todayCount}</Text>
              <Text style={styles.todayText}>TODAY</Text>
            </View>

            <View style={styles.center}>
              {[0, 1, 2].map((idx) => {
                const item = todayImages[idx];
                const isLast = idx === 2 && todayCount > 3;

                if (!item) {
                  // 🔹 사진 없으면 빈 박스
                  return <View key={`empty-${idx}`} style={styles.thumbWrapEmpty} />;
                }

                return (
                  <View key={item.path} style={styles.thumbWrap}>
                    <ExpoImage
                      source={{ uri: item.url }}
                      style={styles.thumb}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={150}
                      recyclingKey={item.path}
                    />
                    {isLast && (
                      <View style={styles.overlay}>
                        <Text style={styles.overlayText}>+{todayCount - 3}</Text>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* → 화살표 네모 */}
              <TouchableOpacity style={styles.arrowBtn} onPress={() => router.push("/today/-1")}>
                <Feather name="arrow-right" size={24} color="#5B8DEF" />
              </TouchableOpacity>
            </View>

          </View>
        )}

        {/* memory 목록 렌더링 */}
        <View style={{ flex: 1, alignSelf: "stretch", width: "100%" }}>
          {memoriesLoading ? (
            <ActivityIndicator size="small" color="#5B8DEF" style={{ marginTop: 24 }} />
          ) : feedItems.length === 0 && todayImages.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Image
                  source={require("@/assets/images/logo_blue.png")} // 앱 로고 png
                  style={{ width: 28, height: 28, resizeMode: "contain" }}
                />
              </View>
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

      {/* 권한 모달 */}
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

  // 권한 요청 모달 
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
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 8 },
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
  dismissText: { color: "#999", fontSize: 14 },

  // 대시보드
  dashboardContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    // marginVertical: 16,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },

  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },

  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  statBox: {
    alignItems: "center",
    marginLeft: 12,
  },

  statLabel: {
    fontFamily: "Pretendard-Regular",
    fontSize: 15,
    color: "#C3C3C3",
  },

  statValue: {
    fontFamily: "Pretendard-Medium",
    fontSize: 30,
    //fontWeight: "bold",
    color: "#5B8DEF",
  },

  // TODAY (데모)
  todayContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    // paddingHorizontal: 16,
    // marginBottom: 16,
    // borderWidth: 1,
    // borderRadius: 12,
    // borderColor: "#F5978A",
    marginHorizontal: 16,
  },
  left: { marginRight: 8 },
  todayText: { 
    fontFamily: "Pretendard-Regular", 
    fontSize: 15, 
    color: "#C3C3C3" 
  },
  count: { 
    fontFamily: "Pretendard-Medium", 
    fontSize: 30 , 
    //fontWeight: "bold", 
    color: "#5B8DEF", 
    textAlign: "center" 
  },
  center: { flexDirection: "row", flex: 1, gap: 4, marginLeft: 8 },

  thumbWrapEmpty: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 7,
    backgroundColor: "#F0F3F8", // 빈칸 회색
  },
  thumbWrap: {
    flex: 1,
    aspectRatio: 1, // 정사각형 유지
    borderRadius: 7,
    overflow: "hidden",
    position: "relative",
  },
  thumb: {
    width: "100%",
    height: "100%",
    borderRadius: 7,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },

  arrowBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 7,
    backgroundColor: "rgba(228, 238, 255, 1)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },

  // 피드영역
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,     // 위아래 여백
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 14,
    color: "#0D0D0D",
    fontWeight: "600",
  },
  nickname: { // 새로 추가
    fontFamily: "Pretendard-Bold",
    fontSize: 20,
    color: '#0F172A', // 색상 추가
  },
  sinceText: { // 새로 추가
    fontFamily: "Pretendard-Regular",
    fontSize: 12,
    color: "#929292",
  },

});
