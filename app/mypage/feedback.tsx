import { Feather } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import { useEffect } from "react";
import { Alert, Linking, Pressable, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function FeedbackScreen() {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({
      headerTitle: "의견 보내기",
      headerLeft: () => <Pressable style={{ paddingRight: 12 }} onPress={() => router.back()}><Feather name="chevron-left" size={24} color="black" /></Pressable>,
    });
  }, [navigation]);

  const handleSendEmail = () => {
    const url = "mailto:ddearday@gmail.com?subject=[Dearday] 의견 보내기";
    Linking.openURL(url).catch(() => Alert.alert("오류", "이메일 앱을 열 수 없습니다."));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Feather name="mail" size={48} color="#5B8DEF" />
        <Text style={styles.title}>소중한 의견을 들려주세요</Text>
        <Text style={styles.desc}>서비스 이용 중 불편했던 점이나 개선 아이디어가 있다면 언제든지 알려주세요.</Text>
        <TouchableOpacity style={styles.button} onPress={handleSendEmail}><Text style={styles.buttonText}>이메일로 의견 보내기</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center'}, content: { padding: 30, alignItems: 'center' }, title: { fontSize: 22, fontWeight: 'bold', marginTop: 20, marginBottom: 12 }, desc: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 32 }, button: { backgroundColor: '#5B8DEF', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center', width: '100%' }, buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});