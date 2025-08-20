// import { useAuthStore } from "@/utils/authStore";
// import {
//   GoogleSignin,
//   GoogleSigninButton,
//   statusCodes,
// } from '@react-native-google-signin/google-signin';
// import { useRouter } from "expo-router";
// import { SafeAreaView, StyleSheet, Text, View } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { supabase } from '../utils/supabase';

// const LOGO_AR = 253 / 53; // width / height
// const LOGO_H = 44;        // ← 여기 숫자만 바꿔서 크기 조절
// const LOGO_W = Math.round(LOGO_H * LOGO_AR);


// export default function SignInScreen() {
//   const router = useRouter();
//   const insets = useSafeAreaInsets(); // ✅ 안전영역 값
//   const { logIn, pendingRedirectUrl, clearPendingRedirectUrl } = useAuthStore();

//   GoogleSignin.configure({
//     scopes: ['email', 'profile'],
//     webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
//     iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
//     offlineAccess: true,
//   });

//   return (
//     <SafeAreaView style={s.container}>
//       {/* 중앙 로고 */}
//       <View style={s.logoContainer}>
//         <Text style={s.logoText}>Dearday</Text>
//       </View>

//       {/* 하단 구글 로그인 버튼 */}
//       <View style={[s.footer, { paddingBottom: insets.bottom + 24 }]}>
//         <View style={s.buttonWrapper}>
//           <GoogleSigninButton
//             size={GoogleSigninButton.Size.Wide}
//             color={GoogleSigninButton.Color.Light}
//             onPress={async () => {
//               try {
//                 await GoogleSignin.hasPlayServices();
//                 const userInfo = await GoogleSignin.signIn();
                
//                 if (userInfo.data.idToken) {
//                   const { data, error } = await supabase.auth.signInWithIdToken({
//                     provider: 'google',
//                     token: userInfo.data.idToken,
//                   });
//                   if (error) {
//                     console.error('Supabase login failed:', error.message);
//                     return;
//                   }
//                 } else {
//                   throw new Error('no ID token present!');
//                 }
//               } catch (error: any) {
//                 if (error.code === statusCodes.SIGN_IN_CANCELLED) {
//                 } else if (error.code === statusCodes.IN_PROGRESS) {
//                 } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
//                 } else {
//                 }
//               } finally {
//                 logIn();
//                 // router.replace("/");
//               }
//             }}
//           />
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

// const s = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#5B8DEF",
//     justifyContent: "space-between",
//   },
//   logoContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   logoText: {
//     fontSize: 32,
//     fontWeight: "bold",
//     color: "#fff",
//   },
//   footer: {
//     paddingHorizontal: 24,
//     alignItems: "center",
//   },
//   buttonWrapper: { // 버튼 둥글게하려 했으나 안먹혀서 일단 주석처리
//     // borderRadius: 50, 
//     // overflow: "hidden",
//   },
// });

// app/sign-in.tsx
import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** 로고 비율 고정 (textmark_white.png 기준) */
const LOGO_AR = 253 / 53;
const LOGO_H = 44; // 여기만 바꾸면 로고 전체 스케일 조절
const LOGO_W = Math.round(LOGO_H * LOGO_AR);

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logIn, pendingRedirectUrl, clearPendingRedirectUrl } = useAuthStore();

  const [loading, setLoading] = useState(false);

  /** Google 설정은 마운트 시 1회 */
  useEffect(() => {
    GoogleSignin.configure({
      scopes: ["email", "profile"],
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  const handleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      const userInfo = await GoogleSignin.signIn();
      // 라이브러리 버전에 따라 idToken 위치가 다름 → 둘 다 지원
      const idToken =
        (userInfo as any)?.data?.idToken ?? (userInfo as any)?.idToken;

      if (!idToken) throw new Error("No Google ID token");

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });
      if (error) throw error;

      await logIn();

      if (pendingRedirectUrl) {
        const url = pendingRedirectUrl;
        clearPendingRedirectUrl();
        router.replace(url);
      } else {
        router.replace("/");
      }
    } catch (error: any) {
      // 필요하면 이 분기에서 토스트/알럿 처리
      if (
        error?.code !== statusCodes.SIGN_IN_CANCELLED &&
        error?.code !== statusCodes.IN_PROGRESS &&
        error?.code !== statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        console.warn("Google Sign-In Error:", error?.message ?? String(error));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="light" />

      {/* 중앙 로고 */}
      <View style={s.logoContainer}>
        <Image
          source={require("@/assets/images/textmark_white.png")}
          style={{ width: LOGO_W, height: LOGO_H }}
          resizeMode="contain"
        />
      </View>

      {/* 하단 커스텀 Google 버튼 */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          onPress={handleSignIn}
          disabled={loading}
          style={({ pressed }) => [
            s.googleBtn,
            pressed && { opacity: 0.9 },
            loading && { opacity: 0.7 },
          ]}
        >
          <Image
            source={require("@/assets/images/google_logo.png")} // 컬러 G 로고 PNG
            style={s.googleIcon}
            resizeMode="contain"
          />
          <Text style={s.googleText}>Google로 계속하기</Text>
          <View style={s.rightArea}>
            {loading && <ActivityIndicator size="small" color="#5B8DEF" />}
          </View>
        </Pressable>
      </View>

      {/* 하단 커스텀 Apple 버튼 */}
      {/* <View style={[s.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          onPress={handleSignIn}
          disabled={loading}
          style={({ pressed }) => [
            s.AppleBtn,
            pressed && { opacity: 0.9 },
            loading && { opacity: 0.7 },
          ]}
        >
          <Image
            source={require("@/assets/images/apple_logo.png")} // 컬러 G 로고 PNG
            style={s.googleIcon}
            resizeMode="contain"
          />
          <Text style={s.appleText}>Apple로 계속하기</Text>
          <View style={s.rightArea}>
            {loading && <ActivityIndicator size="small" color="#5B8DEF" />}
          </View>
        </Pressable>
      </View> */}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#5B8DEF",
    justifyContent: "space-between",
  },
  logoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 24,
    alignItems: "center",
  },

  // 커스텀 구글 버튼
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    height: 54,
    minWidth: 345,
    paddingHorizontal: 14,
    // shadowColor: "#000",
    // shadowOpacity: 0.12,
    // shadowOffset: { width: 0, height: 6 },
    // shadowRadius: 10,
    // elevation: 4,
  },
  googleIcon: { 
    width: 20, 
    height: 20, 
    marginLeft: 8,
    //marginRight: 10 
  },
  googleText: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Pretendard-SemiBold",
    fontSize: 17,
    // fontWeight: "700",
    color: "#111",
  },
  rightArea: { width: 24, alignItems: "center", justifyContent: "center" },

  // appleBtn: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   backgroundColor: "#fff",
  //   borderRadius: 12,
  //   height: 1,
  //   minWidth: 345,
  //   paddingHorizontal: 14,
  // },

  // appleIcon: { 
  //   width: 20, 
  //   height: 20, 
  //   marginLeft: 8,
  //   //marginRight: 10 
  // },
  // appleText: {
  //   flex: 1,
  //   textAlign: "center",
  //   fontFamily: "Pretendard-SemiBold",
  //   fontSize: 17,
  //   // fontWeight: "700",
  //   color: "#111",
  // },
});
