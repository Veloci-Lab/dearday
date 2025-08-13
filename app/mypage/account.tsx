import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

// 이 부분이 가장 중요합니다!
export default function AccountScreen() {
  const navigation = useNavigation();
  const { profileId, logOut } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "계정 관리",
      headerLeft: () => <Pressable style={{ paddingRight: 12 }} onPress={() => router.back()}><Feather name="chevron-left" size={24} color="black" /></Pressable>,
    });
  }, [navigation]);

  useEffect(() => {
    if (!profileId) return;
    const fetchProfile = async () => {
      setLoading(true);
      const { data } = await supabase.from("profiles").select("*").eq("profile_id", profileId).single();
      if (data) {
        setProfile(data);
        setNickname(data.nickname);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [profileId]);

  const handleSave = async () => {
    if (!profileId || !nickname.trim()) return Alert.alert("입력 오류", "닉네임을 입력해주세요.");
    setIsSaving(true);
    const { error } = await supabase.from("profiles").update({ nickname: nickname.trim() }).eq("profile_id", profileId);
    if (error) Alert.alert("오류", "닉네임 변경 중 문제가 발생했습니다.");
    else {
      Alert.alert("완료", "닉네임이 변경되었습니다.");
      router.back();
    }
    setIsSaving(false);
  };

  const handleAccountDelete = () => {
    Alert.alert("회원 탈퇴", "정말로 탈퇴하시겠습니까? 모든 기록이 영구적으로 삭제되며 복구할 수 없습니다.", [
      { text: "취소", style: "cancel" },
      { text: "탈퇴하기", style: "destructive", onPress: () => console.log("TODO: 회원 탈퇴 로직 실행") },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>프로필 정보</Text>
          <View style={styles.profileBox}>
            <Image source={{ uri: profile?.avatar_url }} style={styles.avatar} />
            <TouchableOpacity style={styles.avatarEdit} onPress={() => Alert.alert("알림", "프로필 사진 변경 기능은 준비 중입니다.")}>
              <Feather name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>닉네임</Text>
          <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholder="닉네임을 입력하세요" />
        </View>
        <TouchableOpacity style={[styles.saveButton, isSaving && { opacity: 0.7 }]} onPress={handleSave} disabled={isSaving}>
          <Text style={styles.saveButtonText}>변경사항 저장</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>회원 탈퇴</Text>
          <Text style={styles.descText}>회원 탈퇴 시 모든 사진과 기록이 삭제되며, 복구할 수 없습니다. 신중하게 결정해주세요.</Text>
          <TouchableOpacity onPress={handleAccountDelete}><Text style={styles.deleteText}>계정 영구 삭제</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" }, center: { flex: 1, justifyContent: "center", alignItems: "center" }, content: { padding: 20 }, section: { marginBottom: 24 }, sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 }, profileBox: { alignSelf: "center", marginBottom: 20 }, avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#eee" }, avatarEdit: { position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: "#5B8DEF", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#fff" }, label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 }, input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16 }, saveButton: { backgroundColor: "#5B8DEF", padding: 16, borderRadius: 12, alignItems: "center" }, saveButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 }, divider: { height: 1, backgroundColor: "#F3F5F7", marginVertical: 24 }, descText: { fontSize: 14, color: "#666", lineHeight: 20, marginBottom: 16 }, deleteText: { fontSize: 15, color: "#FF5A5A", textDecorationLine: "underline" },
});