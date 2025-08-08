import { useOnboardingFooter } from "@/utils/onboardingFooterStore";
import { Stack } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function OnboardingV1Layout() {
  const { label, onPress, progress } = useOnboardingFooter();

  return (
    <View style={{ flex: 1 }}>
      <Stack />

      {/* ✅ 하단 고정 바 */}
      <View style={{ padding: 16 }}>
        <View style={{ height: 6, backgroundColor: "#eee", borderRadius: 3, marginBottom: 16 }}>
          <View
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              backgroundColor: "#4F80FF",
            }}
          />
        </View>
        <TouchableOpacity
          onPress={onPress}
          style={{
            backgroundColor: "#4F80FF",
            borderRadius: 8,
            padding: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>{label}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}