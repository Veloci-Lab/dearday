import { Feather } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Linking, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

const URL = "https://blog.naver.com/wearedearday/223971885263";

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerShadowVisible: false,
      headerTitleAlign: "center",
      headerTitle: () => (
        <View style={{ alignItems: "center" }}>
          <Text style={ styles.Title }>My Dearday</Text>
          <Text style={ styles.SubTitle }>개인정보 처리 방침</Text>
        </View>
      ),
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
          <Feather name="chevron-left" size={24} color="#000" />
        </Pressable>
      ),
    });
  }, [navigation]);

  const renderLoading = () => (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#5B8DEF" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ uri: URL }}
        startInLoadingState
        renderLoading={renderLoading}
        originWhitelist={["*"]}
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures
        onShouldStartLoadWithRequest={(req) => {
          // tel:, mailto: 등 외부 스킴은 시스템으로 넘기기
          if (!req.url.startsWith("http")) {
            Linking.openURL(req.url).catch(() => {});
            return false;
          }
          return true;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff",
    borderTopWidth: 2,
    borderTopColor: "#f2f2f2"
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
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
