import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, StyleSheet, Switch, Text, View } from "react-native";

export default function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const { profileId } = useAuthStore();
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "알림 설정",
      headerLeft: () => <Pressable style={{ paddingRight: 12 }} onPress={() => router.back()}><Feather name="chevron-left" size={24} color="black" /></Pressable>,
    });
  }, [navigation]);

  useEffect(() => {
    if (!profileId) return;
    const fetchSettings = async () => {
      setLoading(true);
      const { data } = await supabase.from("profiles").select("notifications_on").eq("profile_id", profileId).single();
      setIsEnabled(data?.notifications_on ?? true);
      setLoading(false);
    };
    fetchSettings();
  }, [profileId]);

  const toggleSwitch = async (value: boolean) => {
    if (!profileId || loading) return;
    setIsEnabled(value);
    const { error } = await supabase.from("profiles").update({ notifications_on: value }).eq("profile_id", profileId);
    if (error) {
      Alert.alert("오류", "설정 저장에 실패했습니다.");
      setIsEnabled(!value);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.item}>
          <Text style={styles.label}>푸시 알림 받기</Text>
          <Switch trackColor={{ false: "#E2E8F0", true: "#5B8DEF" }} thumbColor={"#fff"} ios_backgroundColor="#E2E8F0" onValueChange={toggleSwitch} value={isEnabled} disabled={loading} />
        </View>
        <Text style={styles.desc}>알림을 끄면 수면 시간에 맞춘 기록 알림 등 모든 푸시 알림을 받을 수 없어요.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" }, content: { padding: 20 }, item: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 }, label: { fontSize: 16 }, desc: { marginTop: 8, fontSize: 13, color: "#929292", paddingHorizontal: 4 },
});
