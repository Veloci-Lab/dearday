import { commonHeaderOptions } from "@/styles/common";
import { useAuthStore } from "@/utils/authStore";
import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync"; // Expo push 토큰 발급
import { supabase } from "@/utils/supabase";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Path, Svg } from "react-native-svg";

export type NotificationSettings = {
  daily_question_enabled: boolean;
  emoji_enabled: boolean;
  follow_enabled: boolean;
};

export async function getNotificationSettings(
  profileId: string,
): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from("notification_settings")
    .select(`daily_question_enabled, emoji_enabled, follow_enabled`)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    await supabase.from("notification_settings").insert({
      profile_id: profileId,
      daily_question_enabled: true,
      emoji_enabled: true,
      follow_enabled: true,
    });
    return {
      daily_question_enabled: true,
      emoji_enabled: true,
      follow_enabled: true,
    };
  }

  return (
    data ?? {
      daily_question_enabled: true,
      emoji_enabled: true,
      follow_enabled: true,
    }
  );
}

export async function updateNotificationSettings(
  profileId: string,
  payload: Partial<NotificationSettings>,
) {
  const { error } = await supabase
    .from("notification_settings")
    .update(payload)
    .eq("profile_id", profileId);

  if (error) throw error;
}

export async function updateExpoPushToken(profileId: string, token: string) {
  const { error } = await supabase
    .from("notification_settings")
    .update({ expo_push_token: token })
    .eq("profile_id", profileId);

  if (error) throw error;
}

export default function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  const { profileId } = useAuthStore();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [reissuing, setReissuing] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      ...commonHeaderOptions,
      headerTitle: () => <Text style={styles.headerTitle}>알림 설정</Text>,
      headerLeft: () => (
        <Pressable onPress={() => router.replace("/settings")}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12.5659 19.4344C12.8783 19.7468 12.8783 20.2533 12.5659 20.5657C12.2535 20.8782 11.7469 20.8782 11.4345 20.5657L3.43451 12.5657C3.12209 12.2533 3.12209 11.7468 3.43451 11.4344L11.4345 3.43436C11.7469 3.12194 12.2535 3.12194 12.5659 3.43436C12.8783 3.74678 12.8783 4.25331 12.5659 4.56573L5.93157 11.2L19.9998 11.2C20.4416 11.2 20.7998 11.5582 20.7998 12C20.7998 12.4419 20.4416 12.8 19.9998 12.8L5.93157 12.8L12.5659 19.4344Z"
              fill="#0D0D0D"
            />
          </Svg>
        </Pressable>
      ),
    });
  }, [navigation]);

  /** 초기 로딩 */
  useEffect(() => {
    if (!profileId) return;

    (async () => {
      setLoading(true);
      try {
        const data = await getNotificationSettings(profileId);
        setSettings({ ...data });
      } catch (e) {
        console.error(e);
        Alert.alert("오류", "알림 설정을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [profileId]);

  const updateSetting = async (
    key: keyof NotificationSettings,
    value: boolean,
  ) => {
    if (!profileId || !settings) return;

    const prev = settings[key];
    setSettings({ ...settings, [key]: value });

    try {
      await updateNotificationSettings(profileId, { [key]: value });
    } catch (e) {
      setSettings({ ...settings, [key]: prev });
      Alert.alert("오류", "설정 저장에 실패했습니다.");
    }
  };

  /** 푸시 토큰 재발급 **/
  const handleReissueToken = async () => {
    if (!profileId) return;

    try {
      setReissuing(true);
      const token = await registerForPushNotificationsAsync();
      console.log("Expo Push Token:", token);

      if (!token) {
        Alert.alert("안내", "푸시 권한을 확인해주세요.");
        return;
      }

      await updateExpoPushToken(profileId, token);
      Alert.alert("완료", "푸시 토큰이 등록되었습니다.");
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "푸시 토큰 재등록에 실패했습니다.");
    } finally {
      setReissuing(false);
    }
  };

  if (!settings) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <SwitchRow
          title="오늘의 질문"
          subtitle="“오늘의 질문이 도착해 있어요.”"
          value={settings.daily_question_enabled}
          onValueChange={(v) => updateSetting("daily_question_enabled", v)}
          disabled={loading}
        />
        <SwitchRow
          title="좋아요"
          subtitle="“dearday님이 회원님의 사진에 반응했어요.”"
          value={settings.emoji_enabled}
          onValueChange={(v) => updateSetting("emoji_enabled", v)}
          disabled={loading}
        />
        <SwitchRow
          title="팔로우 요청"
          subtitle="“dearday님이 회원님을 팔로우하고 싶어 해요.”"
          value={settings.follow_enabled}
          onValueChange={(v) => updateSetting("follow_enabled", v)}
          disabled={loading}
        />

        <View style={styles.reissueBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reissueTitle}>푸시 토큰 다시 등록</Text>
            <Text style={styles.reissueDesc}>
              알림이 오지 않을 때 다시 등록해 주세요.
            </Text>
          </View>
          <Pressable
            onPress={handleReissueToken}
            style={[styles.reissueBtn, reissuing && { opacity: 0.7 }]}
            disabled={reissuing}
          >
            <Text style={styles.reissueBtnText}>
              {reissuing ? "진행중…" : "재발급"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

/** 공통 스위치 */
function SwitchRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.item}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#E2E8F0", true: "#5B8DEF" }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontFamily: "Pretendard-Bold",
    fontSize: 17,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopWidth: 2,
    borderTopColor: "#f2f2f2",
  },
  content: { paddingHorizontal: 24, paddingVertical: 18 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  title: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    color: "#0D0D0D",
    fontWeight: 600,
    lineHeight: 16,
    letterSpacing: -0.42,
  },
  subtitle: {
    fontFamily: "Pretendard-Regular",
    marginTop: 4,
    fontSize: 12,
    color: "#929292",
    lineHeight: 16,
    letterSpacing: -0.36,
  },

  reissueBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  reissueTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    color: "#0D0D0D",
    fontWeight: 600,
    lineHeight: 16,
    letterSpacing: -0.42,
  },
  reissueDesc: {
    fontFamily: "Pretendard-Regular",
    marginTop: 4,
    fontSize: 12,
    color: "#929292",
    lineHeight: 16,
    letterSpacing: -0.36,
  },
  reissueBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#EFF3FF",
    borderRadius: 10,
    marginLeft: 12,
  },
  reissueBtnText: {
    fontFamily: "Pretendard-SemiBold",
    color: "#5B8DEF",
  },
});
