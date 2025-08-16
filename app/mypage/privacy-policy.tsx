import React, { useEffect } from "react";
import { ActivityIndicator, Linking, Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { useNavigation, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

const URL = "https://blog.naver.com/wearedearday/223971885263";

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "개인정보 처리 방침",
      headerTitleAlign: "center",
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
  container: { flex: 1, backgroundColor: "#fff" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
