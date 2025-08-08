import { useAuthStore } from "@/utils/authStore";
import { useOnboardingFooter } from "@/utils/onboardingFooterStore";
import { supabase } from "@/utils/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";

export default function OnboardingSecondScreen() {
  const { profileId } = useAuthStore();
  const setHasCompletedOnboarding = useAuthStore((s) => s.setHasCompletedOnboarding);
  const setFooter = useOnboardingFooter((s) => s.setFooter);

  const [sleepTime, setSleepTime] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const formatTime = (date: Date | null) =>
    date?.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }) ?? "시간을 선택해주세요";

  useFocusEffect(
    useCallback(() => {
      setFooter({
        label: "완료",
        progress: 1,
        onPress: async () => {
          if (!profileId) {
            Alert.alert("오류", "사용자 정보가 없습니다.");
            return;
          }

          const { error } = await supabase
            .from("profiles")
            .update({
              sleep_time: sleepTime?.toTimeString().slice(0, 8) ?? null,
              has_completed_onboarding: true,
            })
            .eq("profile_id", profileId);

          if (error) {
            console.log("업데이트 실패", error.message);
            return;
          }

          setHasCompletedOnboarding(true);
        },
      });
    }, [sleepTime, profileId])
  );

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 16, marginBottom: 8 }}>수면 시간</Text>

      <Pressable
        onPress={() => setShowPicker(true)}
        style={{
          padding: 16,
          borderWidth: 1,
          borderRadius: 8,
          borderColor: "#ccc",
          marginBottom: 20,
        }}
      >
        <Text>{formatTime(sleepTime)}</Text>
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={sleepTime ?? new Date()}
          mode="time"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) setSleepTime(selectedDate);
          }}
        />
      )}
    </View>
  );
}
