import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Button, Platform, Switch, Text, View } from "react-native";

export default function OnboardingSleepTimeScreen() {
  const { profileId } = useAuthStore();
  const [sleepTime, setSleepTime] = useState(() => {
    const d = new Date();
    d.setHours(22, 0, 0, 0);
    return d;
  });

  const [wakeTime, setWakeTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(6, 0, 0, 0);
    return d;
  });

  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [skipSleepSetting, setSkipSleepSetting] = useState(false);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleNext = async () => {
    if (!profileId) {
      Alert.alert("오류", "사용자 정보가 없습니다.");
      return;
    }

    // ✅ 유효성 검사 (1분 이상 ~ 12시간 이하)
    if (!skipSleepSetting) {
      const sleep = new Date(sleepTime);
      const wake = new Date(wakeTime);

      // 날짜 보정
      if (wake <= sleep) {
        wake.setDate(wake.getDate() + 1);
      }

      const diffMin = (wake.getTime() - sleep.getTime()) / 1000 / 60;

      if (diffMin < 1) {
        Alert.alert("수면시간 오류", "수면시간은 최소 1분 이상이어야 합니다.");
        return;
      }

      if (diffMin > 720) {
        Alert.alert("수면시간 오류", "수면시간은 최대 12시간까지만 가능합니다.");
        return;
      }
    }

    // ✅ Supabase 업데이트
    const updates = skipSleepSetting
      ? { sleep_time: null, wake_time: null }
      : {
          sleep_time: sleepTime.toTimeString().slice(0, 8), // HH:MM:SS
          wake_time: wakeTime.toTimeString().slice(0, 8),
        };

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("profile_id", profileId);

    if (error) {
      Alert.alert("업데이트 실패", error.message);
      return;
    }

    router.push("/onboarding/notification_permission");
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>수면 시간 설정</Text>

      {/* 체크박스: 설정하지 않음 */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
        <Switch value={skipSleepSetting} onValueChange={setSkipSleepSetting} />
        <Text style={{ marginLeft: 10 }}>설정하지 않음</Text>
      </View>

      <Button
        title={`수면 시간: ${formatTime(sleepTime)}`}
        onPress={() => !skipSleepSetting && setShowSleepPicker(true)}
        disabled={skipSleepSetting}
      />
      <View style={{ height: 16 }} />
      <Button
        title={`기상 시간: ${formatTime(wakeTime)}`}
        onPress={() => !skipSleepSetting && setShowWakePicker(true)}
        disabled={skipSleepSetting}
      />
      <View style={{ height: 32 }} />
      <Button title="다음" onPress={handleNext} disabled={!profileId} />

      {showSleepPicker && (
        <DateTimePicker
          value={sleepTime}
          mode="time"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowSleepPicker(false);
            if (selectedDate) setSleepTime(selectedDate);
          }}
        />
      )}

      {showWakePicker && (
        <DateTimePicker
          value={wakeTime}
          mode="time"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowWakePicker(false);
            if (selectedDate) setWakeTime(selectedDate);
          }}
        />
      )}
    </View>
  );
}
