// app/mypage/profile-edit.tsx
import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

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
  const [uploadingAvatar, setUploadingAvatar] = useState(false); // ← 추가

  useEffect(() => {
    navigation.setOptions({
      headerTitleAlign: "center",
      headerTitle: () => (
        <View style={{ alignItems: "center" }}>
          <Text style={ styles.Title }>My Dearday</Text>
          <Text style={ styles.SubTitle }>프로필 편집</Text>
        </View>
      ),
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
          <Feather name="chevron-left" size={24} color="#000" />
        </Pressable>
      ),
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
      }
      setLoading(false);
    })();
  }, [profileId]);

  const handleSave = async () => {
    if (!profileId || !nickname.trim()) {
      Alert.alert("입력 오류", "닉네임을 입력해주세요.");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nickname: nickname.trim() })
      .eq("profile_id", profileId);
    setIsSaving(false);

    if (error) {
      Alert.alert("오류", "닉네임 변경에 실패했습니다.");
      return;
    }
    Alert.alert("완료", "닉네임이 변경되었습니다.");
    router.back();
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
        .ilike("nickname", name)          // 대소문자 무시
        .neq("profile_id", profileId)    // 내 계정 제외
        .neq("is_deleted", true); // 삭제된 계정 제외

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

  // ========= 갤러리 권한 & 이미지 선택/업로드 =========
  const requestMediaPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "프로필 사진을 변경하려면 사진 앱 접근 권한이 필요합니다.");
      return false;
    }
    return true;
  };

  const handlePickAvatar = async () => {
    try {
      const ok = await requestMediaPermission();
      if (!ok) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setUploadingAvatar(true);

      // React Native 환경: uri → Blob 변환
      const resp = await fetch(asset.uri);
      const blob = await resp.blob();

      const ext = (asset.fileName?.split(".").pop() || "jpg").toLowerCase();
      const path = `avatars/${profileId}/${Date.now()}.${ext}`;

      // Supabase Storage 업로드 (버킷명: avatars)
      const { error: upErr } = await supabase
        .storage
        .from("avatars")
        .upload(path, blob, {
          contentType: asset.mimeType || `image/${ext}`,
          upsert: true,
        });
      if (upErr) throw upErr;

      // Public URL 생성 (버킷 public 가정)
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = pub.publicUrl;

      // DB 업데이트
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl, avatar_path: path })
        .eq("profile_id", profileId);
      if (updErr) throw updErr;

      // 로컬 상태 반영
      setProfile((prev: any) => ({ ...prev, avatar_url: avatarUrl, avatar_path: path }));
      Alert.alert("완료", "프로필 사진이 업데이트되었습니다.");
    } catch (e: any) {
      console.error(e);
      Alert.alert("업데이트 실패", e?.message ?? "업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingAvatar(false);
    }
  };
  // ===================================================

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 아바타 */}
        <View style={styles.avatarBox}>
          <View style={styles.avatarWrap}>
            <Image
              source={{
                uri:
                  profile?.avatar_url && typeof profile.avatar_url === "string" && profile.avatar_url.length > 0
                    ? profile.avatar_url
                    : "https://dummyimage.com/200x200/eeeeee/aaaaaa&text=+",
              }}
              style={styles.avatar}
            />
            <TouchableOpacity
              style={styles.avatarEdit}
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="camera" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 닉네임 입력 */}
        <Text style={styles.label}>닉네임</Text>
        <View style={styles.nameRow}>
          {/* <- 래퍼(view)로 감싸서 absolute placeholder를 올림 */}
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
              // ❌ placeholder="닉네임을 입력해주세요"  (네이티브 placeholder 사용 안 함)
            />

            {/* ✅ 커스텀 placeholder: 값이 없고 포커스 아닐 때만 노출 */}
            {(nickname.trim().length === 0) && (
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
          <Text style={{ marginTop: 6, color: "#2E7D32", fontSize: 12 }}>사용 가능한 닉네임입니다.</Text>
        )}
        {dupState === "taken" && (
          <Text style={{ marginTop: 6, color: "#D32F2F", fontSize: 12 }}>이미 사용 중인 닉네임입니다.</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 24 },
  avatarBox: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#eee" },
  avatarWrap: { width: 96, height: 96, position: "relative" },
  avatarEdit: {
      position: "absolute",
      right: -8,
      bottom: -4,
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: "#5B8DEF",
      alignItems: "center", justifyContent: "center",
      borderWidth: 2, borderColor: "#fff",
  },
  label: { 
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14, 
    //fontWeight: "600", 
    color: "#333", 
    marginBottom: 8 
  },
  input: {
      height: 50, borderRadius: 10,
      borderWidth: 1, borderColor: "#E2E8F0",
      paddingHorizontal: 12, fontSize: 16, fontFamily: "Pretendard-Regular",
  },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: "#F2F2F2" },
  saveButton: { backgroundColor: "#5B8DEF", padding: 16, borderRadius: 12, alignItems: "center" },
  saveButtonText: { 
    fontFamily: "Pretendard-Bold",
    color: "#fff", 
    //fontWeight: "bold", 
    fontSize: 16 
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  inputFlex: { flex: 1 },  // 입력칸이 남은 너비 채우게
  dupBtn: {
      height: 50, paddingHorizontal: 12,
      borderRadius: 10, backgroundColor: "#EFF3FF",
      alignItems: "center", justifyContent: "center",
  },
  dupBtnText: { 
    fontFamily: "Pretendard-SemiBold",
    color: "#5B8DEF", 
    //fontWeight: "700" 
  },
  Title: { 
    fontFamily: "Pretendard-Bold",
    fontSize: 18, 
    //fontWeight: "700", 
    color: "#5B8DEF" },
  SubTitle: { 
    fontFamily: "Pretendard-Regular",
    fontSize: 12, 
    color: "#929292", 
    marginTop: 2 },
  placeholder: { 
    fontFamily: "Pretendard-Regular",
    color: "#A0AEC0", 
    fontSize: 16 
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
    fontFamily: "Pretendard-Regular",   // ← placeholder만 Pretendard
    color: "#A3AAB8",
  },
});
