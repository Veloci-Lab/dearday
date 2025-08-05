import { useAuthStore } from "@/utils/authStore";
import { createMemory } from '@/utils/createMemory';
import { getLocalDateString, localToUTC } from '@/utils/date';
import { registerForPushNotificationsAsync } from '@/utils/registerForPushNotificationsAsync';
import React, { useState } from 'react';
import { Alert, Button, Platform, Text, View } from "react-native";
import { supabase } from "../../utils/supabase";

export default function OnboardingNotificationPermissionScreen() {
  const { profileId } = useAuthStore();
  const setHasCompletedOnboarding = useAuthStore((state) => state.setHasCompletedOnboarding);
  const [pushToken, setPushToken] = useState<string | null>(null);

  const handleCompleteOnboarding = async () => {
    if (!profileId) return;

    // 추후 필요시 timezone 추가
    const today = getLocalDateString();      // 오늘
    const tomorrow = getLocalDateString(1);  // 내일
    console.log(today);
    console.log(tomorrow);

    try {
      await createMemory(supabase, profileId, today, localToUTC);
      await createMemory(supabase, profileId, tomorrow, localToUTC);
    } catch (error) {
      Alert.alert("오류", "오늘의 memory 데이터를 생성하지 못했습니다.");
      return;
    }

    // const { error: updateError } = await supabase
    //   .from("profiles")
    //   .update({ has_completed_onboarding: true })
    //   .eq("profile_id", profileId);

    // if (updateError) {
    //   Alert.alert("오류", "온보딩 완료 상태를 저장하지 못했습니다.");
    // }

    setHasCompletedOnboarding(true);
  };

  const handlePress = async () => {
    if (!profileId) return;

    const token = await registerForPushNotificationsAsync();
    if (!token) return;

    setPushToken(token);

    let updateColumn = '';
    if (Platform.OS === 'android') {
      updateColumn = 'expo_push_token_android';
    } else if (Platform.OS === 'ios') {
      updateColumn = 'expo_push_token_ios';
    } else {
      Alert.alert('오류', '웹에서는 푸시 알림 기능을 사용할 수 없습니다.');
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ [updateColumn]: token })
      .eq('profile_id', profileId);

    if (updateError) {
      Alert.alert('업데이트 실패', updateError.message);
    } else {
      Alert.alert('완료', '푸시 토큰이 저장되었습니다.');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>마지막으로 알림권한이 필요해요 어쩌구 저쩌구</Text>
      <Button title="알림 권한 요청 & 토큰 발급" onPress={handlePress} />
      {pushToken && (
        <Text style={{ marginTop: 10, fontSize: 12, color: 'gray' }}>
          Token: {pushToken}
        </Text>
      )}
      <Button title="Complete onboarding" onPress={handleCompleteOnboarding} />
    </View>
  );
}
