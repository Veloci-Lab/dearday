import { useAuthStore } from "@/utils/authStore";
import { getLocalDateString } from "@/utils/date";
import { getUserMemoryBundleByDate } from "@/utils/memoryBundles";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Button, Image, Pressable, ScrollView, Text, View } from "react-native";
import { supabase } from "../../utils/supabase";

export default function IndexScreen() {
  const router = useRouter();
  const { logOut, profileId } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [todayMemory, setTodayMemory] = useState<any>(null);

  const loadToday = async (profileId: string) => {
    try {
      const today = getLocalDateString();
      const result = await getUserMemoryBundleByDate(supabase, profileId, today);
      setTodayMemory(result);
    } catch (e) {
      console.error(e);
      Alert.alert("데이터 불러오기 실패", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileId) {
      loadToday(profileId);
    }
  }, [profileId]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("로그아웃 실패", error.message);
    } else {
      await logOut();
      router.replace("/sign-in");
    }
  };

  return (
    <ScrollView contentContainerStyle={{ alignItems: "center", padding: 20 }}>
      {loading ? (
        <Text>불러오는 중...</Text>
      ) : todayMemory ? (
        <>
          <Text style={{ marginTop: 16 }}>오늘의 메모리</Text>
          <Text>엔트리 수: {todayMemory.entries.length}</Text>

          {todayMemory.entries.length === 0 && (
            <Button
              title="+ 첫 엔트리 추가"
              onPress={() =>
                router.push({
                  pathname: "/camera",
                  params: {
                    memory_id: todayMemory.memory.memory_id,
                    insert_index: "0",
                  },
                })
              }
            />
          )}

          {todayMemory.entries.map(({ entry, images }, idx) => {
  const notification = todayMemory.notifications.find(
    (n) => n.notification_id === entry.notification_id
  );

  return (
    <View key={entry.memory_entry_id} style={{ marginTop: 24, width: "100%" }}>
      {/* 위에 추가 버튼 */}
      <Button
        title="+ 위에 추가"
        onPress={() =>
          router.push({
            pathname: "/camera",
            params: {
              memory_id: todayMemory.memory.memory_id,
              insert_index: String(idx),
            },
          })
        }
      />

      {/* ✅ 전체 Pressable 클릭시 상세 이동 */}
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/detail",
            params: {
              // memory_id: todayMemory.memory.memory_id,
              memory_entry_id: String(entry.memory_entry_id), 
            },
          })
        }
        style={{ marginTop: 8 }}
      >
        <Text style={{ fontWeight: "bold" }}>#{idx + 1}번 엔트리</Text>
        <Text>내용: {entry.content}</Text>
        {entry.location && <Text>위치: {entry.location}</Text>}

        {entry.notification_id && notification ? (
          <View style={{ marginTop: 4 }}>
            <Text>
              📣 알림 발송:{" "}
              {new Date(notification.sent_at ?? "").toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <Text>
              ⏰ 업로드:{" "}
              {new Date(entry.created_at).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <Text>
              {entry.isSubmittedWithin10Min ? "✅ 제시간 제출" : "⏰ 지각 제출"}
            </Text>
          </View>
        ) : (
          <Text style={{ color: "#999", marginTop: 4 }}>알림 연결 없음</Text>
        )}

        {images.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 8 }}
          >
            {images.map((img) => (
              <Image
                key={img.memory_entry_image_id}
                source={{ uri: img.image_url }}
                style={{
                  width: 120,
                  height: 120,
                  marginRight: 8,
                  borderRadius: 8,
                  backgroundColor: "#eee",
                }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : (
          <Text style={{ fontStyle: "italic", color: "#999" }}>이미지 없음</Text>
        )}
      </Pressable>

      {/* 아래에 추가 버튼 */}
      <Button
        title="+ 아래에 추가"
        onPress={() =>
          router.push({
            pathname: "/camera",
            params: {
              memory_id: todayMemory.memory.memory_id,
              insert_index: String(idx + 1),
            },
          })
        }
      />
    </View>
  );
})}
        </>
      ) : (
        <Text style={{ marginTop: 16 }}>오늘 메모리 없음</Text>
      )}

      <Button title="로그아웃" onPress={handleLogout} style={{ marginTop: 32 }} />
    </ScrollView>
  );
}
