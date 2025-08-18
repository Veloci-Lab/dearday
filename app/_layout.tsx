import { useAuthStore } from "@/utils/authStore";
import { useFonts } from "expo-font";
import * as Notifications from 'expo-notifications';
import { router, SplashScreen, Stack, Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
// import { useEffect } from "react";
import React, { useEffect, useState, useCallback } from "react";
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BrandedSplash } from "@/components/BrandedSplash";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const {
    logIn,
    isLoggedIn,
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
  });

  const [showBrandOverlay, setShowBrandOverlay] = useState(true);
  const brandVariant: "pre" | "post" =
    isLoggedIn && hasCompletedOnboarding ? "post" : "pre";

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

  // 폰트 로딩 완료 시 네이티브 스플래시 닫기(기존) + 오버레이는 자체 페이드 후 onFinish에서 unmount
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  // 오버레이 종료 콜백 (추가)
  const handleBrandFinish = useCallback(() => {
    setShowBrandOverlay(false);
  }, []);

  if (!fontsLoaded) {
    return null;
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
          </Stack.Protected>
        </Stack>
        {/* ?? 추가: 온보딩 전/후에 따라 다른 브랜딩 스플래시를 1회만 표시 후 페이드아웃 */}
        {showBrandOverlay && (
          <BrandedSplash 
            variant={brandVariant} 
            showMs={1500}
            fadeMs={400}
            onFinish={handleBrandFinish} 
          />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}