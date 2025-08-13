import 'react-native-gesture-handler';

import { useAuthStore } from "@/utils/authStore";
import Feather from "@expo/vector-icons/Feather";
import * as Notifications from 'expo-notifications';
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  Image,
  TouchableOpacity,
  View
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const {
    logIn,
    isLoggedIn,
    hasCompletedOnboarding,
    pendingRedirectUrl,
    setPendingRedirectUrl,
    clearPendingRedirectUrl,
  } = useAuthStore();

  useEffect(() => {
    (async () => {
      try {
        const res = await Notifications.getLastNotificationResponseAsync();
        const url = res?.notification?.request?.content?.data?.url as string | undefined;
        if (url) setPendingRedirectUrl(url);
      } catch {}
    })();

    const subscription = Notifications.addNotificationResponseReceivedListener(res => {
      const url = res?.notification?.request?.content?.data?.url as string | undefined;
      if (!url) return;
      if (isLoggedIn) router.push(url);
      else setPendingRedirectUrl(url);
    });

    logIn();

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoggedIn && pendingRedirectUrl) {
      const tmp = pendingRedirectUrl;
      clearPendingRedirectUrl();
      router.replace(tmp);
    }
  }, [isLoggedIn, pendingRedirectUrl, clearPendingRedirectUrl]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Protected guard={!isLoggedIn}>
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={isLoggedIn && !hasCompletedOnboarding}>
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={isLoggedIn && hasCompletedOnboarding}>
            <Stack.Screen
              name="index"
              options={{
                headerTitle: () => "",
                headerLeft: () => (
                  <Image
                    source={require("@/assets/images/logo.png")} // 로고 이미지 경로
                    style={{ width: 28, height: 28, resizeMode: "contain" }}
                  />
                ),
                headerRight: () => (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity onPress={() => router.push("/calendar")}>
                      <Feather name="calendar" size={20} color="#000" style={{ marginHorizontal: 8 }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push("/pending")}>
                      <Feather name="clock" size={20} color="#000" style={{ marginHorizontal: 8 }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push("/mypage")}>
                      <Feather name="user" size={20} color="#000" style={{ marginHorizontal: 8 }} />
                    </TouchableOpacity>
                  </View>
                ),
              }}
            />
          </Stack.Protected>

        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}