// utils/api/notifications.ts
import { Platform } from "react-native";
import { supabase } from "@/utils/supabase";

/**
 * 알림 설정 조회
 */
export async function getNotificationSettings(profileId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_shoot_notif_enabled")
    .eq("profile_id", profileId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 알림 설정 업데이트
 */
export async function updateNotificationSettings(
  profileId: string,
  isEnabled: boolean
) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_shoot_notif_enabled: isEnabled })
    .eq("profile_id", profileId);

  if (error) throw error;
}

/**
 * Expo 푸시 토큰 업데이트
 */
export async function updateExpoPushToken(profileId: string, token: string) {
  const column =
    Platform.OS === "android"
      ? "expo_push_token_android"
      : Platform.OS === "ios"
      ? "expo_push_token_ios"
      : null;

  if (!column) return;

  const { error } = await supabase
    .from("profiles")
    .update({ [column]: token })
    .eq("profile_id", profileId);

  if (error) throw error;
}
