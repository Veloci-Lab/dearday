// import { commonHeaderOptions } from "@/styles/common";
// import { useAuthStore } from "@/utils/authStore";
// import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync";
// import { supabase } from "@/utils/supabase";
// import { router, useNavigation } from "expo-router";
// import { useEffect, useState } from "react";
// import {
//   Alert,
//   Pressable,
//   SafeAreaView,
//   StyleSheet,
//   Switch,
//   Text,
//   View
// } from "react-native";
// import { Path, Svg } from "react-native-svg";

// export default function NotificationSettingsScreen() {
//   const navigation = useNavigation();
//   const { profileId } = useAuthStore();

//   // 디어데이 알람 상태
//   const [shootEnabled, setShootEnabled] = useState(true);
//   const [loading, setLoading] = useState(true);
//   const [reissuing, setReissuing] = useState(false);

//   useEffect(() => {
//     navigation.setOptions({
//       ...commonHeaderOptions,
//       headerTitle: () => (
//         <Text style={styles.headerTitle}>
//           알림 설정
//         </Text>
//       ),
//       headerLeft: () => <Pressable onPress={() => router.replace('/settings')}>
//         <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
//             <Path
//             d="M12.5659 19.4344C12.8783 19.7468 12.8783 20.2533 12.5659 20.5657C12.2535 20.8782 11.7469 20.8782 11.4345 20.5657L3.43451 12.5657C3.12209 12.2533 3.12209 11.7468 3.43451 11.4344L11.4345 3.43436C11.7469 3.12194 12.2535 3.12194 12.5659 3.43436C12.8783 3.74678 12.8783 4.25331 12.5659 4.56573L5.93157 11.2L19.9998 11.2C20.4416 11.2 20.7998 11.5582 20.7998 12C20.7998 12.4419 20.4416 12.8 19.9998 12.8L5.93157 12.8L12.5659 19.4344Z"
//             fill="#0D0D0D"
//             />
//         </Svg>
//         </Pressable>,
//     });
//   }, [navigation]);

//   // 초기 로딩: 디어데이 알람 설정 불러오기
//   useEffect(() => {
//     if (!profileId) return;
//     (async () => {
//       setLoading(true);
//       try {
//         const data = await getNotificationSettings(profileId);
//         setShootEnabled(data?.is_shoot_notif_enabled ?? true);
//       } catch (error) {
//         console.error("알림 설정 불러오기 실패:", error);
//         Alert.alert("오류", "알림 설정을 불러오지 못했습니다.");
//       }
//       setLoading(false);
//     })();
//   }, [profileId]);

//   // 토글 핸들러
//   const toggleSwitch = async (value: boolean) => {
//     if (!profileId || loading) return;

//     setShootEnabled(value);

//     try {
//       await updateNotificationSettings(profileId, value);
//     } catch (error) {
//       setShootEnabled(!value);
//       Alert.alert("오류", "설정 저장에 실패했습니다.");
//     }
//   };

//   // 토큰 재발급
//   const handleReissueToken = async () => {
//     if (!profileId) return;
//     try {
//       setReissuing(true);
//       const token = await registerForPushNotificationsAsync();
//       if (!token) {
//         Alert.alert("안내", "토큰을 발급하지 못했습니다. 권한을 확인해주세요.");
//         return;
//       }

//       await updateExpoPushToken(profileId, token);
//       Alert.alert("완료", "푸시 토큰이 다시 등록되었습니다.");
//     } catch (e) {
//       console.error(e);
//       Alert.alert("오류", "토큰 재발급에 실패했습니다.");
//     } finally {
//       setReissuing(false);
//     }
//   };

//   // 공통 스위치 UI
//   const SwitchRow = ({
//     title,
//     subtitle,
//     value,
//     onValueChange,
//     disabled,
//   }: {
//     title: string;
//     subtitle?: string;
//     value: boolean;
//     onValueChange: (v: boolean) => void;
//     disabled?: boolean;
//   }) => (
//     <View style={styles.item}>
//       <View style={{ flex: 1 }}>
//         <Text style={styles.title}>{title}</Text>
//         {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
//       </View>
//       <Switch
//         value={value}
//         onValueChange={onValueChange}
//         disabled={disabled}
//         trackColor={{ false: "#E2E8F0", true: "#5B8DEF" }}
//         thumbColor={"#fff"}
//         ios_backgroundColor="#E2E8F0"
//       />
//     </View>
//   );

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.content}>
//         {/* 디어데이 알람 */}
//         <SwitchRow
//           title="디어데이 알람"
//           subtitle="사진 찍을 시간을 알려드려요."
//           value={shootEnabled}
//           onValueChange={toggleSwitch}
//           disabled={loading}
//         />

