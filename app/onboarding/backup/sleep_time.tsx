import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Button, Platform, Switch, Text, View } from "react-native";

export default function OnboardingSleepTimeScreen() {
  const { profileId } = useAuthStore();

  // 수면 시간 상태
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

  // 근무 시간 상태
  const [workStartTime, setWorkStartTime] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [workEndTime, setWorkEndTime] = useState(() => {
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    return d;
  });

  // Picker 및 스위치 상태
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [showWorkStartPicker, setShowWorkStartPicker] = useState(false);
  const [showWorkEndPicker, setShowWorkEndPicker] = useState(false);

  const [skipSleepSetting, setSkipSleepSetting] = useState(false);
  const [skipWorkSetting, setSkipWorkSetting] = useState(false);

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

    // ✅ 유효성 검사
    if (!skipSleepSetting) {
      const sleep = new Date(sleepTime);
      const wake = new Date(wakeTime);
      if (wake <= sleep) wake.setDate(wake.getDate() + 1);
      const diffMin = (wake.getTime() - sleep.getTime()) / 1000 / 60;
      if (diffMin < 1 || diffMin > 540) {
        Alert.alert("수면시간 오류", "수면시간은 최소 1분 이상, 최대 9시간까지만 가능합니다.");
        return;
      }
    }

    if (!skipWorkSetting) {
      const start = new Date(workStartTime);
      const end = new Date(workEndTime);
      if (end <= start) end.setDate(end.getDate() + 1);
      const diffMin = (end.getTime() - start.getTime()) / 1000 / 60;
      if (diffMin < 1 || diffMin > 540) {
        Alert.alert("근무시간 오류", "근무시간은 최소 1분 이상, 최대 9시간까지만 가능합니다.");
        return;
      }
    }

    // ✅ Supabase 업데이트
    const updates = {
      sleep_time: skipSleepSetting ? null : sleepTime.toTimeString().slice(0, 8),
      wake_time: skipSleepSetting ? null : wakeTime.toTimeString().slice(0, 8),
      work_start_time: skipWorkSetting ? null : workStartTime.toTimeString().slice(0, 8),
      work_end_time: skipWorkSetting ? null : workEndTime.toTimeString().slice(0, 8),
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
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
        <Switch value={skipSleepSetting} onValueChange={setSkipSleepSetting} />
        <Text style={{ marginLeft: 10 }}>설정하지 않음</Text>
      </View>

      <Button
        title={`수면 시간: ${formatTime(sleepTime)}`}
        onPress={() => !skipSleepSetting && setShowSleepPicker(true)}
        disabled={skipSleepSetting}
      />
      <View style={{ height: 12 }} />
      <Button
        title={`기상 시간: ${formatTime(wakeTime)}`}
        onPress={() => !skipSleepSetting && setShowWakePicker(true)}
        disabled={skipSleepSetting}
      />

      <View style={{ height: 32 }} />
      <Text style={{ fontSize: 20, marginBottom: 20 }}>근무 시간 설정</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
        <Switch value={skipWorkSetting} onValueChange={setSkipWorkSetting} />
        <Text style={{ marginLeft: 10 }}>설정하지 않음</Text>
      </View>

      <Button
        title={`근무 시작: ${formatTime(workStartTime)}`}
        onPress={() => !skipWorkSetting && setShowWorkStartPicker(true)}
        disabled={skipWorkSetting}
      />
      <View style={{ height: 12 }} />
      <Button
        title={`근무 종료: ${formatTime(workEndTime)}`}
        onPress={() => !skipWorkSetting && setShowWorkEndPicker(true)}
        disabled={skipWorkSetting}
      />

      <View style={{ height: 32 }} />
      <Button title="다음" onPress={handleNext} disabled={!profileId} />

      {/* 피커들 */}
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
      {showWorkStartPicker && (
        <DateTimePicker
          value={workStartTime}
          mode="time"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowWorkStartPicker(false);
            if (selectedDate) setWorkStartTime(selectedDate);
          }}
        />
      )}
      {showWorkEndPicker && (
        <DateTimePicker
          value={workEndTime}
          mode="time"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowWorkEndPicker(false);
            if (selectedDate) setWorkEndTime(selectedDate);
          }}
        />
      )}
    </View>
  );
}
