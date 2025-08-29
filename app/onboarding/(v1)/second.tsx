// import { useAuthStore } from "@/utils/authStore";
// import { useOnboardingFooter } from "@/utils/onboardingFooterStore";
// import { supabase } from "@/utils/supabase";
// import DateTimePicker from "@react-native-community/datetimepicker";
// import { useFocusEffect } from "expo-router";
// import { useCallback, useState } from "react";
// import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

// export default function OnboardingSecondScreen() {
//   const { profileId } = useAuthStore();
//   const setHasCompletedOnboarding = useAuthStore((s) => s.setHasCompletedOnboarding);
//   const setFooter = useOnboardingFooter((s) => s.setFooter);

//   const [sleepTime, setSleepTime] = useState<Date | null>(null);
//   const [showPicker, setShowPicker] = useState(false);

//   const formatTime = (date: Date | null) =>
//     date?.toLocaleTimeString("en-US", {
//       hour: "2-digit",
//       minute: "2-digit",
//       hour12: true,
//     }) ?? "시간을 선택해주세요";

//   useFocusEffect(
//     useCallback(() => {
//       setFooter({
//         label: "완료",
//         progress: 1,
//         onPress: async () => {
//           if (!profileId) {
//             Alert.alert("오류", "사용자 정보가 없습니다.");
//             return;
//           }

//           const { error } = await supabase
//             .from("profiles")
//             .update({
//               sleep_time: sleepTime?.toTimeString().slice(0, 8) ?? null,
//               has_completed_onboarding: true,
//             })
//             .eq("profile_id", profileId);

//           if (error) {
//             console.log("업데이트 실패", error.message);
//             return;
//           }

//           setHasCompletedOnboarding(true);
//         },
//       });
//     }, [sleepTime, profileId])
//   );

//   return (
//     <View style={s.container}>
//       {/* 헤더 텍스트 */}
//       <View style={{ marginBottom: 24 }}>
//         <Text style={s.h1}>오늘 하루를 기록할 시간을 알려주세요</Text>
//         <Text style={s.sub}>이 시간에 맞추어 하루를 기록할 수 있도록 알람을 보내드릴게요.</Text>
//         <Text style={s.sub}>이 시간이 아니어도 아무때나 기록할 수 있어요.</Text>
//       </View>

//       {/* 라벨 */}
//       <Text style={s.label}>하루 기록 시간</Text>

//       {/* 시간 선택 버튼 */}
//       <Pressable
//         onPress={() => setShowPicker(true)}
//         style={[
//           s.input,
//           { justifyContent: "center" },
//           sleepTime && { borderColor: "#5B8DEF" }
//         ]}
//       >
//         <Text style={{ fontFamily: 'Pretendard-Regular', color: sleepTime ? "#0F172A" : "#B4BCC6" }}>
//           {formatTime(sleepTime)}
//         </Text>
//       </Pressable>

//       {showPicker && (
//         <DateTimePicker
//           value={sleepTime ?? new Date()}
//           mode="time"
//           is24Hour={false}
//           display="spinner"
//           onChange={(event, selectedDate) => {
//             setShowPicker(false);
//             if (selectedDate) setSleepTime(selectedDate);
//           }}
//         />
//       )}
//     </View>
//   );
// }

// const s = StyleSheet.create({
//   container: {
//     flex: 1,
//     paddingHorizontal: 20,
//     // paddingTop: 36,
//     backgroundColor: "#fff",
//   },
//   h1: {
//     fontFamily: "Pretendard-Bold",
//     fontSize: 20,
//     lineHeight: 28,
//     //fontWeight: "700",
//     color: "#0F172A",
//   },
//   sub: {
//     fontFamily: "Pretendard-Regular",
//     marginTop: 6,
//     fontSize: 13,
//     color: "#929292",
//   },
//   label: {
//     fontFamily: "Pretendard-Regular",
//     fontSize: 13,
//     color: "#0D0D0D",
//     marginBottom: 8,
//   },
//   input: {
//     height: 44,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: "#E2E8F0",
//     paddingHorizontal: 12,
//     backgroundColor: "#fff",
//   },
// });

import { useAuthStore } from "@/utils/authStore";
import { useOnboardingFooter } from "@/utils/onboardingFooterStore";
import { supabase } from "@/utils/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DatePicker from 'react-native-date-picker';

