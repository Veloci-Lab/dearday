import { useOnboardingFooter } from "@/utils/onboardingFooterStore";
import { Stack } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OnboardingV1Layout() {
  const { label, onPress, progress } = useOnboardingFooter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Stack
        screenOptions={{
          headerTitle: "", // 타이틀 제거
          headerShadowVisible: false, // 그림자 제거 (iOS)
        }}
      />

      {/* ✅ 하단 고정 바 (Safe Area 대응) */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12), // 홈 인디케이터 여유
          backgroundColor: "#fff",
          // borderTopLeftRadius: 16,
          // borderTopRightRadius: 16,
          // 은은한 그림자
          // shadowColor: "#000",
          // shadowOpacity: 0.08,
          // shadowRadius: 10,
          // shadowOffset: { width: 0, height: -2 },
          elevation: 6,
        }}
      >
        {/* 진행바 */}
        <View
          style={{
            height: 6,
            backgroundColor: "#F2F2F2",
            borderRadius: 3,
            marginBottom: 12,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${Math.min(Math.max(progress, 0), 1) * 100}%`,
              height: "100%",
              backgroundColor: "#5B8DEF",
            }}
          />
        </View>

        {/* CTA 버튼 */}
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
          <Text style={{ color: "#FEFEFE", fontWeight: "700", fontSize: 16 }}>{label}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
