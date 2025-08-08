import { useAuthStore } from "@/utils/authStore";
import { registerForPushNotificationsAsync } from '@/utils/registerForPushNotificationsAsync';
import { supabase } from "@/utils/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

export default function IndexScreen() {
  const { profileId } = useAuthStore();
  const [visible, setVisible] = useState(false);
  // const [, requestCameraPermission] = useCameraPermissions();
  const [groupedMemories, setGroupedMemories] = useState<{ [date: string]: any[] }>({});
  const [memoriesLoading, setMemoriesLoading] = useState(true);

  // 권한 요청 여부 확인
  useEffect(() => {
    // AsyncStorage.setItem("hasRequestedPermissions", "false");
    
    if (!profileId) return;

    const checkPermissionRequested = async () => {
      const value = await AsyncStorage.getItem("hasRequestedPermissions");
      if (value !== "true") {
        setVisible(true);
      }
    };

    checkPermissionRequested();
  }, [profileId]);

  // memory 불러오기
  useEffect(() => {
    if (!profileId) return;

    const fetchThumbnails = async () => {
      setMemoriesLoading(true);

      const { data, error } = await supabase
        .from("memories")
        .select(`
          date,
          memory_entries (
            memory_entry_id,
            content,
            image_url,
            location,
            is_thumbnail
          )
        `)
        .eq("profile_id", profileId)
        .eq("is_completed", true)
        .order("date", { ascending: false });

      if (error) {
        console.error("❌ memory fetch error:", error.message);
        setMemoriesLoading(false);
        return;
      }

      const grouped: { [date: string]: any[] } = {};

      for (const memory of data) {
        const date = memory.date;
        const thumbnails = (memory.memory_entries || []).filter(
          (e: any) => e.is_thumbnail
        );
        if (thumbnails.length > 0) {
          grouped[date] = [thumbnails[0]]; // 썸네일 1개만
        }
      }

      setGroupedMemories(grouped);
      setMemoriesLoading(false);
    };

    fetchThumbnails();
  }, [profileId]);


  const handleRequestPermissions = async () => {
    if (!profileId) return; // 안전하게 더블체크 

    // 1. 푸시 알림 권한 요청
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

          if (updateError) {
            console.log("푸시 토큰 업데이트 실패:", updateError.message);
          } else {
            console.log("푸시 토큰 저장 완료");
          }
        } else {
          console.log("웹 플랫폼에서는 푸시 알림을 지원하지 않습니다.");
        }
      }
    } catch (err) {
      console.error("푸시 알림 권한 요청 실패:", err);
    }

    // 2. 카메라 권한 요청
    // try {
    //   const { status } = await requestCameraPermission();
    //   console.log("카메라 권한 상태:", status);
    // } catch (err) {
    //   console.error("카메라 권한 요청 실패:", err);
    // }

    // 3. 갤러리 권한 요청
    // 4. 장소 권한 요청

    // 권한 요청 완료 기록
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
        <ActivityIndicator size="large" color="#3478F6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Button title="카메라 열기" onPress={() => router.push("/camera")} />

      {/* memory 목록 렌더링 */}
      <ScrollView style={{ marginTop: 24, paddingHorizontal: 16, width: "100%" }}>
        {memoriesLoading ? (
          <ActivityIndicator size="small" color="#3478F6" />
        ) : (
          Object.entries(groupedMemories).map(([date, entries]) => (
            <View key={date} style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
                {date}
              </Text>

              {entries.map((entry) => (
                <View key={entry.memory_entry_id} style={{ marginBottom: 20 }}>
                  {entry.image_url && (
                    <Image
                      source={{ uri: entry.image_url }}
                      style={{
                        width: "100%",
                        aspectRatio: 3 / 2,
                        borderRadius: 10,
                        backgroundColor: "#eee",
                      }}
                    />
                  )}
                  {entry.location && (
                    <Text style={{ marginTop: 8, fontSize: 15 }}>{entry.location}</Text>
                  )}
                  {entry.content && (
                    <Text style={{ marginTop: 8, fontSize: 15 }}>{entry.content}</Text>
                  )}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* 기존 모달 유지 */}
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>필요한 권한 요청이 있어요.</Text>
            <Text style={styles.modalDesc}>
              Dearday를 원활히 사용하기 위해서,{"\n"}알림과 사진 권한을 요청드릴 예정이에요.
            </Text>

            <Pressable
              style={styles.confirmButton}
              onPress={handleRequestPermissions}
            >
              <Text style={styles.confirmText}>디어데이 시작하기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },

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
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  confirmButton: {
    backgroundColor: "#3478F6",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
  },
  confirmText: { color: "#fff", fontWeight: "bold" },
  dismissText: { color: "#999", fontSize: 14 },
});
