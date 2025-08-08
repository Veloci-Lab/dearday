// app/onboarding/(v1)/third.tsx
import { useAuthStore } from "@/utils/authStore";
import { useOnboardingFooter } from "@/utils/onboardingFooterStore";
import { supabase } from "@/utils/supabase";
import { Picker } from "@react-native-picker/picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

export default function OnboardingThirdScreen() {
  const { profileId } = useAuthStore();
  const setFooter = useOnboardingFooter((s) => s.setFooter);

  const [notifCount, setNotifCount] = useState<number>(10); // 기본값 10회

  // ✅ Supabase에서 기존 알림 횟수 불러오기
  useEffect(() => {
    const fetchNotifCount = async () => {
      if (!profileId) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("notif_count")
        .eq("profile_id", profileId)
        .single();

      if (error) {
        console.error("알림 횟수 불러오기 실패:", error.message);
        return;
      }

      if (data?.notif_count && typeof data.notif_count === "number") {
        setNotifCount(data.notif_count);
      }
    };

    fetchNotifCount();
  }, [profileId]);

  // ✅ 하단 버튼 설정
  useFocusEffect(
    useCallback(() => {
      setFooter({
        label: "완료",
        progress: 0.75,
        onPress: async () => {
          const { error } = await supabase
            .from("profiles")
            .update({ notif_count: notifCount })
            .eq("profile_id", profileId);

          if (error) {
            Alert.alert("업데이트 실패", error.message);
            return;
          }

          router.push("/onboarding/(v1)/fourth");
        },
      });
    }, [notifCount, profileId])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>하루에 받을 알림 횟수를 선택하세요</Text>
      <Picker
        selectedValue={notifCount}
        onValueChange={(value) => setNotifCount(value)}
        style={styles.picker}
      >
        {Array.from({ length: 20 }, (_, i) => i + 1).map((value) => (
          <Picker.Item key={value} label={`${value}회`} value={value} />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 18, marginBottom: 16, textAlign: "center" },
  picker: { height: 180 },
});
