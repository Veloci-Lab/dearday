import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MypageScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>마이페이지</Text>
      <Text style={styles.subtitle}>준비 중입니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: "Pretendard-Bold",
    fontSize: 24,
    color: "#222",
  },
  subtitle: {
    fontFamily: "Pretendard",
    fontSize: 14,
    color: "#C3C3C3",
    marginTop: 8,
  },
});
