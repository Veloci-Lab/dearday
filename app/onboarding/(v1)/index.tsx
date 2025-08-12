import { useAuthStore } from "@/utils/authStore";
import { useOnboardingFooter } from "@/utils/onboardingFooterStore";
import { supabase } from "@/utils/supabase";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function OnboardingV1IndexScreen() {
  const { profileId } = useAuthStore();
  const router = useRouter();
  const setFooter = useOnboardingFooter((s) => s.setFooter);

  const [nickname, setNickname] = useState("");
  const [status, setStatus] =
    useState<"idle" | "checking" | "available" | "unavailable">("idle");

  // 하단 버튼 설정 (완료 버튼은 available일 때만 통과)
  useFocusEffect(
    useCallback(() => {
      setFooter({
        label: "다음",
        progress: 0.5, // 시안 비율에 맞게 조절
        onPress: async () => {
          if (!profileId) {
            Alert.alert("오류", "사용자 정보가 없습니다.");
            return;
          }
          if (status !== "available") {
            Alert.alert("닉네임 중복 확인을 먼저 완료해주세요.");
            return;
          }
          const trimmed = nickname.trim();
          const { error } = await supabase
            .from("profiles")
            .update({ nickname: trimmed })
            .eq("profile_id", profileId);

          if (error) {
            if (error.code === "23505") {
              Alert.alert("이미 사용 중인 닉네임입니다.");
              setStatus("unavailable");
            } else {
              console.error(error.message);
              Alert.alert("닉네임 저장 중 오류가 발생했습니다.");
            }
            return;
          }
          router.replace("/onboarding/(v1)/second");
        },
      });
    }, [status, nickname, profileId, router, setFooter])
  );

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

  const isCheckDisabled =
    !nickname.trim() || status === "checking"; //  || nickname.trim().length < 2

  return (
    <View style={s.container}>
      {/* 헤더 텍스트 */}
      <View style={{ marginBottom: 24 }}>
        <Text style={s.h1}>디어데이에 오신 걸 환영해요.{`\n`}사용할 닉네임을 입력해주세요!</Text>
        <Text style={s.sub}>나중에 다시 바꿀 수 있어요.</Text>
      </View>

      {/* 라벨 */}
      <Text style={s.label}>닉네임</Text>

      {/* 인풋 + 중복확인 */}
      <View style={s.inputRow}>
        <TextInput
          style={[
            s.input,
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
        <TouchableOpacity
          onPress={handleCheckNickname}
          disabled={isCheckDisabled}
          style={[
            s.checkBtn,
            isCheckDisabled ? s.checkBtnDisabled : s.checkBtnEnabled,
          ]}
          activeOpacity={0.8}
        >
          {status === "checking" ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text
              style={[
                s.checkBtnText,
                isCheckDisabled ? { color: "#FEFEFE" } : { color: "#fff" },
              ]}
            >
              중복확인
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 헬퍼 텍스트 */}
      {status === "idle" && (
        <Text style={s.helperNeutral}></Text>
      )}
      {status === "available" && (
        <Text style={s.helperSuccess}>사용 가능한 닉네임이에요!</Text>
      )}
      {status === "unavailable" && (
        <Text style={s.helperError}>이미 사용 중인 닉네임이에요.</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    // paddingTop: 36,
    backgroundColor: "#fff",
  },
  h1: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
    color: "#0F172A",
  },
  sub: {
    marginTop: 6,
    fontSize: 13,
    color: "#929292",
  },
  label: {
    fontSize: 13,
    color: "#0D0D0D",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  checkBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    minWidth: 80, // ✅ 고정폭 주기
  },
  checkBtnEnabled: {
    backgroundColor: "#5B8DEF",
    borderColor: "#5B8DEF",
  },
  checkBtnDisabled: {
    backgroundColor: "#F2F2F2",
    borderColor: "#F2F2F2",
  },
  checkBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  helperNeutral: {
    marginTop: 8,
    fontSize: 12,
    color: "#94A3B8",
  },
  helperSuccess: {
    marginTop: 8,
    fontSize: 12,
    color: "#5B8DEF",
    fontWeight: "600",
  },
  helperError: {
    marginTop: 8,
    fontSize: 12,
    color: "#FF5A5A",
    fontWeight: "600",
  },
});
