import { useAuthStore } from "@/utils/authStore";
import { useOnboardingFooter } from "@/utils/onboardingFooterStore";
import { supabase } from "@/utils/supabase";
import { useFocusEffect, useRouter } from "expo-router"; // Stack 임포트 제거
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function OnboardingV1IndexScreen() {
  // ... (다른 모든 코드는 그대로 유지)
  const { profileId } = useAuthStore();
  const router = useRouter();
  const setFooter = useOnboardingFooter((s) => s.setFooter);

  const [nickname, setNickname] = useState("");
  const [status, setStatus] =
    useState<"idle" | "checking" | "available" | "unavailable">("idle");

  useFocusEffect(
    useCallback(() => {
        setFooter({
            label: "다음",
            progress: 0.5,
            onPress: async () => {
                if (status !== "available") {
                    Alert.alert("알림", "닉네임 중복 확인을 먼저 완료해주세요.");
                    return;
                }
                if (!profileId) return;

                const trimmed = nickname.trim();
                const { error } = await supabase
                    .from("profiles")
                    .update({ nickname: trimmed })
                    .eq("profile_id", profileId);

                if (error) {
                    Alert.alert("오류", "닉네임 저장 중 오류가 발생했습니다.");
                    return;
                }
                router.push("/onboarding/(v1)/second");
            },
        });
    }, [status, nickname, profileId])
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
    !nickname.trim() || status === "checking";

//   return (
//     <View style={s.container}>
//       {/* 진행률 바 */}
//       <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
//         <View style={s.progressBarOuter}>
//           <View
//             style={[s.progressBarInner, { width: `${0.5 * 100}%` }]}
//           />
//         </View>
//       </View>
      
//       {/* 콘텐츠 영역 */}
//       <View style={{ paddingHorizontal: 20 }}>
//         <View style={{ marginBottom: 36 }}>
//           <Text style={s.h1}>디어데이에 오신 걸 환영해요.{`\n`}사용할 닉네임을 입력해주세요!</Text>
//           <Text style={s.sub}>나중에 다시 바꿀 수 있어요.</Text>
//         </View>

//         <Text style={s.label}>닉네임</Text>
        
//         <View style={s.inputRow}>
//           <TextInput
//             style={[
//               s.input,
//               status === "available" && { borderColor: "#5B8DEF" },
//               status === "unavailable" && { borderColor: "#FF5A5A" },
//             ]}
//             value={nickname}
//             onChangeText={(t) => {
//               setNickname(t);
//               setStatus("idle");
//             }}
//             placeholder="닉네임을 입력해주세요"
//             placeholderTextColor="#C3C3C3"
//             autoCapitalize="none"
//             autoCorrect={false}
//             returnKeyType="done"
//           />
//           <TouchableOpacity
//             onPress={handleCheckNickname}
//             disabled={isCheckDisabled}
//             style={[
//               s.checkBtn,
//               isCheckDisabled ? s.checkBtnDisabled : s.checkBtnEnabled,
//             ]}
//             activeOpacity={0.8}
//           >
//             {status === "checking" ? (
//               <ActivityIndicator size="small" color="#fff" />
//             ) : (
//               <Text
//                 style={[
//                   s.checkBtnText,
//                   isCheckDisabled ? { color: "#FEFEFE" } : { color: "#fff" },
//                 ]}
//               >
//                 중복확인
//               </Text>
//             )}
//           </TouchableOpacity>
//         </View>

//         {status === "available" && <Text style={s.helperSuccess}>사용 가능한 닉네임이에요!</Text>}
//         {status === "unavailable" && <Text style={s.helperError}>이미 사용 중인 닉네임이에요.</Text>}
//       </View>
//     </View>
//   );
// }
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={s.container}
    >
      <View style={s.container}>
        {/* 진행률 바 */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={s.progressBarOuter}>
            <View
              style={[s.progressBarInner, { width: `${0.5 * 100}%` }]}
            />
          </View>
        </View>
        
        {/* 콘텐츠 영역 */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ marginBottom: 36 }}>
            <Text style={s.h1}>디어데이에 오신 걸 환영해요.{`\n`}사용할 닉네임을 입력해주세요!</Text>
            <Text style={s.sub}>나중에 다시 바꿀 수 있어요.</Text>
          </View>

          <Text style={s.label}>닉네임</Text>
          
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

          {status === "available" && <Text style={s.helperSuccess}>사용 가능한 닉네임이에요!</Text>}
          {status === "unavailable" && <Text style={s.helperError}>이미 사용 중인 닉네임이에요.</Text>}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
    backgroundColor: "#fff",
  },
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
  },
  label: {
    fontFamily: "Pretendard-Regular",
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
    fontFamily: "Pretendard-Regular",
    fontWeight: 'normal',
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
    minWidth: 80,
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
    fontFamily: "Pretendard-Bold",
    fontSize: 14,
  },
  helperSuccess: {
    fontFamily: "Pretendard-Regular",
    marginTop: 8,
    fontSize: 12,
    color: "#5B8DEF",
  },
  helperError: {
    fontFamily: "Pretendard-Regular",
    marginTop: 8,
    fontSize: 12,
    color: "#FF5A5A",
  },
});