//         {/* 토큰 재발급 */}
//         <View style={styles.reissueBox}>
//           <View style={{ flex: 1 }}>
//             <Text style={styles.reissueTitle}>푸시 토큰 다시 등록</Text>
//             <Text style={styles.reissueDesc}>
//               권한 변경이나 앱 재설치 후 알림이 오지 않을 때 다시 등록해 주세요.
//             </Text>
//           </View>
//           <Pressable
//             onPress={handleReissueToken}
//             style={[styles.reissueBtn, reissuing && { opacity: 0.7 }]}
//             disabled={reissuing}
//           >
//             <Text style={styles.reissueBtnText}>
//               {reissuing ? "진행중…" : "재발급"}
//             </Text>
//           </Pressable>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   headerTitle: { 
//     fontFamily: "Pretendard-Bold", 
//     fontSize: 17,
//   },
//   container: { 
//     flex: 1, 
//     backgroundColor: "#fff",
//     borderTopWidth: 2,
//     borderTopColor: "#f2f2f2"
//    },
//   content: { paddingHorizontal: 20, paddingVertical: 5 },
//   item: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 14,
//     borderBottomWidth: 1,
//     borderBottomColor: "#F1F5F9",
//   },
//   title: {
//     fontFamily: "Pretendard-SemiBold",
//     fontSize: 15,
//     color: "#111",
//   },
//   subtitle: {
//     fontFamily: "Pretendard-Regular",
//     marginTop: 4,
//     fontSize: 12,
//     color: "#8E8E93",
//     lineHeight: 16,
//   },

//   reissueBox: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 14,
//   },
//   reissueTitle: {
//     fontFamily: "Pretendard-SemiBold",
//     fontSize: 14,
//     color: "#111",
//   },
//   reissueDesc: {
//     fontFamily: "Pretendard-Regular",
//     marginTop: 4,
//     fontSize: 12,
//     color: "#8E8E93",
//     lineHeight: 16,
//   },
//   reissueBtn: {
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     backgroundColor: "#EFF3FF",
//     borderRadius: 10,
//     marginLeft: 12,
//   },
//   reissueBtnText: {
//     fontFamily: "Pretendard-SemiBold",
//     color: "#5B8DEF",
//   },
// });

import { commonHeaderOptions } from "@/styles/common";
import { useAuthStore } from "@/utils/authStore";
import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync"; // Expo push 토큰 발급
import { supabase } from '@/utils/supabase';
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, StyleSheet, Switch, Text, View } from "react-native";
import { Path, Svg } from "react-native-svg";

export type NotificationSettings = {
  daily_question_enabled: boolean;
  emoji_enabled: boolean;
  follow_enabled: boolean;
};

export async function getNotificationSettings(profileId: string): Promise<NotificationSettings> {
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

  return data ?? { daily_question_enabled: true, emoji_enabled: true, follow_enabled: true };
}

export async function updateNotificationSettings(
  profileId: string,
  payload: Partial<NotificationSettings>
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

// --- 테스트용 푸시 전송 함수 ---
async function sendTestPush(token: string, title: string, body: string) {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: token,
        title,
        body,
        sound: "default",
      }),
    });
    console.log("푸시 전송 완료");
  } catch (err) {
    console.error("푸시 전송 실패:", err);
  }
}

