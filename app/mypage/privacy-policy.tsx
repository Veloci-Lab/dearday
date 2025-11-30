import { BackButton } from "@/components/BackButton";
import { commonHeaderOptions } from "@/styles/common";
import { useNavigation } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Linking, SafeAreaView, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

const URL = "https://blog.naver.com/wearedearday/223971885263";

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      ...commonHeaderOptions,
      headerTitle: "개인정보 처리 방침",
      headerLeft: () => <BackButton />,
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
});
