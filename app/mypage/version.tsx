import { Feather } from "@expo/vector-icons";
import * as Application from 'expo-application';
import { router, useNavigation } from "expo-router";
import { useEffect } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function VersionScreen() {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({
      headerTitle: "버전 정보",
      headerLeft: () => <Pressable style={{ paddingRight: 12 }} onPress={() => router.back()}><Feather name="chevron-left" size={24} color="black" /></Pressable>,
    });
  }, [navigation]);

  const appVersion = Application.nativeApplicationVersion;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>🟦 Dearday</Text>
        <Text style={styles.versionText}>현재 버전: {appVersion}</Text>
        <Text style={styles.updateText}>최신 버전을 사용하고 있습니다.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", justifyContent: 'center' }, content: { padding: 30, alignItems: 'center' }, logo: { fontSize: 24, fontWeight: "bold", color: "#5B8DEF", marginBottom: 24 }, versionText: { fontSize: 16, color: '#333', marginBottom: 8 }, updateText: { fontSize: 14, color: '#929292' }
});