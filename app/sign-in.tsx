import { useAuthStore } from "@/utils/authStore";
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useRouter } from "expo-router";
import { supabase } from '../utils/supabase';

export default function SignInScreen() {
  const router = useRouter();
  const { logIn, pendingRedirectUrl, clearPendingRedirectUrl } = useAuthStore();

  GoogleSignin.configure({
    scopes: ['email', 'profile'],
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: true,
  })

  return (
    <GoogleSigninButton
      size={GoogleSigninButton.Size.Wide}
      color={GoogleSigninButton.Color.Dark}
      onPress={async () => {
        try {
          await GoogleSignin.hasPlayServices()
          const userInfo = await GoogleSignin.signIn()
          
          if (userInfo.data.idToken) {
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: userInfo.data.idToken,
            })

            if (error) {
              console.error('Supabase login failed:', error.message);
              return; // 또는 사용자에게 알림
            }

            await logIn();
            if(!pendingRedirectUrl) {
              router.replace("/")
            }
            // 아래 두줄 순서 중요 무한루프 안빠지게 꼭 clear부터
            // router.replace(pendingRedirectUrl ? pendingRedirectUrl : '/');
            // clearPendingRedirectUrl();
            
          } else {
            throw new Error('no ID token present!')
          }
        } catch (error: any) {
          if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            // user cancelled the login flow
          } else if (error.code === statusCodes.IN_PROGRESS) {
            // operation (e.g. sign in) is in progress already
          } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            // play services not available or outdated
          } else {
            // some other error happened
          }
        }
      }}
    />
  )
}