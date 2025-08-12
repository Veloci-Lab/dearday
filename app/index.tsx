import MasonryGrid from "@/components/masonry/MasonryGrid";
import type { FeedItem } from "@/components/masonry/types";
import { useAuthStore } from "@/utils/authStore";
import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons"; // 추가
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MemoryThumbRow = {
  memory_id: number;
  date: string; // DATE (YYYY-MM-DD)
  thumb: {
    memory_entry_id: number;
    image_url: string | null;
    location: string | null;
  } | null;
};

export default function IndexScreen() {
  const { profileId } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [rows, setRows] = useState<MemoryThumbRow[]>([]);

  // Masonry용 아이템
  const feedItems: FeedItem[] = useMemo(
    () =>
      rows
        .filter((m) => !!m.thumb?.image_url)
        .map((m) => ({
          id: String(m.memory_id),
          imageUrl: m.thumb!.image_url as string,
          dateISO: m.date,
          place: m.thumb?.location ?? "",
        })),
    [rows]
  );

  // 권한 요청 여부 확인
  useEffect(() => {
    if (!profileId) return;
    (async () => {
      const value = await AsyncStorage.getItem("hasRequestedPermissions");
      if (value !== "true") setVisible(true);
    })();
  }, [profileId]);

  // ✅ thumbnail_entry_id를 이용해 대표 썸네일만 조인해서 가져오기
  useEffect(() => {
    if (!profileId) return;

    const fetchThumbnails = async () => {
      setMemoriesLoading(true);

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

      if (error) {
        console.error("❌ memory fetch error:", error.message);
        setRows([]);
      } else {
        console.log(data);
        
        setRows((data as unknown as MemoryThumbRow[]) ?? []);
      }
      setMemoriesLoading(false);
    };

    fetchThumbnails();
  }, [profileId]);

  const handleRequestPermissions = async () => {
    if (!profileId) return;

    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        const column =
          Platform.OS === "android"
            ? "expo_push_token_android"
            : Platform.OS === "ios"
            ? "expo_push_token_ios"
            : null;

        if (column) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ [column]: token })
            .eq("profile_id", profileId);
          if (updateError) console.log("푸시 토큰 업데이트 실패:", updateError.message);
        }
      }
    } catch (err) {
      console.error("푸시 알림 권한 요청 실패:", err);
    }

    try {
      await AsyncStorage.setItem("hasRequestedPermissions", "true");
    } catch (err) {
      console.error("AsyncStorage 저장 실패:", err);
    }
    setVisible(false);
  };

  // ✅ 로딩 화면 처리
  if (!profileId) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#5B8DEF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Button title="기록 안된 사진들" onPress={() => router.push("/pending")} />
      <Button title="마이페이지 열기" onPress={() => router.push("/mypage")} />
      <Button title="달력뷰 열기" onPress={() => router.push("/calendar")} />
        <Button title="오늘 하루 찍은 사진 열기" onPress={() => router.push("/today/-1")} />

      {/* memory 목록 렌더링 */}
      <View style={{ flex: 1, alignSelf: "stretch", width: "100%" }}>
        {memoriesLoading ? (
          <ActivityIndicator size="small" color="#5B8DEF" style={{ marginTop: 24 }} />
        ) : (
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
            onPressItem={(item) => router.push(`/day/${item.id}`)}
          />
        )}
      </View>

      {/* 플로팅 버튼 */}
      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: insets.bottom + 24 }, // 안전 영역 반영
        ]}
        onPress={() => router.push("/camera")}
      >
        <Feather name="camera" size={26} color="#fff" />
      </TouchableOpacity>

      {/* 권한 모달 */}
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>필요한 권한 요청이 있어요.</Text>
            <Text style={styles.modalDesc}>
              Dearday를 원활히 사용하기 위해서,{"\n"}알림 권한을 요청드릴 예정이에요.
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
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  // FAB 버튼
    fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#5B8DEF",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 100, // iOS
    elevation: 5, // Android
  },
  fabText: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "bold",
  },
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
    // alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 16,
    color: "#666",
    textAlign: "left",
    marginBottom: 24,
  },
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
});
