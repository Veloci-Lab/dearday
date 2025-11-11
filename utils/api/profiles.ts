// utils/api/profiles.ts
import { supabase } from "@/utils/supabase";

/**
 * 프로필 조회
 */
export async function getProfile(profileId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("profile_id", profileId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 프로필 업데이트
 */
export async function updateProfile(
  profileId: string,
  updates: {
    nickname?: string;
    avatar_url?: string;
    has_completed_onboarding?: boolean;
  }
) {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("profile_id", profileId);

  if (error) throw error;
}

/**
 * 닉네임 중복 확인
 */
export async function checkNicknameAvailability(nickname: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("nickname", nickname);

  if (error) {
    console.error("닉네임 중복 확인 실패:", error.message);
    throw error;
  }

  return count === 0;
}

/**
 * 아바타 이미지 업로드
 */
export async function uploadAvatar(profileId: string, uri: string): Promise<string> {
  const ext = uri.split(".").pop() || "jpg";
  const fileName = `${profileId}_${Date.now()}.${ext}`;
  const filePath = `avatars/${fileName}`;

  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, arrayBuffer, {
      contentType: `image/${ext}`,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * 프로필 소프트 삭제 (계정 삭제 시)
 */
export async function deleteProfile(profileId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_deleted: true, nickname: null })
    .eq("profile_id", profileId);

  if (error) throw error;
}
