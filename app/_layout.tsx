import { useAuthStore } from "@/utils/authStore";
import { useFonts } from "expo-font";
import * as Notifications from 'expo-notifications';
import { router, SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import { Text, TextInput } from 'react-native';
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
    'RedHat-SemiBold': require('@/assets/fonts/RedHatDisplay-SemiBold.ttf'),
    'RedHat-Regular': require('@/assets/fonts/RedHatDisplay-Regular.ttf')
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
      router.push(tmp);
    }
  }, [isLoggedIn, pendingRedirectUrl, clearPendingRedirectUrl]);

  useEffect(() => {
    if (fontsLoaded && !authLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authLoading]);

  if (!fontsLoaded || authLoading) {
    return null; // ���� �غ� �ȵ����� SplashScreen ����
  }

    return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack>
          {/* 1. �α��� �� �� ����ڸ� ���� ȭ�� */}
          <Stack.Protected guard={!isLoggedIn}>
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          </Stack.Protected>

          {/* 2. �α��������� �º��� �� �� ����ڸ� ���� ȭ�� */}
          <Stack.Protected guard={isLoggedIn && !hasCompletedOnboarding}>
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          </Stack.Protected>

          {/* 3. �α��ΰ� �º����� ��� ��ģ ����ڸ� ���� ȭ�� */}
          <Stack.Protected guard={isLoggedIn && hasCompletedOnboarding}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* --- tutorial ȭ���� �� �׷����� �̵� --- */}
            <Stack.Screen name="tutorial" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}