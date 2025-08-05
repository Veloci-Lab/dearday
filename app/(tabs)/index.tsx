import { useAuthStore } from "@/utils/authStore";
import { getLocalDateString } from '@/utils/date';
import { getUserMemoryBundleByDate } from '@/utils/memoryBundles';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Button, Image, ScrollView, Text, View } from "react-native";
import { supabase } from "../../utils/supabase";

export default function indexScreen() {
  const router = useRouter();
  const { logOut, profileId } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [todayMemory, setTodayMemory] = useState<any>(null);

  // 오늘의 memory 관련 데이터 불러오기
  const loadToday = async (profileId: string) => {
    try {
      const today = getLocalDateString(); // 추후 필요시 timezone 추가
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

          {todayMemory.entries.length > 0 ? (
            todayMemory.entries.map(({ entry, images }: any) => (
              <View
                key={entry.memory_entry_id}
                style={{ marginTop: 20, alignItems: "center" }}
              >
                {images[0]?.image_url ? (
                  <Image
                    source={{ uri: images[0].image_url }}
                    style={{ width: 300, height: 300, borderRadius: 12 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text>이미지 없음</Text>
                )}
                <Text style={{ marginTop: 8, fontSize: 16 }}>
                  {entry.content ?? '텍스트 없음'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ marginTop: 16 }}>엔트리 없음</Text>
          )}
        </>
      ) : (
        <Text style={{ marginTop: 16 }}>오늘 메모리 없음</Text>
      )}

      <Button title="로그아웃" onPress={handleLogout} />
    </ScrollView>
  );
}
