import { useAuthStore } from "@/utils/authStore";
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useRouter } from "expo-router";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from '../utils/supabase';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // ✅ 안전영역 값
  const { logIn, pendingRedirectUrl, clearPendingRedirectUrl } = useAuthStore();

  GoogleSignin.configure({
    scopes: ['email', 'profile'],
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: true,
  });

  return (
    <SafeAreaView style={s.container}>
      {/* 중앙 로고 */}
      <View style={s.logoContainer}>
        <Text style={s.logoText}>Dearday</Text>
      </View>

      {/* 하단 구글 로그인 버튼 */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={s.buttonWrapper}>
          <GoogleSigninButton
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Light}
            onPress={async () => {
              try {
                await GoogleSignin.hasPlayServices();
                const userInfo = await GoogleSignin.signIn();
                
                if (userInfo.data.idToken) {
                  const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: userInfo.data.idToken,
                  });
                  if (error) {
                    console.error('Supabase login failed:', error.message);
                    return;
                  }
                } else {
                  throw new Error('no ID token present!');
                }
              } catch (error: any) {
                if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                } else if (error.code === statusCodes.IN_PROGRESS) {
                } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                } else {
                }
              } finally {
                logIn();
                // router.replace("/");
              }
            }}
          />
        </View>
      </View>
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
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  footer: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  buttonWrapper: { // 버튼 둥글게하려 했으나 안먹혀서 일단 주석처리
    // borderRadius: 50, 
    // overflow: "hidden",
  },
});
