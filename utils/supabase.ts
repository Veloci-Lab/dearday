import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// 런타임 가드 추가
if (!url || !anon) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  throw new Error('Missing Supabase env (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY)');
}

// supabase.ts에 에러 핸들링 추가
export const supabase = createClient(url, anon, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 앱 시작 시 세션 체크 & 에러 처리
(async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('초기 세션 체크:', data.session?.user?.id);
    
    if (data.session) {
      
      // 세션이 있으면 실제로 유효한지 테스트
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      console.log('👤 유저 데이터:', userData?.user?.id);
      console.log('❌ 유저 에러:', userError?.message);
      
      if (userError) {
        console.warn('⚠️ 세션 무효, 클리어 시작');
        await supabase.auth.signOut({ scope: 'local' });
        await AsyncStorage.clear();
        console.log('✅ 로컬 세션 클리어 완료');
      } else {
        console.log('✅ 세션 유효함');
      }
    } else {
      console.log('ℹ️ 세션 없음');
    }
  } catch (error: any) {
    console.error('❌ 세션 초기화 에러:', error.message);
    // 에러나면 무조건 클리어
    await supabase.auth.signOut({ scope: 'local' });
    await AsyncStorage.clear();
    console.log('✅ 에러 발생으로 세션 클리어');
  }
})();

// 토큰 갱신 및 로그아웃 이벤트 핸들링
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('✅ 토큰 갱신 성공');
  }
  if (event === 'SIGNED_OUT') {
    console.log('로그아웃');
  }
});
