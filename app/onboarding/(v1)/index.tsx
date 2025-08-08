import { useAuthStore } from "@/utils/authStore";
import { useOnboardingFooter } from "@/utils/onboardingFooterStore";
import { supabase } from "@/utils/supabase";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";

export default function OnboardingV1IndexScreen() {
  const { profileId } = useAuthStore();

  const router = useRouter();
  const setFooter = useOnboardingFooter((s) => s.setFooter);

  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");

  // ✅ 하단 버튼 설정 (다음 → 수면 설정으로 이동)
  useFocusEffect(
    useCallback(() => {
      setFooter({
        label: "다음",
        progress: 0.33,
        onPress: async () => {
          if (status === "available") {
            const trimmed = nickname.trim();

            const { error } = await supabase
              .from("profiles")
              .update({ nickname: trimmed })
              .eq("profile_id", profileId);

            if (error) {
              if (error.code === "23505") {
                // unique constraint violation
                Alert.alert("이미 사용 중인 닉네임입니다.");
                setStatus("unavailable");
              } else {
                Alert.alert("닉네임 저장 중 오류가 발생했습니다.");
                console.error("닉네임 저장 오류:", error.message);
              }
              return;
            }

            router.push("/onboarding/(v1)/second");
          } else {
            Alert.alert("닉네임 중복 확인을 먼저 완료해주세요.");
          }
        },
      });
    }, [status, setFooter])
  );

  // ✅ 중복 확인
  const handleCheckNickname = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;

    setStatus("checking");

    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("nickname", trimmed);

    if (error) {
      console.error("닉네임 중복 확인 실패:", error.message);
      setStatus("idle");
      return;
    }

    setStatus(count && count > 0 ? "unavailable" : "available");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>닉네임을 입력하세요</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={(text) => {
            setNickname(text);
            setStatus("idle"); // 입력 바뀌면 상태 초기화
          }}
          placeholder="닉네임"
        />
        <Button title="중복 확인" onPress={handleCheckNickname} />
      </View>

      {status === "available" && <Text style={styles.success}>사용 가능한 닉네임입니다.</Text>}
      {status === "unavailable" && <Text style={styles.error}>이미 사용 중인 닉네임입니다.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  label: { fontSize: 16, marginBottom: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 12,
  },
  success: { color: "green", marginTop: 4 },
  error: { color: "red", marginTop: 4 },
});