export default function OnboardingSecondScreen() {
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
        // progress: 1, // progress는 이제 화면에서 직접 관리하므로 제거합니다.
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
          await AsyncStorage.setItem("onboarding.completed", "1");
          setHasCompletedOnboarding(true);
          router.replace("/(tabs)");
        },
      });
    }, [sleepTime, profileId, setFooter, setHasCompletedOnboarding])
  );

  // return (
  //   <View style={s.container}>
  //     {/* 진행률 바 */}
  //     <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
  //       <View style={s.progressBarOuter}>
  //         <View
  //           style={[s.progressBarInner, { width: '100%' }]} // 100% 채움
  //         />
  //       </View>
  //     </View>

  //     {/* 콘텐츠 영역 */}
  //     <View style={{ paddingHorizontal: 20 }}>
  //       {/* 헤더 텍스트 */}
  //       <View style={{ marginBottom: 36 }}>
  //         <Text style={s.h1}>오늘 하루를 기록할 시간을 알려주세요</Text>
  //         <Text style={s.sub}>이 시간에 맞추어 하루를 기록할 수 있도록 알람을 보내드릴게요.</Text>
  //         <Text style={s.sub}>이 시간이 아니어도 아무때나 기록할 수 있어요.</Text>
  //       </View>

  //       {/* 라벨 */}
  //       <Text style={s.label}>하루 기록 시간</Text>

  //       {/* 시간 선택 버튼 */}
  //       <Pressable
  //         onPress={() => setShowPicker(true)}
  //         style={[
  //           s.input,
  //           { justifyContent: "center" },
  //           sleepTime && { borderColor: "#5B8DEF" }
  //         ]}
  //       >
  //         <Text style={{ fontFamily: 'Pretendard-Regular', color: sleepTime ? "#0F172A" : "#B4BCC6" }}>
  //           {formatTime(sleepTime)}
  //         </Text>
  //       </Pressable>
  //     </View>

  //     {showPicker && (
  //         <DatePicker
  //           modal
  //           open={showPicker}
  //           date={sleepTime ?? new Date()}
  //           mode="time"
  //           onConfirm={(date) => {
  //             setShowPicker(false);
  //             setSleepTime(date);
  //           }}
  //           onCancel={() => {
  //             setShowPicker(false);
  //           }}
  //           title="시간 선택"
  //           confirmText="확인"
  //           cancelText="취소"
  //         />
  //     )}
  //   </View>
  // );
    return (
    <View style={s.container}>
      {/* 진행률 바 */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <View style={s.progressBarOuter}>
          <View
            style={[s.progressBarInner, { width: '100%' }]} // 100% 채움
          />
        </View>
      </View>

      {/* 콘텐츠 영역 */}
      <View style={{ paddingHorizontal: 20 }}>
        {/* 헤더 텍스트 */}
        <View style={{ marginBottom: 36 }}>
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
      </View>

      {showPicker && (
          <DatePicker
            modal
            open={showPicker}
            date={sleepTime ?? new Date()}
            mode="time"
            onConfirm={(date) => {
              setShowPicker(false);
              setSleepTime(date);
            }}
            onCancel={() => {
              setShowPicker(false);
            }}
            title="시간 선택"
            confirmText="확인"
            cancelText="취소"
          />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
    backgroundColor: "#fff",
  },
  // 진행률 바 스타일
  progressBarOuter: {
    height: 6,
    backgroundColor: "#F2F2F2",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarInner: {
    height: "100%",
    backgroundColor: "#5B8DEF",
  },
  h1: {
    fontFamily: "Pretendard-Bold",
    fontSize: 20,
    lineHeight: 28,
    color: "#0F172A",
  },
  sub: {
    fontFamily: "Pretendard-Regular",
    marginTop: 8,
    fontSize: 13,
    color: "#929292",
    lineHeight: 18, // 행간 추가
  },
  label: {
    fontFamily: "Pretendard-Regular",
    fontSize: 13,
    color: "#0D0D0D",
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  pickerWrap: {
    backgroundColor: "#fff",
    height: Platform.OS === "ios" ? 220 : undefined,
    justifyContent: "center",
    borderRadius: 10,
    marginTop: 8,
  }
});
