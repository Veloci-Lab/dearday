import { useAuthStore } from "@/utils/authStore";
import { Text, View } from "react-native";

export default function PendingScreen() {
  const { profileId } = useAuthStore();

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center" }}>
      <Text>Pending Screen</Text>
      <Text>Profile ID: {profileId ?? "로딩 중..."}</Text>
    </View>
  );
}
