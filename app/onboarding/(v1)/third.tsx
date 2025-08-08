// app/onboarding/(v1)/third.tsx
import { useAuthStore } from "@/utils/authStore";
import { generateNotificationTimes } from "@/utils/createNotifications";
import { useOnboardingFooter } from "@/utils/onboardingFooterStore";
import { supabase } from "@/utils/supabase";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function OnboardingThirdScreen() {
  const { profileId } = useAuthStore();
  const setHasCompletedOnboarding = useAuthStore((state) => state.setHasCompletedOnboarding);
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
        progress: 1,
        onPress: async () => {
          await supabase
            .from("profiles")
            .update({ notif_count: notifCount, has_completed_onboarding: true })
            .eq("profile_id", profileId);

          // TODO: 오늘, 내일 notification 생성
          // 여기서 조회? 유틸에서 조회?
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("sleep_time, wake_time, work_start_time, work_end_time, notif_count")
            .eq("profile_id", profileId)
            .single();

          if (error || !profile) {
            console.error("❌ 프로필 정보 조회 실패:", error?.message);
            return null;
          }

          const {
            sleep_time,
            wake_time,
            work_start_time,
            work_end_time,
            notif_count,
          } = profile;

          const times = generateNotificationTimes([
            [sleep_time, wake_time],
            [work_start_time, work_end_time],
          ], notif_count);
          console.log(times);
          // 일단 가입 당일은 개수만큼 생성하고 이전 시간에 온 알림은 무시 ( 발송x).
          // 다음날은 개수만큼 생성.

          // 알림 횟수 수정시
          // 일단 아직 안보낸 알림들 다 삭제.
          // 그러면서 날짜 가져옴 예를들어 오늘, 다음날 알림이 예정되어 있었다 -> 그럼 오늘, 다음날 알림 다시 생성
          // 내일거는 새로 생성하면됨.
          // 오늘거는 일단 오늘 알림 몇번 보냈는지 가져오고
          // 설정한 알림 횟수 - 오늘 보낸 횟수가 1보다 크면 생성 그 개수만큼 생성하는데 지금 시간 이후로 + 시간 피해서.,
          // 아니면 그냥 끝
          // 하고 알려주자. 이미 N개의 알림을 받아서 더이상 보내지 않겟다. 혹은 N개 더 보낸다.

          // 시간 수정시.
          // 일단 지금 시간 이후 알림들 다삭제.
          // 그러면서 알림 예정되어 있던 날짜 갖옴. 
          // 그게 오늘 이후면 그냥 그날짜 다시 생성
          // 그게 오늘이면
          // 수정한 시간 반영해서 (받을 알림 - 오늘 보낸 알림)개 만큼 다시 생성 

          // 타임존 수정시 -> 일단 고려 x 
  
          setHasCompletedOnboarding(true);

          // router.push("/");
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
        {Array.from({ length: 11 }, (_, i) => i).map((value) => (
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
