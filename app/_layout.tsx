import { useAuthStore } from "@/utils/authStore";
import * as Notifications from 'expo-notifications';
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

export default function RootLayout() {
  const {
    logIn,
    isLoggedIn,
    hasCompletedOnboarding,
    pendingRedirectUrl,
    setPendingRedirectUrl,
    clearPendingRedirectUrl,
  } = useAuthStore();

  // ✅ 1. 앱이 푸시 알림으로 실행된 경우 목적지 URL 저장
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then(res => {
      const url = res?.notification?.request?.content?.data?.url;
      if (url) {
        setPendingRedirectUrl(url);
      }
    });
    setPendingRedirectUrl('/camera?memory_id=10&notification_id=37');

    // ✅ 실시간 푸시 클릭 감지 리스너 등록
    const subscription = Notifications.addNotificationResponseReceivedListener(res => {
      const url = res?.notification?.request?.content?.data?.url;
      if (url) {
        if (isLoggedIn) { // 앱 사용중 push받음
          router.push(url);
        } else { // 혹시 앱 켜진 상태 && 로그인 화면에 있는 상태일때 push가는 아주 드문 케이스
          setPendingRedirectUrl(url);
        }
      }
    });

    logIn(); // ✅ 2. 로그인 여부 확인

      // ✅ 언마운트 시 구독 해제
  return () => {
    subscription.remove();
  };
  }, []);

  // ✅ 3. 로그인 완료 후 URL 리디렉션 처리
  useEffect(() => {
    if (isLoggedIn && pendingRedirectUrl) {
      const tmp = pendingRedirectUrl; // ✅ 변수로 분리
      clearPendingRedirectUrl(); // ✅ 리디렉션 후 초기화
      router.replace(tmp); // ✅ 변수 사용
    }
  }, [isLoggedIn, pendingRedirectUrl]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={isLoggedIn && !hasCompletedOnboarding}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={isLoggedIn && hasCompletedOnboarding}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
