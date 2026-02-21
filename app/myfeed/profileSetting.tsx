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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const AVATAR_BUCKET = "avatars";

export default function ProfileEditScreen() {
    const navigation = useNavigation();
    const profileId  = useAuthStore().profileId;
    const router = useRouter();

    const [nickname, setNickname] = useState("");
    const [intro, setIntro] = useState("");
    const [originalNickname, setOriginalNickname] = useState("");
    const [originalIntro, setOriginalIntro] = useState<string | null>(null);
    const [nicknameEdited, setNicknameEdited] = useState(false);
    const [originalProfileImage, setOriginalProfileImage] = useState<string | null>(null);
    const [originalVisibility, setOriginalVisibility] = useState<VisibilityOption>("public");



    const [status, setStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
    const [loading, setLoading] = useState(false);
    const [profileImage, setProfileImage] = useState<string | null>(null);

    const [visibility, setVisibility] = useState<VisibilityOption>("public");

    useEffect(() => {
        navigation.setOptions({
        ...commonHeaderOptions,
        headerShown: true,
        headerShadowVisible: true,
        headerTitle: () => <Text style={styles.headerTitle}>프로필 편집</Text>,
        headerLeft: () => null,
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

  /** 프로필 이미지 선택 */
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("유저 정보를 찾을 수 없습니다.");

      let avatarUrl = profileImage;

      // 이미지가 새로 선택된 경우에만 업로드
      if (profileImage && !profileImage.startsWith("http")) {
        const manip = await ImageManipulator.manipulateAsync(
          profileImage,
          [{ resize: { width: 320, height: 320 } }],
          { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
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

      //Alert.alert("완료", "프로필이 성공적으로 업데이트되었습니다.");
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
      // 한글(자음, 모음 포함)은 2점, 나머지는 1점
      const score = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(char) ? 2 : 1;

      if (totalScore + score <= 36) {
        totalScore += score;
        validatedText += char;
      } else {
        // 36점을 넘으면 루프 종료
        break;
      }
    }
    return validatedText;
  };


  const isCheckDisabled = !nicknameEdited || !nickname.trim() || status === "checking";
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
      >
        <View style={styles.content}>
          {/* 프로필 이미지 */}
          <Pressable onPress={handlePickImage} style={styles.imageWrapper}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder} />
            )}

            {/* 카메라 아이콘 */}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>

            {/* 삭제 아이콘 */}
            {/* {profileImage && (
              <Pressable
                onPress={() => setProfileImage(null)}
                style={styles.deleteIcon}
              >
                <Ionicons name="trash" size={16} color="#FF5A5A" />
              </Pressable>
            )} */}
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
                최대 10글자까지 입력 가능합니다.
            </Text>
            )}
            {status === "available" && (
              <Text style={styles.helperSuccess}>사용 가능한 닉네임이에요!</Text>
            )}
            {status === "unavailable" && (
              <Text style={styles.helperError}>이미 사용 중인 닉네임이에요.</Text>
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
                    // onChangeText={setIntro}
                    onChangeText={(t) => {
                      // 유효한 길이까지만 잘라서 상태 업데이트
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
          {/* 공개 설정*/}
          <Text style={styles.label}>공개 설정</Text>
          <PrivacySelector
            value={visibility}
            onChange={setVisibility}
          />
        </View>

        {/* 하단 버튼 */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleSave}
            disabled={isSaveDisabled}
            style={[styles.completeBtn, isSaveDisabled && styles.completeBtnDisabled]}
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
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 10 },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Pretendard-Bold',
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
    borderColor: "#5B8DEF"
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
  input: 
  { fontFamily: "Pretendard-Regular", 
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
  checkBtn: { height: 52, paddingHorizontal: 15, borderRadius: 12, alignItems: "center", justifyContent: "center", minWidth: 90 },
  checkBtnEnabled: { backgroundColor: "#5B8DEF" },
  checkBtnDisabled: { backgroundColor: "#F2F2F2" },
  checkBtnActive: { backgroundColor: "#5B8DEF" },
  checkBtnText: { fontFamily: "Pretendard-SemiBold", fontSize: 15, letterSpacing: -0.51},
  helperInfo: {
    fontFamily: "Pretendard-Regular",
    marginTop: 8,
    fontSize: 13,
    color: "#626262",
    letterSpacing: -0.45,
  },
  helperLimit: {
    fontFamily: "Pretendard-Regular",
    marginTop: 8,
    fontSize: 13,
    color: "#626262",
    letterSpacing: -0.45,
  },
  helperSuccess: { fontFamily: "Pretendard-Regular", marginTop: 8, fontSize: 13, color: "#5B8DEF", letterSpacing: -0.45 },
  helperError: { fontFamily: "Pretendard-Regular", marginTop: 8, fontSize: 13, color: "#FF5A5A", letterSpacing: -0.45},
  clearButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -9 }],
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { paddingHorizontal: 24, paddingBottom: 10},
  completeBtn: { height: 56, borderRadius: 12, backgroundColor: "#5B8DEF", alignItems: "center", justifyContent: "center" },
  completeBtnDisabled: { backgroundColor: "#F2F2F2" },
  completeBtnText: { fontFamily: "Pretendard-SemiBold", fontSize: 17, color: "#FFFFFF", letterSpacing: -0.51 },
});
