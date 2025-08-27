import { useAuthStore } from "@/utils/authStore";
import { useFonts } from "expo-font";
import * as Notifications from 'expo-notifications';
import { router, SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const {
    logIn,
    isLoggedIn,
    authLoading,
    hasCompletedOnboarding,
    pendingRedirectUrl,
    setPendingRedirectUrl,
    clearPendingRedirectUrl,
  } = useAuthStore();

  const [fontsLoaded] = useFonts({
    'Pretendard-Bold': require('@/assets/fonts/Pretendard-Bold.otf'),
    'Pretendard-Medium': require('@/assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-Regular': require('@/assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-SemiBold': require('@/assets/fonts/Pretendard-SemiBold.otf'),
    'RedHat-Bold': require('@/assets/fonts/RedHatDisplay-Bold.ttf'),
  });

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

  useEffect(() => {
    if (fontsLoaded && !authLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authLoading]);

  if (!fontsLoaded || authLoading) {
    return null; // 아직 준비 안됐으면 SplashScreen 유지
  }

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
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* <Stack.Screen
              name="(tabs)"
              options={{
                headerLeft: () => (
                  <Image
                    source={require("@/assets/images/logo_blue.png")}
                    style={{ width: 28, height: 28, resizeMode: "contain" }}
                  />
                ),
                headerTitle: "",
                headerRight: () => (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity onPress={() => router.push("/pending")}>
                      <Feather name="inbox" size={20} color="#000" style={{ marginHorizontal: 8 }} />
                    </TouchableOpacity>
                  </View>
                ),
              }}
            /> */}
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}