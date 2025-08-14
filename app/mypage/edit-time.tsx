import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function EditTimeScreen() {
  const navigation = useNavigation();
  const { profileId } = useAuthStore();
  const [sleepTime, setSleepTime] = useState<Date | null>(null);
  const [otherTime, setOtherTime] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState<"sleep" | "other" | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const formatTime = (date: Date | null) => date ? date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "설정 안함";
  const toTimeString = (date: Date | null) => (date ? date.toTimeString().slice(0, 8) : null);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "시간 설정",
      headerLeft: () => <Pressable style={{ paddingRight: 12 }} onPress={() => router.back()}><Feather name="chevron-left" size={24} color="black" /></Pressable>,
    });
  }, [navigation]);

  useEffect(() => {
    if (!profileId) return;
    const fetchTimes = async () => {
      const { data } = await supabase.from("profiles").select("sleep_time").eq("profile_id", profileId).single();
      if (data?.sleep_time) {
        const [h, m, s] = data.sleep_time.split(":");
        const date = new Date();
        date.setHours(parseInt(h), parseInt(m), parseInt(s));
        setSleepTime(date);
      }
    };
    fetchTimes();
  }, [profileId]);

  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const pickerType = showPicker;
    setShowPicker(null);
    if (event.type === "set" && selectedDate) {
      if (pickerType === "sleep") setSleepTime(selectedDate);
      else if (pickerType === "other") setOtherTime(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!profileId) return;
    setIsSaving(true);
    const { error } = await supabase.from("profiles").update({ sleep_time: toTimeString(sleepTime) }).eq("profile_id", profileId);
    if (error) Alert.alert("오류", "시간 저장에 실패했습니다.");
    else {
      Alert.alert("완료", "시간이 저장되었습니다.");
      router.back();
    }
    setIsSaving(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>수면 시간</Text>
          <Pressable onPress={() => setShowPicker("sleep")} style={styles.input}><Text style={styles.timeText}>{formatTime(sleepTime)}</Text></Pressable>
          <Text style={styles.desc}>이 시간에 맞춰 하루를 기록할 수 있도록 알림을 보내드려요.</Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.saveButton, isSaving && { opacity: 0.7 }]} onPress={handleSave} disabled={isSaving}>
          <Text style={styles.saveButtonText}>저장하기</Text>
        </TouchableOpacity>
      </View>
      {showPicker && <DateTimePicker value={(showPicker === "sleep" ? sleepTime : otherTime) ?? new Date()} mode="time" is24Hour display={Platform.OS === "ios" ? "spinner" : "default"} onChange={onTimeChange} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" }, content: { padding: 20, flexGrow: 1 }, section: { marginBottom: 24 }, label: { fontSize: 16, fontWeight: "600", marginBottom: 8 }, input: { height: 50, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 12, justifyContent: "center" }, timeText: { fontSize: 16, color: "#0F172A" }, desc: { marginTop: 8, fontSize: 13, color: "#929292" }, footer: { padding: 16, borderTopWidth: 1, borderTopColor: "#eee" }, saveButton: { backgroundColor: "#5B8DEF", padding: 16, borderRadius: 12, alignItems: "center" }, saveButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});