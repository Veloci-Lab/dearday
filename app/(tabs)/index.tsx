import { useAuthStore } from "@/utils/authStore";
import { getKSTDateString } from '@/utils/date';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Button, Image, ScrollView, Text, View } from "react-native";
import { supabase } from "../../utils/supabase";

export default function index() {
  const router = useRouter();
  const { logOut, profileId } = useAuthStore();
  const [profile, setProfile] = useState<{ profile_id : string; name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayMemory, setTodayMemory] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("profile_id", profileId)
        .single();

      if (error) {
        Alert.alert("프로필 불러오기 실패", error.message);
      } else {
        setProfile(data);
      }

      setLoading(false);
    };

    loadProfile();
  }, []);

  // ✅ 오늘의 memory + memory_entries 불러오는 함수
  const loadToday = async (profileId: string) => {
    const today = getKSTDateString();

    const { data, error } = await supabase
  .from("memories")
  .select(`
       *,
    memory_entries(*)
    
  `)
  .eq("profile_id", profileId)
  .eq("date", today)
  .maybeSingle();
  console.log(today);
  
  console.log(data);

    if (error) {
      Alert.alert("오늘의 메모리 불러오기 실패", error.message);
      // TODO: 만약 없으면 생성해주기
    } else {
      setTodayMemory(data);
    }
  };

  useEffect(() => {
    if (profile?.profile_id) {
      loadToday(profile.profile_id);
    }
  }, [profile]);

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
    ) : profile ? (
      <>
        <Text>이름: {profile.name}</Text>
        {todayMemory ? (
          <>
            <Text style={{ marginTop: 16 }}>today 데이터 있음</Text>
            <Text>엔트리 수: {todayMemory.memory_entries?.length ?? 0}</Text>

            {todayMemory.memory_entries?.length > 0 ? (
              todayMemory.memory_entries.map((entry: any) => (
                <View
                  key={entry.memory_entry_id}
                  style={{ marginTop: 20, alignItems: "center" }}
                >
                  {entry.image_url ? (
                    <Image
                      source={{ uri: entry.image_url }}
                      style={{ width: 300, height: 300, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text>이미지 없음</Text>
                  )}
                  <Text style={{ marginTop: 8, fontSize: 16 }}>{entry.content?entry.content:'텍스트없음'}</Text>
                </View>
              ))
            ) : (
              <Text style={{ marginTop: 16 }}>엔트리 없음</Text>
            )}
          </>
        ) : (
          <Text style={{ marginTop: 16 }}>오늘 메모리 없음</Text>
        )}
      </>
    ) : (
      <Text>프로필 없음</Text>
    )}

    <Button title="로그아웃" onPress={handleLogout} />
  </ScrollView>
);
}