async function sendPush(token: string, title: string, body: string) {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: token, title, body, sound: "default" }),
    });
    console.log("푸시 전송 완료:", title);
  } catch (err) {
    console.error("푸시 전송 실패:", err);
  }
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
    headerTitle: () => (
      <Text style={styles.headerTitle}>
        알림 설정
      </Text>
    ),
    headerLeft: () => <Pressable onPress={() => router.replace('/settings')}>
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path
          d="M12.5659 19.4344C12.8783 19.7468 12.8783 20.2533 12.5659 20.5657C12.2535 20.8782 11.7469 20.8782 11.4345 20.5657L3.43451 12.5657C3.12209 12.2533 3.12209 11.7468 3.43451 11.4344L11.4345 3.43436C11.7469 3.12194 12.2535 3.12194 12.5659 3.43436C12.8783 3.74678 12.8783 4.25331 12.5659 4.56573L5.93157 11.2L19.9998 11.2C20.4416 11.2 20.7998 11.5582 20.7998 12C20.7998 12.4419 20.4416 12.8 19.9998 12.8L5.93157 12.8L12.5659 19.4344Z"
          fill="#0D0D0D"
          />
      </Svg>
      </Pressable>,
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

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
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

  /** 푸시 토큰 재발급 + Daily Question 테스트 푸시 전송 */
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

  useEffect(() => {
    if (!settings?.daily_question_enabled || !profileId) return;

    const scheduleDailyQuestion = () => {
      const now = new Date();
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0); // 다음 0시
      const msUntilMidnight = nextMidnight.getTime() - now.getTime();

      const timeoutId = setTimeout(async () => {
        const { data: profile } = await supabase
          .from("notification_settings")
          .select("expo_push_token")
          .eq("profile_id", profileId)
          .maybeSingle();

        if (profile?.expo_push_token) {
          await sendPush(profile.expo_push_token, "오늘의 질문", "오늘 하루 질문을 확인해보세요!");
        }

        // 다음날 반복
        scheduleDailyQuestion();
      }, msUntilMidnight);

      return timeoutId;
    };

    const timeoutId = scheduleDailyQuestion();
    return () => clearTimeout(timeoutId);
  }, [settings, profileId]);

  useEffect(() => {
    const channel = supabase
      .channel("public:follow_notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "follow_notifications" },
        (payload) => {
          const handleNotification = async () => {
            const notification = payload.new;
            console.log("payload:", payload);

            const { data: profile } = await supabase
              .from("notification_settings")
              .select("expo_push_token")
              .eq("profile_id", notification.profile_id)
              .maybeSingle();

            if (!profile?.expo_push_token) return;
            
            console.log("알림 수신:", notification.type);

            let title = "";
            let body = "";
            if (notification.type === "follow_request") {
              title = "새 팔로우 요청";
              body = "누군가 당신을 팔로우하려고 합니다.";
            } else if (notification.type === "emoji") {
              title = "새 좋아요!";
              body = "누군가 당신의 게시물을 좋아합니다.";
            }

            await sendPush(profile.expo_push_token, title, body);
          };

          handleNotification();
        }
      )
      .subscribe((status) => {
        console.log("채널 상태:", status);
      });

      return () => {
        supabase.removeChannel(channel).then(() => {}).catch(() => {});
      };
  }, []);

  
  if (!settings) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <SwitchRow
          title="오늘의 질문"
          value={settings.daily_question_enabled}
          onValueChange={(v) => updateSetting("daily_question_enabled", v)}
          disabled={loading}
        />
        <SwitchRow
          title="좋아요"
          value={settings.emoji_enabled}
          onValueChange={(v) => updateSetting("emoji_enabled", v)}
          disabled={loading}
        />
        <SwitchRow
          title="팔로우 요청"
          value={settings.follow_enabled}
          onValueChange={(v) => updateSetting("follow_enabled", v)}
          disabled={loading}
        />

        <View style={styles.reissueBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reissueTitle}>푸시 토큰 다시 등록</Text>
            <Text style={styles.reissueDesc}>알림이 오지 않을 때 다시 등록해 주세요.</Text>
          </View>
          <Pressable
            onPress={handleReissueToken}
            style={[styles.reissueBtn, reissuing && { opacity: 0.7 }]}
            disabled={reissuing}
          >
            <Text style={styles.reissueBtnText}>{reissuing ? "진행중…" : "재발급"}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}


/** 공통 스위치 */
function SwitchRow({ title, value, onValueChange, disabled }: { title: string; value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={styles.item}>
      <Text style={styles.title}>{title}</Text>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} trackColor={{ false: "#E2E8F0", true: "#5B8DEF" }} thumbColor="#fff" />
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
    borderTopColor: "#f2f2f2"
   },
  content: { paddingHorizontal: 20, paddingVertical: 5 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15,
    color: "#111",
  },
  subtitle: {
    fontFamily: "Pretendard-Regular",
    marginTop: 4,
    fontSize: 12,
    color: "#8E8E93",
    lineHeight: 16,
  },

  reissueBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  reissueTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    color: "#111",
  },
  reissueDesc: {
    fontFamily: "Pretendard-Regular",
    marginTop: 4,
    fontSize: 12,
    color: "#8E8E93",
    lineHeight: 16,
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

