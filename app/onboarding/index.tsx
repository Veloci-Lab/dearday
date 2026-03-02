import DefaultAvatar from "@/components/avatar/DefaultAvatar";
import { commonStyles } from "@/styles/common";
import { checkNicknameAvailability } from "@/utils/api/profiles";
import { useOnboardingStore } from "@/utils/onboardingStore";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
  const router = useRouter();
  const { setNickname: saveNickname, setAvatarUri } = useOnboardingStore();

  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

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

  const handleNext = () => {
    console.log(status)
    if (status !== "available") return;

    saveNickname(nickname.trim());
    setAvatarUri(profileImage);

    router.push("/onboarding/step1");
  };

  const isCheckDisabled = !nickname.trim() || status === "checking";
  const isNextDisabled = status !== "available";

  return (
    <SafeAreaView style={commonStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          {/* 프로그레스 바 */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "50%" }]} />
          </View>

          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>
              디어데이에 오신 걸 환영해요.{"\n"}사용할 프로필을 설정해주세요!
            </Text>
            <Text style={styles.subtitle}>나중에 다시 바꿀 수 있어요.</Text>
          </View>

          {/* 프로필 이미지 */}
          <Pressable onPress={handlePickImage} style={styles.imageWrapper}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <DefaultAvatar size={100} />
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* 닉네임 입력 */}
          <View style={styles.inputSection}>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  status === "available" && { borderColor: "#5B8DEF" },
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
                maxLength={10}
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
                  <ActivityIndicator size="small" color={nickname.trim() ? "#FFFFFF" : "#C3C3C3"} />
                ) : (
                  <Text style={nickname.trim() ? styles.checkBtnText : styles.checkBtnTextDisabled}>
                    중복확인
                  </Text>
                )}
              </Pressable>
            </View>

            {status === "available" ? (
              <Text style={styles.helperSuccess}>사용 가능한 닉네임이에요!</Text>
            ) : status === "unavailable" ? (
              <Text style={styles.helperError}>이미 사용 중인 닉네임이에요.</Text>
            ) : (
              <Text style={styles.helperInfo}>최대 10글까지 가능해요!</Text>
            )}
          </View>
        </View>

        {/* 하단 버튼 */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleNext}
            disabled={isNextDisabled}
            style={[
              styles.nextBtn,
              isNextDisabled && styles.nextBtnDisabled,
            ]}
          >
            <Text
              style={[
                styles.nextBtnText,
                isNextDisabled && { color: "#C3C3C3" },
              ]}
            >
              다음
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 21,
    paddingTop: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    marginBottom: 32,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#5B8DEF",
    borderRadius: 2,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontFamily: "Pretendard-Bold",
    fontSize: 20,
    lineHeight: 28,
    fontStyle: "normal",
    fontWeight: 700,
    color: "#0F172A",
    marginBottom: 8,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: "Pretendard-Regular",
    fontSize: 15,
    color: "#929292",
    letterSpacing: -0.45,
  },
  imageWrapper: {
    alignSelf: "center",
    marginBottom: 32,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E2E8F0",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#5B8DEF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  inputSection: {
    marginBottom: 24,
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
    fontSize: 15,
    color: "#0F172A",
    letterSpacing: -0.45,
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
    backgroundColor: "#5B8DEF",
  },
  checkBtnDisabled: {
    backgroundColor: "#F2F2F2",
  },
  checkBtnText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: -0.51,
  },
  checkBtnTextDisabled: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15,
    color: "#C3C3C3",
  },
  helperInfo: {
    fontFamily: "Pretendard-Regular",
    marginTop: 8,
    fontSize: 13,
    color: "#C3C3C3",
    letterSpacing: -0.45,
  },
  helperSuccess: {
    fontFamily: "Pretendard-Regular",
    marginTop: 8,
    fontSize: 13,
    color: "#5B8DEF",
    letterSpacing: -0.45,

  },
  helperError: {
    fontFamily: "Pretendard-Regular",
    marginTop: 8,
    fontSize: 13,
    color: "#FF5A5A",
    letterSpacing: -0.45,
  },
  footer: {
    paddingHorizontal: 24,
  },
  nextBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: "#5B8DEF",
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnDisabled: {
    backgroundColor: "#F2F2F2",
  },
  nextBtnText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 17,
    color: "#FFFFFF",
    letterSpacing: -0.51,
  },
});