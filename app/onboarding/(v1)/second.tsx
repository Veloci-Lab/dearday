import { useAuthStore } from "@/utils/authStore";
import { useOnboardingFooter } from "@/utils/onboardingFooterStore";
import { supabase } from "@/utils/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Platform, Switch, Text, View } from "react-native";

export default function OnboardingSecondScreen() {
  const { profileId } = useAuthStore();
  const setFooter = useOnboardingFooter((s) => s.setFooter);

  const [sleepTime, setSleepTime] = useState<Date | null>(null);
  const [wakeTime, setWakeTime] = useState<Date | null>(null);
  const [workStartTime, setWorkStartTime] = useState<Date | null>(null);
  const [workEndTime, setWorkEndTime] = useState<Date | null>(null);

  const [skipSleepSetting, setSkipSleepSetting] = useState(false);
  const [skipWorkSetting, setSkipWorkSetting] = useState(true);

  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [showWorkStartPicker, setShowWorkStartPicker] = useState(false);
  const [showWorkEndPicker, setShowWorkEndPicker] = useState(false);

  const formatTime = (date: Date | null) =>
    date?.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) ?? "시간을 선택해주세요";

  // 문자열 "HH:MM:SS" → 로컬 시간 Date 객체로 변환
  const parseTimeStringToDate = (timeStr: string | null): Date | null => {
    if (!timeStr) return null;
    const [hh, mm, ss] = timeStr.split(":").map(Number);
    const d = new Date();
    d.setHours(hh, mm, ss || 0, 0);
    return d;
  };

  // ✅ 초기 데이터 불러오기
  useEffect(() => {
    const fetchProfileTimes = async () => {
      if (!profileId) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("sleep_time, wake_time, work_start_time, work_end_time")
        .eq("profile_id", profileId)
        .single();

      if (error) {
        console.error("시간 설정 불러오기 실패:", error.message);
        return;
      }

      const s = parseTimeStringToDate(data.sleep_time);
      const w = parseTimeStringToDate(data.wake_time);
      const ws = parseTimeStringToDate(data.work_start_time);
      const we = parseTimeStringToDate(data.work_end_time);

      setSleepTime(s);
      setWakeTime(w);
      setWorkStartTime(ws);
      setWorkEndTime(we);

      setSkipSleepSetting(!s && !w);
      setSkipWorkSetting(!ws && !we);
    };

    fetchProfileTimes();
  }, [profileId]);

  const handleNext = async () => {
    if (!profileId) {
      Alert.alert("오류", "사용자 정보가 없습니다.");
      return;
    }

    // 유효성 검사
    if (!skipSleepSetting && (!sleepTime || !wakeTime || wakeTime <= sleepTime)) {
      Alert.alert("수면 시간 오류", "수면 시간과 기상 시간을 바르게 설정해주세요.");
      return;
    }

    if (!skipWorkSetting && (!workStartTime || !workEndTime || workEndTime <= workStartTime)) {
      Alert.alert("그 외 시간 오류", "시작과 종료 시간을 바르게 설정해주세요.");
      return;
    }

    const updates = {
      sleep_time: skipSleepSetting ? null : sleepTime?.toTimeString().slice(0, 8) ?? null,
      wake_time: skipSleepSetting ? null : wakeTime?.toTimeString().slice(0, 8) ?? null,
      work_start_time: skipWorkSetting ? null : workStartTime?.toTimeString().slice(0, 8) ?? null,
      work_end_time: skipWorkSetting ? null : workEndTime?.toTimeString().slice(0, 8) ?? null,
    };

    const { error } = await supabase.from("profiles").update(updates).eq("profile_id", profileId);
    if (error) {
      Alert.alert("업데이트 실패", error.message);
      return;
    }

    router.push("/onboarding/(v1)/third");
  };

  useFocusEffect(
    useCallback(() => {
      setFooter({
        label: "완료",
        progress: 0.5,
        onPress: handleNext,
      });
    }, [
      sleepTime,
      wakeTime,
      workStartTime,
      workEndTime,
      skipSleepSetting,
      skipWorkSetting,
      profileId,
    ])
  );

  return (
    <View style={{ flex: 1, padding: 24 }}>
      {/* 수면 */}
      <Text style={{ fontSize: 20, marginBottom: 20 }}>수면 시간</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Switch
          value={skipSleepSetting}
          onValueChange={(v) => {
            setSkipSleepSetting(v);
            if (v) {
              setSleepTime(null);
              setWakeTime(null);
            }
          }}
        />
        <Text style={{ marginLeft: 10 }}>설정하지 않음</Text>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Button
          title={`수면 시간: ${formatTime(sleepTime)}`}
          onPress={() => !skipSleepSetting && setShowSleepPicker(true)}
          disabled={skipSleepSetting}
        />
        {showSleepPicker && (
          <DateTimePicker
            value={sleepTime ?? new Date()}
            mode="time"
            is24Hour
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              setShowSleepPicker(false);
              if (selectedDate) setSleepTime(selectedDate);
            }}
          />
        )}
      </View>

      <View style={{ marginBottom: 24 }}>
        <Button
          title={`기상 시간: ${formatTime(wakeTime)}`}
          onPress={() => !skipSleepSetting && setShowWakePicker(true)}
          disabled={skipSleepSetting}
        />
        {showWakePicker && (
          <DateTimePicker
            value={wakeTime ?? new Date()}
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

      {/* 그 외 */}
      <Text style={{ fontSize: 20, marginBottom: 20 }}>그 외 시간(선택)</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Switch
          value={skipWorkSetting}
          onValueChange={(v) => {
            setSkipWorkSetting(v);
            if (v) {
              setWorkStartTime(null);
              setWorkEndTime(null);
            }
          }}
        />
        <Text style={{ marginLeft: 10 }}>설정하지 않음</Text>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Button
          title={`시작: ${formatTime(workStartTime)}`}
          onPress={() => !skipWorkSetting && setShowWorkStartPicker(true)}
          disabled={skipWorkSetting}
        />
        {showWorkStartPicker && (
          <DateTimePicker
            value={workStartTime ?? new Date()}
            mode="time"
            is24Hour
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              setShowWorkStartPicker(false);
              if (selectedDate) setWorkStartTime(selectedDate);
            }}
          />
        )}
      </View>

      <View>
        <Button
          title={`종료: ${formatTime(workEndTime)}`}
          onPress={() => !skipWorkSetting && setShowWorkEndPicker(true)}
          disabled={skipWorkSetting}
        />
        {showWorkEndPicker && (
          <DateTimePicker
            value={workEndTime ?? new Date()}
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
    </View>
  );
}
