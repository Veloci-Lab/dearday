import { commonHeaderOptions } from "@/styles/common";
import {
  getNotificationSettings,
  updateExpoPushToken,
  updateNotificationSettings,
} from "@/utils/api/notifications";
import { useAuthStore } from "@/utils/authStore";
import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync";
import { router, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { Path, Svg } from "react-native-svg";

export default function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const { profileId } = useAuthStore();

  // 디어데이 알람 상태
  const [shootEnabled, setShootEnabled] = useState(true);
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

  // 초기 로딩: 디어데이 알람 설정 불러오기
  useEffect(() => {
    if (!profileId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await getNotificationSettings(profileId);
        setShootEnabled(data?.is_shoot_notif_enabled ?? true);
      } catch (error) {
        console.error("알림 설정 불러오기 실패:", error);
        Alert.alert("오류", "알림 설정을 불러오지 못했습니다.");
      }
      setLoading(false);
    })();
  }, [profileId]);

  // 토글 핸들러
  const toggleSwitch = async (value: boolean) => {
    if (!profileId || loading) return;

    setShootEnabled(value);

    try {
      await updateNotificationSettings(profileId, value);
    } catch (error) {
      setShootEnabled(!value);
      Alert.alert("오류", "설정 저장에 실패했습니다.");
    }
  };

  // 토큰 재발급
  const handleReissueToken = async () => {
    if (!profileId) return;
    try {
      setReissuing(true);
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        Alert.alert("안내", "토큰을 발급하지 못했습니다. 권한을 확인해주세요.");
        return;
      }

      await updateExpoPushToken(profileId, token);
      Alert.alert("완료", "푸시 토큰이 다시 등록되었습니다.");
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "토큰 재발급에 실패했습니다.");
    } finally {
      setReissuing(false);
    }
  };

  // 공통 스위치 UI
  const SwitchRow = ({
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
  }) => (
    <View style={styles.item}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#E2E8F0", true: "#5B8DEF" }}
        thumbColor={"#fff"}
        ios_backgroundColor="#E2E8F0"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 디어데이 알람 */}
        <SwitchRow
          title="디어데이 알람"
          subtitle="사진 찍을 시간을 알려드려요."
          value={shootEnabled}
          onValueChange={toggleSwitch}
          disabled={loading}
        />

        {/* 토큰 재발급 */}
        <View style={styles.reissueBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reissueTitle}>푸시 토큰 다시 등록</Text>
            <Text style={styles.reissueDesc}>
              권한 변경이나 앱 재설치 후 알림이 오지 않을 때 다시 등록해 주세요.
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
