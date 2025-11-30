import { Feather } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import { useEffect } from "react";
import { Alert, Linking, Pressable, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function FeedbackScreen() {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({
      headerShadowVisible: false,
      headerTitleAlign: "center",
      headerTitle: () => (
        <View style={{ alignItems: "center" }}>
          <Text style={ styles.Title }>My Dearday</Text>
          <Text style={ styles.SubTitle }>의견 보내기</Text>
        </View>
      ),
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
          <Feather name="chevron-left" size={24} color="#000" />
        </Pressable>
      ),
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
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    justifyContent: 'center',
    borderTopWidth: 2,
    borderTopColor: "#f2f2f2"
  }, 
  content: { padding: 30, alignItems: 'center' }, 
  title: { 
    fontFamily: "Pretendard-Bold",
    fontSize: 22, 
    //fontWeight: 'bold', 
    marginTop: 20, 
    marginBottom: 12 
  }, 
  desc: { 
    fontFamily: "Pretendard-Regular",
    fontSize: 15, 
    color: '#666', 
    textAlign: 'center', 
    lineHeight: 22, 
    marginBottom: 32 
  }, 
  button: { backgroundColor: '#5B8DEF', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center', width: '100%' }, 
  buttonText: { 
    fontFamily: "Pretendard-Bold",
    color: '#fff', 
    //fontWeight: 'bold', 
    fontSize: 16 
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
    marginTop: -1 }
});