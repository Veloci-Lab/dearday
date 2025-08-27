import { Feather } from "@expo/vector-icons";
import * as Application from 'expo-application';
import { router, useNavigation } from "expo-router";
import { useEffect } from "react";
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function VersionScreen() {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({
      headerShadowVisible: false,
      headerTitleAlign: "center",
      headerTitle: () => (
        <View style={{ alignItems: "center" }}>
          <Text style={ styles.Title }>My Dearday</Text>
          <Text style={ styles.SubTitle }>버전 정보</Text>
        </View>
      ),
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
          <Feather name="chevron-left" size={24} color="#000" />
        </Pressable>
      ),
    });
  }, [navigation]);

  const appVersion = Application.nativeApplicationVersion;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoRow}>
          {/* <Image
            source={require("@/assets/images/logo_blue.png")}
            style={styles.logoImg}
            accessible
            accessibilityLabel="Dearday 로고"
          /> 
          <Text style={styles.logoLabel}>Dearday</Text> */}
          <Image
            source={require("@/assets/images/textmark_blue.png")}
            style={styles.logoImg}
            accessible
            accessibilityLabel="Dearday 로고"
          /> 
        </View>
        <Text style={styles.versionText}>현재 버전: {appVersion}</Text>
        <Text style={styles.updateText}>최신 버전을 사용하고 있습니다.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff", 
    justifyContent: 'center',
    borderTopWidth: 2,
    borderTopColor: "#f2f2f2"
  }, 
  content: { padding: 30, alignItems: 'center' }, 
  logoRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  // logoImg: { width: 30, height: 30, resizeMode: "contain", marginRight: 8 },
  logoImg: { height: 30, resizeMode: "contain" },
  logoLabel: { 
    fontFamily: "Pretendard-Bold",
    fontSize: 26, 
    //fontWeight: "bold", 
    color: "#5B8DEF" 
  },
  versionText: { 
    fontFamily: "Pretendard-Regular",
    fontSize: 16, 
    color: '#333', 
    marginBottom: 8 
  }, 
  updateText: { 
    fontFamily: "Pretendard-Regular",
    fontSize: 14, 
    color: '#929292' 
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