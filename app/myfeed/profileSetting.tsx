import DefaultAvatar from "@/components/avatar/DefaultAvatar";
import { EditPenIcon } from "@/components/icons/EditPenIcon";
import PrivacySelector, {
  VisibilityOption,
} from "@/components/PrivacySelector";
import { commonHeaderOptions, commonStyles } from "@/styles/common";
import { checkNicknameAvailability } from "@/utils/api/profiles";
import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const AVATAR_BUCKET = "avatars";

const ArrowLeft = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12.5659 19.4341C12.8783 19.7465 12.8783 20.2531 12.5659 20.5655C12.2535 20.8779 11.7469 20.8779 11.4345 20.5655L3.43451 12.5655C3.12209 12.2531 3.12209 11.7465 3.43451 11.4341L11.4345 3.43412C11.7469 3.1217 12.2535 3.1217 12.5659 3.43412C12.8783 3.74654 12.8783 4.25307 12.5659 4.56549L5.93157 11.1998L19.9998 11.1998C20.4416 11.1998 20.7998 11.558 20.7998 11.9998C20.7998 12.4416 20.4416 12.7998 19.9998 12.7998L5.93157 12.7998L12.5659 19.4341Z"
      fill="#0D0D0D"
    />
  </Svg>
);

export default function ProfileEditScreen() {
  const navigation = useNavigation();
  const profileId = useAuthStore().profileId;
  const router = useRouter();

  const [nickname, setNickname] = useState("");
  const [intro, setIntro] = useState("");
  const [originalNickname, setOriginalNickname] = useState("");
  const [originalIntro, setOriginalIntro] = useState<string | null>(null);
  const [nicknameEdited, setNicknameEdited] = useState(false);
  const [originalProfileImage, setOriginalProfileImage] = useState<
    string | null
  >(null);
  const [originalVisibility, setOriginalVisibility] =
    useState<VisibilityOption>("public");

  const [status, setStatus] = useState<
    "idle" | "checking" | "available" | "unavailable"
  >("idle");
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [visibility, setVisibility] = useState<VisibilityOption>("public");

  useEffect(() => {
    navigation.setOptions({
      ...commonHeaderOptions,
      headerShown: true,
      headerShadowVisible: true,
      headerTitle: () => <Text style={styles.headerTitle}>프로필 편집</Text>,
      headerLeft: () => (
        <Pressable onPress={() => router.back()}>
          <ArrowLeft />
        </Pressable>
      ),
      headerRight: () => null,
    });
  }, [navigation]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileId) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("nickname, avatar_url, intro, is_public")
          .eq("profile_id", profileId)
          .single();

        if (error) throw error;

        setNickname(data.nickname || "");
        setOriginalNickname(data.nickname || "");

        setProfileImage(data.avatar_url || null);
        setOriginalProfileImage(data.avatar_url || null);

        setOriginalIntro(data.intro ?? "");
        setIntro(data.intro ?? "");

        const initialVisibility = data.is_public ? "public" : "friends";
        setVisibility(initialVisibility);
        setOriginalVisibility(initialVisibility);
      } catch (error) {
        console.error("프로필 로드 실패:", error);
      }
    };
    fetchProfile();
  }, [profileId]);

  /** 프로필 이미지 선택/삭제 */
  const handlePickImage = () => {
    Alert.alert(
      "프로필 사진 변경",
      undefined,
      [
        {
          text: "라이브러리에서 선택",
          onPress: handleSelectFromLibrary,
        },
        {
          text: "삭제",
          style: "destructive",
          onPress: handleDeleteImage,
        },
      ],
      { cancelable: true }
    );
  };

  const handleSelectFromLibrary = async () => {
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

  const handleDeleteImage = async () => {
    // 버킷에서 현재 이미지 삭제
    if (originalProfileImage && originalProfileImage.startsWith("http")) {
      try {
        // URL에서 파일명 추출
        // 예: https://xxx.supabase.co/storage/v1/object/public/avatars/avatar_xxx.jpg
        const urlParts = originalProfileImage.split(`/${AVATAR_BUCKET}/`);
        if (urlParts.length > 1) {
          const fileName = urlParts[1];
          const { error } = await supabase.storage
            .from(AVATAR_BUCKET)
            .remove([fileName]);
          if (error) console.error("이미지 삭제 실패:", error);
        }
      } catch (e) {
        console.error("이미지 삭제 중 오류:", e);
      }
    }
    setProfileImage(null); // null이면 SVG 플레이스홀더 렌더링
  };

  
  /** 닉네임 중복 확인 */
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

  /** 변경사항 저장 */
  const handleSave = async () => {
    if (!profileId) return;

    if (nicknameEdited && status !== "available") {
      console.log("닉네임 중복확인을 해주세요.");
      return;
    }
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("유저 정보를 찾을 수 없습니다.");

      let avatarUrl = profileImage;

      // 이미지가 새로 선택된 경우에만 업로드
      if (profileImage && !profileImage.startsWith("http")) {
        const manip = await ImageManipulator.manipulateAsync(
          profileImage,
          [{ resize: { width: 320, height: 320 } }],
          { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
        );

        const base64 = await FileSystem.readAsStringAsync(manip.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const binary =
          typeof atob !== "undefined"
            ? atob(base64)
            : Buffer.from(base64, "base64").toString("binary");

        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const fileName = `avatar_${user.id}_${Date.now()}.jpg`;

        const { error: upErr } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(fileName, bytes.buffer, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (upErr) throw upErr;

        const { data } = supabase.storage
          .from(AVATAR_BUCKET)
          .getPublicUrl(fileName);

        avatarUrl = data.publicUrl;
      }

      // profiles 테이블 업데이트
      const { error } = await supabase
        .from("profiles")
        .update({
          nickname: nickname.trim(),
          intro: intro.trim() || null,
          avatar_url: avatarUrl,
          is_public: visibility === "public",
        })
        .eq("profile_id", profileId);

      if (error) throw error;

      console.log("프로필 업데이트 성공");
      router.back();
    } catch (error) {
      console.error("프로필 업데이트 실패:", error);
      Alert.alert("오류", "프로필 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /** 한 줄 소개 글자 수 제한 함수 */
  const getValidatedIntro = (text: string) => {
    let totalScore = 0;
    let validatedText = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const score = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(char) ? 2 : 1;

      if (totalScore + score <= 36) {
        totalScore += score;
        validatedText += char;
      } else {
        break;
      }
    }
    return validatedText;
  };

  const isCheckDisabled =
    !nicknameEdited || !nickname.trim() || status === "checking";
  const isIntroEdited = intro !== (originalIntro ?? "");
  const isVisibilityEdited = visibility !== originalVisibility;
  const isProfileImageEdited = profileImage !== originalProfileImage;

  const canSave =
    (nicknameEdited && status === "available") ||
    isIntroEdited ||
    isVisibilityEdited ||
    isProfileImageEdited;

  const isSaveDisabled = !canSave || loading;

  return (
    <SafeAreaView style={commonStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* 스크롤 가능한 콘텐츠 영역 */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 프로필 이미지 */}
          <Pressable onPress={handlePickImage} style={styles.imageWrapper}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <DefaultAvatar size={100} />
            )}

            {/* 카메라 아이콘 */}
            <View style={styles.editIcon}>
              <EditPenIcon />
            </View>
          </Pressable>

          {/* 닉네임 입력 */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>닉네임</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  !nicknameEdited && { color: "#C3C3C3" },
                  nicknameEdited && { borderColor: "#5B8DEF" },
                  status === "available" && { borderColor: "#5B8DEF" },
                  status === "unavailable" && { borderColor: "#FF5A5A" },
                ]}
                value={nickname}
                onChangeText={(t) => {
                  setNickname(t);
                  setStatus("idle");

                  if (t !== originalNickname) {
                    setNicknameEdited(true);
                  } else {
                    setNicknameEdited(false);
                  }
                }}
                placeholder="닉네임을 입력해주세요"
                placeholderTextColor="#C3C3C3"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={10}
                returnKeyType="done"
              />
              <Pressable
                onPress={handleCheckNickname}
                disabled={isCheckDisabled}
                style={[
                  styles.checkBtn,
                  status === "available"
                    ? styles.checkBtnActive
                    : isCheckDisabled
                      ? styles.checkBtnDisabled
                      : styles.checkBtnEnabled,
                ]}
              >
                {status === "checking" ? (
                  <ActivityIndicator size="small" color="#5B8DEF" />
                ) : (
                  <Text
                    style={[
                      styles.checkBtnText,
                      status === "available"
                        ? { color: "#FFFFFF" }
                        : isCheckDisabled
                          ? { color: "#FEFEFE" }
                          : { color: "#FFFFFF" },
                    ]}
                  >
                    중복확인
                  </Text>
                )}
              </Pressable>
            </View>
            {nicknameEdited && status === "idle" && (
              <Text style={styles.helperInfo}>
                최대 10글자까지 가능해요!
                </Text>
            )}
            {status === "available" && (
              <Text style={styles.helperSuccess}>
                사용 가능한 닉네임이에요!
              </Text>
            )}
            {status === "unavailable" && (
              <Text style={styles.helperError}>
                이미 사용 중인 닉네임이에요.
              </Text>
            )}
          </View>

          {/* 한 줄 소개 입력 */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>한 줄 소개(선택)</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  !isIntroEdited && { color: "#C3C3C3" },
                  isIntroEdited && { borderColor: "#5B8DEF" },
                ]}
                value={intro}
                onChangeText={(t) => {
                  const validated = getValidatedIntro(t);
                  setIntro(validated);
                }}
                placeholder={
                  originalIntro
                    ? "내용을 입력해주세요"
                    : "현재 한 줄 소개가 없어요"
                }
                placeholderTextColor="#C3C3C3"
                maxLength={36}
              />

              {intro !== "현재 한 줄 소개가 없어요" && (
                <Pressable
                  onPress={() => setIntro("")}
                  style={styles.clearButton}
                >
                  <Ionicons name="close" size={17} color="#C3C3C3" />
                </Pressable>
              )}
            </View>
            {isIntroEdited && (
              <Text style={styles.helperLimit}>
                한글 18자, 영문 36자까지 가능합니다.
              </Text>
            )}
          </View>

          {/* 공개 설정 */}
          <Text style={styles.label}>공개 설정</Text>
          <PrivacySelector value={visibility} onChange={setVisibility} />
        </ScrollView>

        {/* 하단 버튼 — ScrollView 밖에 고정 */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleSave}
            disabled={isSaveDisabled}
            style={[
              styles.completeBtn,
              isSaveDisabled && styles.completeBtnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.completeBtnText}>저장하기</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Pretendard-SemiBold",
    letterSpacing: -0.51,
  },
  imageWrapper: { alignSelf: "center", marginBottom: 24 },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  profilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#C2C2C2",
  },
  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 14,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F2F2F2",
    elevation: 2,
  },
  deleteIcon: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FF5A5A",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  inputSection: { marginBottom: 24 },
  label: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 8,
    lineHeight: 20,
    letterSpacing: -0.42,
  },
  inputRow: { flexDirection: "row", gap: 6, alignItems: "center" },
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
    color: "#333",
    letterSpacing: -0.45,
  },
  checkBtn: {
    height: 52,
    paddingHorizontal: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
  checkBtnEnabled: { backgroundColor: "#5B8DEF" },
  checkBtnDisabled: { backgroundColor: "#F2F2F2" },
  checkBtnActive: { backgroundColor: "#5B8DEF" },
  checkBtnText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15,
    letterSpacing: -0.51,
  },
  helperInfo: {
    fontFamily: "Pretendard-Regular",
    marginLeft: 8,
    marginTop: 8,
    fontSize: 13,
    color: "#626262",
    letterSpacing: -0.45,
  },
  helperLimit: {
    fontFamily: "Pretendard-Regular",
    marginLeft: 8,
    marginTop: 8,
    fontSize: 13,
    color: "#626262",
    letterSpacing: -0.45,
  },
  helperSuccess: {
    fontFamily: "Pretendard-Regular",
    marginLeft: 8,
    marginTop: 8,
    fontSize: 13,
    color: "#5B8DEF",
    letterSpacing: -0.45,
  },
  helperError: {
    fontFamily: "Pretendard-Regular",
    marginLeft: 8,
    marginTop: 8,
    fontSize: 13,
    color: "#FF5A5A",
    letterSpacing: -0.45,
  },
  clearButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -9 }],
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { paddingHorizontal: 24, paddingBottom: 20 },
  completeBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: "#5B8DEF",
    alignItems: "center",
    justifyContent: "center",
  },
  completeBtnDisabled: { backgroundColor: "#F2F2F2" },
  completeBtnText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 17,
    color: "#FFFFFF",
    letterSpacing: -0.51,
  },
});
