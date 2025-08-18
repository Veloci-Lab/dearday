import { useAuthStore } from "@/utils/authStore";
import { useOnboardingFooter } from "@/utils/onboardingFooterStore";
import { supabase } from "@/utils/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, router } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function OnboardingSecondScreen() {
  // const { profileId } = useAuthStore();
  // const setHasCompletedOnboarding = useAuthStore((s) => s.setHasCompletedOnboarding);
  const setFooter = useOnboardingFooter((s) => s.setFooter);
  const { profileId, setHasCompletedOnboarding } = useAuthStore();

  const [sleepTime, setSleepTime] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const formatTime = (date: Date | null) =>
    date?.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
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
          // ✅ 로컬/스토어에 온보딩 완료 반영 + 메인으로 이동
          await AsyncStorage.setItem("onboarding.completed", "1");
          setHasCompletedOnboarding(true);
          router.replace("/(tabs)");
        },
      });
    }, [sleepTime, profileId])
  );

  return (
    <View style={s.container}>
      {/* 헤더 텍스트 */}
      <View style={{ marginBottom: 24 }}>
        <Text style={s.h1}>오늘 하루를 기록할 시간을 알려주세요</Text>
        <Text style={s.sub}>이 시간에 맞추어 하루를 기록할 수 있도록 알람을 보내드릴게요.</Text>
        <Text style={s.sub}>이 시간이 아니어도 아무때나 기록할 수 있어요.</Text>
      </View>

      {/* 라벨 */}
      <Text style={s.label}>하루 기록 시간</Text>

      {/* 시간 선택 버튼 */}
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[
          s.input,
          { justifyContent: "center" },
          sleepTime && { borderColor: "#5B8DEF" }
        ]}
      >
        <Text style={{ fontFamily: 'Pretendard-Regular', color: sleepTime ? "#0F172A" : "#B4BCC6" }}>
          {formatTime(sleepTime)}
        </Text>
      </Pressable>

      {showPicker && (
        <View
          // iOS에서 휠 높이/배경 보장 (가독성/시트화 방지)
          style={s.pickerWrap}
        >
          <DateTimePicker
            value={sleepTime ?? new Date()}
            mode="time"
            is24Hour={false}
            display="spinner" // 두 플랫폼 모두 스피너 시도
            onChange={(event, selectedDate) => {
              setShowPicker(false);
              if (selectedDate) setSleepTime(selectedDate);
            }}
            {...(Platform.OS === "ios"
              ? ({ themeVariant: "light", textColor: "#111" } as any)
              : {})}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    // paddingTop: 36,
    backgroundColor: "#fff",
  },
  h1: {
    fontFamily: "Pretendard-Bold",
    fontSize: 20,
    lineHeight: 28,
    //fontWeight: "700",
    color: "#0F172A",
  },
  sub: {
    fontFamily: "Pretendard-Regular",
    marginTop: 6,
    fontSize: 13,
    color: "#929292",
  },
  label: {
    fontFamily: "Pretendard-Regular",
    fontSize: 13,
    color: "#0D0D0D",
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  pickerWrap: {
    backgroundColor: "#fff",
    height: Platform.OS === "ios" ? 220 : undefined, // iOS에서 휠 높이 보장
    justifyContent: "center",
    borderRadius: 10,
    marginTop: 8,
  }
});
