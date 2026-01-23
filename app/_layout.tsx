import { useAuthStore } from "@/utils/authStore";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { router, SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
    "Pretendard-Bold": require("@/assets/fonts/Pretendard-Bold.otf"),
    "Pretendard-Medium": require("@/assets/fonts/Pretendard-Medium.otf"),
    "Pretendard-Regular": require("@/assets/fonts/Pretendard-Regular.otf"),
    "Pretendard-SemiBold": require("@/assets/fonts/Pretendard-SemiBold.otf"),
    "RedHat-Bold": require("@/assets/fonts/RedHatDisplay-Bold.ttf"),
    "RedHat-Regular": require("@/assets/fonts/RedHatDisplay-Regular.ttf"),
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await Notifications.getLastNotificationResponseAsync();
        const url = res?.notification?.request?.content?.data?.url as
          | string
          | undefined;
        if (url) setPendingRedirectUrl(url);
      } catch {}
    })();

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (res) => {
        const url = res?.notification?.request?.content?.data?.url as
          | string
          | undefined;
        if (!url) return;
        if (isLoggedIn) router.push(url as any);
        else setPendingRedirectUrl(url);
      }
    );

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
      router.push(tmp as any);
    }
  }, [isLoggedIn, pendingRedirectUrl, clearPendingRedirectUrl]);

  useEffect(() => {
    if (fontsLoaded && !authLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authLoading]);

  if (!fontsLoaded || authLoading) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack>
          {/* 1. 로그인 안 된 유저만 접근 */}
          <Stack.Protected guard={!isLoggedIn}>
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          </Stack.Protected>

          {/* 2. 로그인됐지만 온보딩 안 한 유저만 접근 */}
          <Stack.Protected guard={isLoggedIn && !hasCompletedOnboarding}>
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          </Stack.Protected>

          {/* 3. 로그인&온보딩 완료한 유저만 접근 */}
          <Stack.Protected guard={isLoggedIn && hasCompletedOnboarding}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="photo-organizer"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="making-dearday"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="dearday-editor"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="content-detail"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="photo/[id]" options={{ headerShown: false }} />
            <Stack.Screen
              name="category/[id]"
              options={{ headerShown: false }}
            />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
