// app/mypage/profile-edit.tsx
import { BackButton } from "@/components/BackButton";
import { commonHeaderOptions } from "@/styles/common";
import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const AVATAR_BUCKET = "avatars";
const LOCAL_FALLBACK = require("@/assets/images/avatar.png");

// URL에서 파일명만 뽑기 (쿼리스트립 제거 안전처리)
function getFileNameFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const clean = url.split("?")[0];
    const parts = clean.split("/");
    const last = parts[parts.length - 1];
    return last || null;
  } catch {
    return null;
  }
}

export default function ProfileEditScreen() {
  const navigation = useNavigation();
  const { profileId } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dupState, setDupState] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [initialNickname, setInitialNickname] = useState("");
  const [nickFocused, setNickFocused] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  // 액션시트 (Android 등)용
  const [sheetVisible, setSheetVisible] = useState(false);
  // 삭제 예약 플래그: 저장 시 avatar_url=null
  const [pendingDelete, setPendingDelete] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      ...commonHeaderOptions,
      headerTitle: "프로필 편집",
      headerLeft: () => <BackButton />,
    });
  }, [navigation]);

  useEffect(() => {
    if (!profileId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("profile_id", profileId)
        .single();
      if (data) {
        setProfile(data);
        setNickname(data.nickname ?? "");
        setInitialNickname(data.nickname ?? "");
        if (data.avatar_url) setImage(data.avatar_url);
      }
      setLoading(false);
    })();
  }, [profileId]);

  // ===== 액션시트 열기 =====
  const openAvatarSheet = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["앨범에서 선택", "프로필 사진 삭제", "취소"],
          cancelButtonIndex: 2,
          destructiveButtonIndex: 1,
          userInterfaceStyle: "light",
        },
        (buttonIndex) => {
          if (buttonIndex === 0) pickImage();
          else if (buttonIndex === 1) deleteAvatarLocal();
        }
      );
    } else {
      setSheetVisible(true);
    }
  };

  // ===== 로컬에서 아바타 삭제(저장 때 DB 반영) =====
  const deleteAvatarLocal = () => {
    setImage(null); // 미리보기 제거
    setPendingDelete(true); // 저장 시 avatar_url=null 반영
    setSheetVisible(false);
  };

  // ===== 갤러리에서 선택(저장 때 업로드) =====
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      // 로컬 미리보기만 설정 (저장 때 업로드)
      setImage(asset.uri);
      setPendingDelete(false); // 새 이미지 선택했으므로 삭제 예약 해제
      setSheetVisible(false);
    } catch (e: any) {
      console.error(e);
      Alert.alert("오류", e?.message ?? "이미지를 선택하지 못했습니다.");
    }
  };

  // 저장 시에만 업로드/DB 업데이트
  const handleSave = async () => {
    if (!profileId || !nickname.trim()) {
      Alert.alert("입력 오류", "닉네임을 입력해주세요.");
      return;
    }

    // 닉네임 검증
    const changedNickname = nickname.trim() !== (initialNickname ?? "");
    if (changedNickname && dupState !== "ok" && dupState !== "idle") {
      if (dupState === "checking") {
        Alert.alert("확인 중", "닉네임 중복 확인이 끝난 후 저장해주세요.");
      } else if (dupState === "taken") {
        Alert.alert("중복된 닉네임", "다른 닉네임을 입력해주세요.");
      }
      return;
    }

    setIsSaving(true);

    // 이전 아바타 URL/파일명 (업데이트 성공 후 삭제용)
    const oldUrl: string | null = profile?.avatar_url ?? null;
    const oldFileName: string | null = getFileNameFromUrl(oldUrl);

    try {
      const payload: Record<string, any> = {};
      if (changedNickname) payload.nickname = nickname.trim();

      // 아바타 처리
      if (pendingDelete) {
        // 삭제 예약 시: DB에 null 저장
        payload.avatar_url = null;
      } else if (image) {
        // file://만 업로드 대상으로 판단 (필요시 content:// 추가)
        const isLocalFile = image.startsWith("file:");
        if (isLocalFile) {
          // 1) 업로드 전에 320x320 정사각으로 리사이즈 (품질 0.82)
          const manip = await ImageManipulator.manipulateAsync(
            image,
            [{ resize: { width: 320, height: 320 } }],
            { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
          );

          // 2) 리사이즈 결과(file://)를 base64로 읽고 → Uint8Array로 변환
          const base64 = await FileSystem.readAsStringAsync(manip.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const binary =
            typeof atob !== "undefined"
              ? atob(base64)
              : Buffer.from(base64, "base64").toString("binary");
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

          // 3) 파일명 버저닝 + 서버 캐시(immutable)
          const fileName = `avatar_${profileId}_${Date.now()}.jpg`;
          const { error: upErr } = await supabase.storage
            .from(AVATAR_BUCKET)
            .upload(fileName, bytes, {
              contentType: "image/jpeg",
              upsert: false,
              cacheControl: "public, max-age=31536000, immutable",
            });
          if (upErr) throw upErr;

          const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(fileName);
          payload.avatar_url = pub.publicUrl;
        }
        // 원격 URL이고 변경 없으면 payload에 넣지 않음
      }

      if (Object.keys(payload).length > 0) {
        const { error } = await supabase
          .from("profiles")
          .update(payload)
          .eq("profile_id", profileId);
        if (error) throw error;

        // 업로드/업데이트 성공 시: 이전 아바타 파일 삭제 (파일명으로 바로 삭제)
        if (pendingDelete && oldFileName) {
          await supabase.storage.from(AVATAR_BUCKET).remove([oldFileName]);
        } else if (oldUrl && payload.avatar_url !== undefined && oldUrl !== payload.avatar_url && oldFileName) {
          await supabase.storage.from(AVATAR_BUCKET).remove([oldFileName]);
        }

        // 로컬 상태 반영
        setProfile((p: any) => ({ ...(p ?? {}), ...payload }));
        if (payload.nickname) setInitialNickname(payload.nickname);
        if (payload.avatar_url !== undefined) setImage(payload.avatar_url ?? null);
      }

      Alert.alert("완료", "프로필이 저장되었습니다.");
      router.back();
    } catch (e: any) {
      console.error(e);
      Alert.alert("오류", e?.message ?? "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const checkNickname = async () => {
    const name = nickname.trim();
    if (!name) return;
    setDupState("checking");

    const { count, error } = await supabase
      .from("profiles")
      .select("profile_id", { count: "exact", head: true })
      .ilike("nickname", name)
      .neq("profile_id", profileId)
      .neq("is_deleted", true);

    if (error) {
      setDupState("idle");
      Alert.alert("오류", "중복 확인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setDupState((count ?? 0) > 0 ? "taken" : "ok");
  };

  const changed = nickname.trim() !== (initialNickname ?? "");
  const canSave =
    !isSaving && nickname.trim().length > 0 && (!changed || dupState === "ok");

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* 아바타 */}
          <View style={styles.avatarBox}>
            <View style={styles.avatarWrap}>
              <Image
                style={styles.avatar}
                source={image ? { uri: image } : LOCAL_FALLBACK}
              />
              <TouchableOpacity style={styles.avatarEdit} onPress={openAvatarSheet}>
                <Feather name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 닉네임 입력 */}
          <Text style={styles.label}>닉네임</Text>
          <View style={styles.nameRow}>
            <View style={[styles.inputWrap, styles.inputFlex]}>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={(t) => {
                  setNickname(t);
                  setDupState("idle");
                }}
                onFocus={() => setNickFocused(true)}
                onBlur={() => setNickFocused(false)}
                returnKeyType="done"
              />
              {nickname.trim().length === 0 && (
                <View pointerEvents="none" style={styles.placeholderWrap}>
                  <Text style={styles.placeholderText}>닉네임을 입력해주세요</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.dupBtn,
                (nickname.trim().length === 0 || dupState === "checking") && { opacity: 0.5 },
              ]}
              onPress={checkNickname}
              disabled={nickname.trim().length === 0 || dupState === "checking"}
            >
              {dupState === "checking" ? (
                <ActivityIndicator size="small" color="#5B8DEF" />
              ) : (
                <Text style={styles.dupBtnText}>중복확인</Text>
              )}
            </TouchableOpacity>
          </View>
          {dupState === "ok" && (
            <Text style={{ marginTop: 6, color: "#2E7D32", fontSize: 12 }}>
              사용 가능한 닉네임입니다.
            </Text>
          )}
          {dupState === "taken" && (
            <Text style={{ marginTop: 6, color: "#D32F2F", fontSize: 12 }}>
              이미 사용 중인 닉네임입니다.
            </Text>
          )}
        </ScrollView>

        {/* 하단 저장 버튼 */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={styles.saveButtonText}>저장하기</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ANDROID 등: 커스텀 바텀 액션시트 */}
      <Modal
        transparent
        animationType="slide"
        visible={sheetVisible && Platform.OS !== "ios"}
        onRequestClose={() => setSheetVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSheetVisible(false)}>
          <View style={styles.sheetBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />
          <TouchableOpacity style={styles.sheetItem} onPress={pickImage}>
            <Text style={styles.sheetItemText}>앨범에서 선택</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetItem} onPress={deleteAvatarLocal}>
            <Text style={[styles.sheetItemText, { color: "#D32F2F" }]}>프로필 사진 삭제</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sheetItem, styles.sheetCancel]}
            onPress={() => setSheetVisible(false)}
          >
            <Text style={styles.sheetItemText}>취소</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff",
    borderTopWidth: 2,
    borderTopColor: "#f2f2f2"
   },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 24 },
  avatarBox: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#eee" },
  avatarWrap: { width: 96, height: 96, position: "relative" },
  avatarEdit: {
    position: "absolute",
    right: -8,
    bottom: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#5B8DEF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  label: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: "Pretendard-Regular",
  },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: "#F2F2F2" },
  saveButton: { backgroundColor: "#5B8DEF", padding: 16, borderRadius: 12, alignItems: "center" },
  saveButtonText: {
    fontFamily: "Pretendard-Bold",
    color: "#fff",
    fontSize: 16,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  inputFlex: { flex: 1 },
  dupBtn: {
    height: 50,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#EFF3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  dupBtnText: {
    fontFamily: "Pretendard-SemiBold",
    color: "#5B8DEF",
  },
  placeholder: {
    fontFamily: "Pretendard-Regular",
    color: "#A0AEC0",
    fontSize: 16,
  },
  inputWrap: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    position: "relative",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  placeholderWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 16,
    fontFamily: "Pretendard-Regular",
    color: "#A3AAB8",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetContainer: {
    backgroundColor: "#fff",
    paddingBottom: 24,
    paddingTop: 8,
    paddingHorizontal: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    marginBottom: 8,
  },
  sheetItem: {
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EEE",
  },
  sheetItemText: {
    fontSize: 16,
    fontFamily: "Pretendard-SemiBold",
    color: "#111",
  },
  sheetCancel: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
});
