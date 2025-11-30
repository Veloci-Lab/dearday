import { checkNicknameAvailability, updateProfile } from "@/utils/api/profiles";
import { commonStyles } from "@/styles/common";
import { useAuthStore } from "@/utils/authStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingScreen() {
  const { profileId, setHasCompletedOnboarding } = useAuthStore();
  const router = useRouter();

  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [loading, setLoading] = useState(false);

  const handleCheckNickname = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;

    setStatus("checking");
    try {
      const isAvailable = await checkNicknameAvailability(trimmed);
      setStatus(isAvailable ? "available" : "unavailable");
    } catch (error) {
      console.error("닉네임 중복 확인 실패:", error);
      setStatus("idle");
    }
  };

  const handleComplete = async () => {
    if (status !== "available") {
      Alert.alert("알림", "닉네임 중복 확인을 먼저 완료해주세요.");
      return;
    }
    if (!profileId) return;

    setLoading(true);
    try {
      const trimmed = nickname.trim();
      await updateProfile(profileId, {
        nickname: trimmed,
        has_completed_onboarding: true
      });

      setHasCompletedOnboarding(true);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("오류", "닉네임 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const isCheckDisabled = !nickname.trim() || status === "checking";

  return (
    <SafeAreaView style={commonStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>디어데이에 오신 걸{'\n'}환영해요!</Text>
            <Text style={styles.subtitle}>사용할 닉네임을 입력해주세요</Text>
          </View>

          {/* 닉네임 입력 */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>닉네임</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  status === "available" && { borderColor: "#5B8DEF" },
                  status === "unavailable" && { borderColor: "#FF5A5A" },
                ]}
                value={nickname}
                onChangeText={(t) => {
                  setNickname(t);
                  setStatus("idle");
                }}
                placeholder="닉네임을 입력해주세요"
                placeholderTextColor="#C3C3C3"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
              <Pressable
                onPress={handleCheckNickname}
                disabled={isCheckDisabled}
                style={[
                  styles.checkBtn,
                  isCheckDisabled ? styles.checkBtnDisabled : styles.checkBtnEnabled,
                ]}
              >
                {status === "checking" ? (
                  <ActivityIndicator size="small" color="#5B8DEF" />
                ) : (
                  <Text
                    style={[
                      styles.checkBtnText,
                      isCheckDisabled ? { color: "#A3AAB8" } : { color: "#5B8DEF" },
                    ]}
                  >
                    중복확인
                  </Text>
                )}
              </Pressable>
            </View>

            {status === "available" && (
              <Text style={styles.helperSuccess}>사용 가능한 닉네임이에요!</Text>
            )}
            {status === "unavailable" && (
              <Text style={styles.helperError}>이미 사용 중인 닉네임이에요.</Text>
            )}
          </View>
        </View>

        {/* 하단 버튼 */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleComplete}
            disabled={status !== "available" || loading}
            style={[
              styles.completeBtn,
              (status !== "available" || loading) && styles.completeBtnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.completeBtnText}>시작하기</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontFamily: "Pretendard-Bold",
    fontSize: 24,
    lineHeight: 34,
    color: "#0F172A",
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: "Pretendard-Regular",
    fontSize: 16,
    color: "#64748B",
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontFamily: "Pretendard-Medium",
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    fontFamily: "Pretendard-Regular",
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    fontSize: 16,
    color: "#0F172A",
  },
  checkBtn: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
  checkBtnEnabled: {
    backgroundColor: "#EFF3FF",
  },
  checkBtnDisabled: {
    backgroundColor: "#F7F7F7",
  },
  checkBtnText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15,
  },
  helperSuccess: {
    fontFamily: "Pretendard-Regular",
    marginTop: 8,
    fontSize: 13,
    color: "#5B8DEF",
  },
  helperError: {
    fontFamily: "Pretendard-Regular",
    marginTop: 8,
    fontSize: 13,
    color: "#FF5A5A",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  completeBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: "#5B8DEF",
    alignItems: "center",
    justifyContent: "center",
  },
  completeBtnDisabled: {
    backgroundColor: "#E2E8F0",
  },
  completeBtnText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 17,
    color: "#FFFFFF",
  },
});
