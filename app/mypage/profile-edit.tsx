// app/mypage/profile-edit.tsx
import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "프로필 편집",
      headerTitleAlign: "center",
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
          <Feather name="chevron-left" size={24} color="black" />
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
        .neq("profile_id", profileId);    // 내 계정 제외

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
      <ScrollView contentContainerStyle={styles.content}>
        {/* 아바타 */}
        <View style={styles.avatarBox}>
            <View style={styles.avatarWrap}>
                <Image source={{ uri: profile?.avatar_url }} style={styles.avatar} />
                <TouchableOpacity
                    style={styles.avatarEdit}
                    onPress={() => Alert.alert("알림", "프로필 사진 변경 기능은 준비 중입니다.")}
                >
                    <Feather name="camera" size={16} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>

        {/* 닉네임 입력 */}
        <Text style={styles.label}>닉네임</Text>
            <View style={styles.nameRow}>
                <TextInput
                    style={[styles.input, styles.inputFlex]}
                    value={nickname}
                    onChangeText={(t) => {
                        setNickname(t);
                        setDupState("idle");
                    }}
                    placeholder="닉네임을 입력해주세요"
                    returnKeyType="done"
                />

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
    label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
    input: {
        height: 50, borderRadius: 10,
        borderWidth: 1, borderColor: "#E2E8F0",
        paddingHorizontal: 12, fontSize: 16,
    },
    footer: { padding: 16, borderTopWidth: 1, borderTopColor: "#F2F2F2" },
    saveButton: { backgroundColor: "#5B8DEF", padding: 16, borderRadius: 12, alignItems: "center" },
    saveButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    inputFlex: { flex: 1 },  // 입력칸이 남은 너비 채우게
    dupBtn: {
        height: 50, paddingHorizontal: 12,
        borderRadius: 10, backgroundColor: "#EFF3FF",
        alignItems: "center", justifyContent: "center",
    },
    dupBtnText: { color: "#5B8DEF", fontWeight: "700" },
});
