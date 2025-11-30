// utils/api/auth.ts
import { supabase } from "@/utils/supabase";

/**
 * 현재 로그인한 사용자 정보 조회
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  return data.user;
}

/**
 * Google ID 토큰으로 로그인
 */
export async function signInWithGoogle(idToken: string) {
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });

  if (error) throw error;
}

/**
 * Apple ID 토큰으로 로그인
 */
export async function signInWithApple(identityToken: string) {
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: identityToken,
  });

  if (error) throw error;
}

/**
 * 로그아웃
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

/**
 * 계정 삭제 (Edge Function 호출)
 */
export async function deleteUserAccount() {
  const { error } = await supabase.functions.invoke("delete-user", {
    method: "POST",
  });

  if (error) throw error;
}
