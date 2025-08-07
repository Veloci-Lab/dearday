import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";

export default function MypageScreen() {
  const { profileId } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!profileId) return;

    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("profile_id", profileId)
        .single();

      if (error) {
        console.error("❌ 프로필 불러오기 오류:", error.message);
      } else {
        setProfile(data);
      }
      setLoading(false);

      console.log(profile);
      
    };

    fetchProfile();
  }, [profileId]);

  if (loading) {
    return (
      <View>
        <ActivityIndicator />
      </View>
    );
  }

  if (!profile) {
    return (
      <View>
        <Text>프로필을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <View>
        <Image
  source={{ uri: profile.avatar_url }}
  style={{ width: 100, height: 100, borderRadius: 50 }}
/>

      <Text>이름: {profile. name}</Text>
      <Text>닉네임: {profile.nickname}</Text>
      <Text>이메일: {profile.email}</Text>
      {/* 필요한 필드를 여기에 추가 */}
    </View>
  );
}
