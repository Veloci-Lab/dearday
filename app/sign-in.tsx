// app/sign-in.tsx
import { commonStyles } from "@/styles/common";
import { signInWithApple, signInWithGoogle } from "@/utils/api/auth";
import { useAuthStore } from "@/utils/authStore";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

/** 로고 비율 고정 (textmark_white.png 기준) */
const LOGO_AR = 253 / 53;
const LOGO_H = 44;
const LOGO_W = Math.round(LOGO_H * LOGO_AR);
const { height } = Dimensions.get("window");

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logIn, pendingRedirectUrl, clearPendingRedirectUrl } = useAuthStore();

  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      scopes: ["email", "profile"],
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  const afterLoginRoute = async () => {
    await logIn();
    if (pendingRedirectUrl) {
      const url = pendingRedirectUrl;
      clearPendingRedirectUrl();
      router.replace(url as any);
    } else {
      router.replace("/");
    }
  };

  const handleGoogleSignIn = async () => {
    if (loadingGoogle || loadingApple) return;
    setLoadingGoogle(true);
    try {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const userInfo = await GoogleSignin.signIn();
      const idToken = (userInfo as any)?.data?.idToken ?? (userInfo as any)?.idToken;
      if (!idToken) throw new Error("No Google ID token");

      await signInWithGoogle(idToken);
      await afterLoginRoute();
    } catch (error: any) {
      if (
        error?.code !== statusCodes.SIGN_IN_CANCELLED &&
        error?.code !== statusCodes.IN_PROGRESS &&
        error?.code !== statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        console.warn("Google Sign-In Error:", error?.message ?? String(error));
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (loadingGoogle || loadingApple) return;
    setLoadingApple(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) throw new Error("No Apple identityToken");

      await signInWithApple(credential.identityToken);
      await afterLoginRoute();
    } catch (e: any) {
      if (e?.code !== "ERR_REQUEST_CANCELED") {
        console.warn("Apple Sign-In Error:", e?.message ?? String(e));
      }
    } finally {
      setLoadingApple(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <StatusBar style="light" />

      {/* 중앙 로고 */}
      <View style={s.logoContainer}>
        <Image
          source={require("@/assets/images/textmark_blue.png")}
          style={{ width: LOGO_W, height: LOGO_H }}
          resizeMode="contain"
        />
      </View>

      {/* 하단 버튼 영역 */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 24 }]}>
        {/* Google 버튼 */}
        <Pressable
          onPress={handleGoogleSignIn}
          disabled={loadingGoogle || loadingApple}
          style={({ pressed }) => [
            s.socialBtn,
            s.googleBtn,
            pressed && { opacity: 0.9 },
            (loadingGoogle || loadingApple) && { opacity: 0.7 },
          ]}
        >
          <Image
            source={require("@/assets/images/google_logo.png")}
            style={s.socialIcon}
            resizeMode="contain"
          />
          <Text style={[s.socialText, s.googleText]}>Google로 계속하기</Text>
          <View style={s.rightArea}>
            {loadingGoogle && <ActivityIndicator size="small" color="#5B8DEF" />}
          </View>
        </Pressable>

        {/* Apple 버튼 */}
        {Platform.OS === "ios" && (
          <Pressable
            onPress={handleAppleSignIn}
            disabled={loadingGoogle || loadingApple}
            style={({ pressed }) => [
              s.socialBtn,
              s.appleBtn,
              { marginTop: 12 },
              pressed && { opacity: 0.9 },
              (loadingGoogle || loadingApple) && { opacity: 0.7 },
            ]}
          >
            <Image
              source={require("@/assets/images/apple_logo.png")}
              style={s.socialIcon}
              resizeMode="contain"
            />
            <Text style={[s.socialText, s.appleText]}>Apple로 계속하기</Text>
            <View style={s.rightArea}>
              {loadingApple && <ActivityIndicator size="small" color="#5B8DEF" />}
            </View>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  logoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -(height * 0.05),
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: "center",
    width: "100%",
  },
  // 공통 소셜 버튼
  socialBtn: {
    width: 345,
    height: 54,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'center', // 중앙 정렬을 위해 추가
    paddingLeft: 20, // 왼쪽 패딩
    paddingRight: 16, // 오른쪽 패딩
  },
  socialIcon: {
    position: 'absolute', // 아이콘을 절대 위치로
    left: 20, // 왼쪽에 배치
    width: 24,
    height: 24,
  },
  socialText: {
    textAlign: "center",
    fontFamily: "Pretendard-SemiBold", // 폰트 변경
    fontSize: 17, // 폰트 크기 변경
  },
  rightArea: {
    position: 'absolute', // 로딩 인디케이터를 절대 위치로
    right: 16, // 오른쪽에 배치
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  googleBtn: {
    backgroundColor: "#F2F2F2",
  },
  googleText: {
    color: "#1F1F1F",
  },
  appleBtn: {
    backgroundColor: "#000000",
  },
  appleText: {
    color: "#FFFFFF",
  },
});
