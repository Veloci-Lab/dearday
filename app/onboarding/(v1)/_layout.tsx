// import { useOnboardingFooter } from "@/utils/onboardingFooterStore";
// import { Stack } from "expo-router";
// import { Text, TouchableOpacity, View } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// export default function OnboardingV1Layout() {
//   const { label, onPress, progress } = useOnboardingFooter();
//   const insets = useSafeAreaInsets();

//   return (
//     <View style={{ flex: 1, backgroundColor: "#fff" }}>
//       <Stack
//         screenOptions={{
//           headerTitle: "",
//           headerShadowVisible: false, // 그림자 제거 (iOS)
//         }}
//       />

//       {/* ✅ 하단 고정 바 (Safe Area 대응) */}
//       <View
//         style={{
//           position: "absolute",
//           left: 0,
//           right: 0,
//           bottom: 0,
//           paddingHorizontal: 16,
//           paddingTop: 12,
//           paddingBottom: Math.max(insets.bottom, 12), // 홈 인디케이터 여유
//           backgroundColor: "#fff",
//           // borderTopLeftRadius: 16,
//           // borderTopRightRadius: 16,
//           // 은은한 그림자
//           // shadowColor: "#000",
//           // shadowOpacity: 0.08,
//           // shadowRadius: 10,
//           // shadowOffset: { width: 0, height: -2 },
//           elevation: 6,
//         }}
//       >
//         {/* 진행바 */}
//         <View
//           style={{
//             height: 6,
//             backgroundColor: "#F2F2F2",
//             borderRadius: 3,
//             marginBottom: 12,
//             overflow: "hidden",
//           }}
//         >
//           <View
//             style={{
//               width: `${Math.min(Math.max(progress, 0), 1) * 100}%`,
//               height: "100%",
//               backgroundColor: "#5B8DEF",
//             }}
//           />
//         </View>

//         {/* CTA 버튼 */}
//         <TouchableOpacity
//           onPress={onPress}
//           activeOpacity={0.8}
//           style={{
//             backgroundColor: "#5B8DEF",
//             borderRadius: 12,
//             height: 52,
//             alignItems: "center",
//             justifyContent: "center",
//           }}
//         >
//           <Text style={{ 
//             fontFamily: "Pretendard-Bold",
//             color: "#FEFEFE", 
//             //fontWeight: "700", 
//             fontSize: 16 }}>{label}</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

import { useOnboardingFooter } from "@/utils/onboardingFooterStore";
import { Feather } from "@expo/vector-icons";
import { Stack, router, useSegments } from "expo-router"; // useSegments 훅 다시 사용
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OnboardingV1Layout() {
  const { label, onPress } = useOnboardingFooter();
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  // 현재 경로의 마지막 부분이 '(v1)'이면 첫 화면(index.tsx)으로 간주합니다.
  const isFirstScreen = segments.length > 0 && segments[segments.length - 1] === '(v1)';

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Stack
        screenOptions={{
          headerTitle: "",
          headerShadowVisible: false,
          // ✅ 첫 화면일 경우 뒤로가기 버튼을 숨깁니다.
          headerLeft: isFirstScreen
            ? () => null
            : () => (
                <Pressable onPress={() => router.back()} hitSlop={10}>
                  <Feather name="chevron-left" size={24} color="#000" />
                </Pressable>
              ),
        }}
      />

      {/* 하단 CTA 버튼 (변경 없음) */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: "#fff",
          elevation: 6,
        }}
      >
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={{
            backgroundColor: "#5B8DEF",
            borderRadius: 12,
            height: 52,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: "Pretendard-Bold", color: "#FEFEFE", fontSize: 16 }}>{label}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}