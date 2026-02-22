// app/sign-in.tsx
import { signInWithApple, signInWithGoogle } from "@/utils/api/auth";
import { useAuthStore } from "@/utils/authStore";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

/** 로고 비율 고정 (textmark_white.png 기준) */
const LOGO_AR = 253 / 53;
const LOGO_H = 44;
const LOGO_W = Math.round(LOGO_H * LOGO_AR);
const { height } = Dimensions.get("window");

const DeardayTextLogo = () => (
  <Svg width="181" height="48" viewBox="0 0 181 48" fill="none">
    <Path
      d="M154.504 48.0015C153.522 48.0015 152.392 47.8541 151.409 47.461L151.606 44.8079C152.441 44.9553 153.424 45.1027 154.259 45.1027C157.551 45.0536 159.27 43.5305 161.334 40.0913L163.152 36.996L156.322 11.0547H159.467L165.215 33.2129L177.301 11.0547H180.741L164.331 40.9265C162.562 44.2183 159.516 48.0015 154.504 48.0015Z"
      fill="black"
    />
    <Path
      d="M138.723 37.7835C131.599 37.7835 126.686 32.2808 126.686 25.1076C126.686 17.1484 132.63 10.5156 140.442 10.5156C145.159 10.5156 148.893 12.8248 150.711 16.5096L151.448 11.1052H154.445L151.644 31.2982C151.349 33.6074 151.3 35.1796 151.349 37.1939H148.402C148.352 35.8183 148.352 34.6391 148.451 33.2634C146.142 36.1131 142.555 37.7835 138.723 37.7835ZM129.83 25.2059C129.83 30.7577 133.515 34.8356 138.821 34.8356C145.012 34.8356 149.679 29.4803 149.679 23.1424C149.679 17.394 145.699 13.4635 140.491 13.4635C134.301 13.4635 129.83 18.8188 129.83 25.2059Z"
      fill="black"
    />
    <Path
      d="M109.644 37.782C102.52 37.782 97.6064 32.2793 97.6064 25.1061C97.6064 17.1468 103.551 10.5141 111.363 10.5141C116.08 10.5141 119.814 12.8233 121.632 16.5573L123.941 0H126.938L122.565 31.1001C122.27 33.3111 122.221 34.8833 122.27 37.1924H119.323C119.273 35.7185 119.322 34.4902 119.372 33.2128C117.062 36.1115 113.525 37.782 109.644 37.782ZM100.751 25.2044C100.751 30.7562 104.436 34.8341 109.742 34.8341C115.932 34.8341 120.6 29.4788 120.6 23.1409C120.6 17.3925 116.62 13.462 111.412 13.462C105.222 13.462 100.751 18.8173 100.751 25.2044Z"
      fill="black"
    />
    <Path
      d="M84.1035 37.1924L87.7392 11.1037H90.7363L90.2941 14.3464C91.9645 12.0863 94.7159 10.7598 97.9586 10.7598H99.5799L99.1868 13.7076H97.1724C92.9472 13.7076 89.9501 16.6555 89.2623 21.4704L87.0514 37.1924H84.1035Z"
      fill="black"
    />
    <Path
      d="M67.7979 37.7835C60.6739 37.7835 55.7607 32.2808 55.7607 25.1076C55.7607 17.1484 61.7056 10.5156 69.5175 10.5156C74.2341 10.5156 77.9681 12.8248 79.786 16.5096L80.5229 11.1052H83.5199L80.7195 31.2982C80.4247 33.6074 80.3755 35.1796 80.4247 37.1939H77.4768C77.4277 35.8183 77.4277 34.6391 77.5259 33.2634C75.2168 36.1131 71.6302 37.7835 67.7979 37.7835ZM58.9051 25.2059C58.9051 30.7577 62.59 34.8356 67.8962 34.8356C74.0867 34.8356 78.7542 29.4803 78.7542 23.1424C78.7542 17.394 74.7746 13.4635 69.5666 13.4635C63.3761 13.4635 58.9051 18.8188 58.9051 25.2059Z"
      fill="black"
    />
    <Path
      d="M41.3626 37.7835C34.2877 37.7835 29.1289 32.3791 29.1289 25.0585C29.1289 17.1975 34.9264 10.5156 42.64 10.5156C49.4693 10.5156 53.842 15.7727 53.842 22.0615C53.842 23.0441 53.6454 24.2724 53.4981 25.0585H32.1259V25.5498C32.1259 31.1508 36.1547 35.0322 41.3626 35.0322C45.1949 35.0322 48.1919 33.0178 50.1571 30.0208L52.6137 31.4456C50.5993 35.1304 46.2757 37.7835 41.3626 37.7835ZM32.4207 22.3563H50.7467C51.1889 17.1975 47.6514 13.267 42.64 13.267C37.2847 13.267 33.5016 17.0501 32.4207 22.3563Z"
      fill="black"
    />
    <Path
      d="M12.0372 37.782C4.91313 37.782 0 32.2793 0 25.1061C0 17.1468 5.94489 10.5141 13.7568 10.5141C18.4734 10.5141 22.2074 12.8233 24.0252 16.5573L26.3344 0H29.3314L24.9587 31.1001C24.6639 33.3111 24.6148 34.8833 24.6639 37.1924H21.7161C21.6669 35.7185 21.7161 34.4902 21.7652 33.2128C19.456 36.1115 15.9186 37.782 12.0372 37.782ZM3.14441 25.2044C3.14441 30.7562 6.82926 34.8341 12.1354 34.8341C18.326 34.8341 22.9935 29.4788 22.9935 23.1409C22.9935 17.3925 19.0138 13.462 13.8059 13.462C7.61536 13.462 3.14441 18.8173 3.14441 25.2044Z"
      fill="black"
    />
  </Svg>
);

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
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }
      const userInfo = await GoogleSignin.signIn();
      const idToken =
        (userInfo as any)?.data?.idToken ?? (userInfo as any)?.idToken;
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

  const [isVideoFinished, setIsVideoFinished] = useState(false);

  //   return (
  //     <SafeAreaView style={commonStyles.container}>
  //       <StatusBar style="light" />

  //       {/* 중앙 로고 */}
  //       <View style={s.logoContainer}>
  //         <Image
  //           source={require("@/assets/images/textmark_blue.png")}
  //           style={{ width: LOGO_W, height: LOGO_H }}
  //           resizeMode="contain"
  //         />
  //       </View>

  //       {/* 하단 버튼 영역 */}
  //       <View style={[s.footer, { paddingBottom: insets.bottom + 24 }]}>
  //         {/* Google 버튼 */}
  //         <Pressable
  //           onPress={handleGoogleSignIn}
  //           disabled={loadingGoogle || loadingApple}
  //           style={({ pressed }) => [
  //             s.socialBtn,
  //             s.googleBtn,
  //             pressed && { opacity: 0.9 },
  //             (loadingGoogle || loadingApple) && { opacity: 0.7 },
  //           ]}
  //         >
  //           <Image
  //             source={require("@/assets/images/google_logo.png")}
  //             style={s.socialIcon}
  //             resizeMode="contain"
  //           />
  //           <Text style={[s.socialText, s.googleText]}>Google로 계속하기</Text>
  //           <View style={s.rightArea}>
  //             {loadingGoogle && <ActivityIndicator size="small" color="#5B8DEF" />}
  //           </View>
  //         </Pressable>

  //         {/* Apple 버튼 */}
  //         {Platform.OS === "ios" && (
  //           <Pressable
  //             onPress={handleAppleSignIn}
  //             disabled={loadingGoogle || loadingApple}
  //             style={({ pressed }) => [
  //               s.socialBtn,
  //               s.appleBtn,
  //               { marginTop: 12 },
  //               pressed && { opacity: 0.9 },
  //               (loadingGoogle || loadingApple) && { opacity: 0.7 },
  //             ]}
  //           >
  //             <Image
  //               source={require("@/assets/images/apple_logo.png")}
  //               style={s.socialIcon}
  //               resizeMode="contain"
  //             />
  //             <Text style={[s.socialText, s.appleText]}>Apple로 계속하기</Text>
  //             <View style={s.rightArea}>
  //               {loadingApple && <ActivityIndicator size="small" color="#5B8DEF" />}
  //             </View>
  //           </Pressable>
  //         )}
  //       </View>
  //     </SafeAreaView>
  //   );
  // }

  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const REMOTE_DD_LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/emoji/default.png`;

  return (
    <View style={s.mainContainer}>
      <StatusBar style={isVideoFinished ? "dark" : "light"} />

      {/* 1. 배경 비디오 레이어 */}
      {!isVideoFinished && (
        <Video
          source={require("@/assets/videos/splash.mp4")}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isMuted
          isLooping={false}
          onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
            if (!status.isLoaded) {
              if ((status as any).error) {
                console.error("비디오 에러:", (status as any).error);
                setIsVideoFinished(true); // 에러나도 넘어가게
              }
              return;
            }
            if (status.didJustFinish) setIsVideoFinished(true);
          }}
        />
      )}

      {/* 2. 메인 콘텐츠 (비디오가 끝난 후에만 렌더링되도록 처리) */}
      {isVideoFinished && (
        <SafeAreaView style={s.overlay}>
          {/* 중앙 로고 영역: 이미지와 SVG가 가로로 나열됨 */}
          <View style={s.logoContainer}>
            <View style={s.rowLogo}>
              <Image
                source={{ uri: REMOTE_DD_LOGO_URL }}
                style={s.characterIcon}
                resizeMode="contain"
              />
              {/* SVG 텍스트 로고 */}
              <View style={s.svgWrapper}>
                <DeardayTextLogo />
              </View>
            </View>
          </View>

          {/* 3. 하단 버튼 영역 */}
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
              <Text style={[s.socialText, s.googleText]}>
                Google로 계속하기
              </Text>
              <View style={s.rightArea}>
                {loadingGoogle && (
                  <ActivityIndicator size="small" color="#5B8DEF" />
                )}
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
                <Text style={[s.socialText, s.appleText]}>
                  Apple로 계속하기
                </Text>
                <View style={s.rightArea}>
                  {loadingApple && (
                    <ActivityIndicator size="small" color="#5B8DEF" />
                  )}
                </View>
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      )}
    </View>
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
    justifyContent: "center", // 중앙 정렬을 위해 추가
    paddingLeft: 20, // 왼쪽 패딩
    paddingRight: 16, // 오른쪽 패딩
  },
  socialIcon: {
    position: "absolute", // 아이콘을 절대 위치로
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
    position: "absolute", // 로딩 인디케이터를 절대 위치로
    right: 16, // 오른쪽에 배치
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  googleBtn: {
    width: "100%",
    height: 54,
    borderRadius: 12,
    backgroundColor: "#F2F2F2", // 요청하신 배경색
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  overlay: {
    flex: 1,
  },
  rowLogo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingBottom: height * 0.04,
    marginRight: 20,
  },
  svgWrapper: {
    justifyContent: "center",
  },
  characterIcon: {
    width: 59,
    height: 59,
  },
});