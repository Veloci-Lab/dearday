import { Link } from "expo-router";
import { Button, Text, View } from "react-native";

export default function OnboardingIndexScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>인사 및 정보입력, 권한요청 할거라고 안내</Text>
      <Link asChild push href="/onboarding/sleep_time">
        <Button title="다음" />
      </Link>
    </View>
  );
}