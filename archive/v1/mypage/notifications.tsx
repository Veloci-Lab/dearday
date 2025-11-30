import { useAuthStore } from "@/utils/authStore";
import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

export default function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const { profileId } = useAuthStore();

  // ✅ 두 개 알람 상태 분리
  const [shootEnabled, setShootEnabled] = useState(true); // 디어데이 알람
  const [bedtimeEnabled, setBedtimeEnabled] = useState(true); // 기록 알람
  const [loading, setLoading] = useState(true);
  const [reissuing, setReissuing] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerShadowVisible: false,
      headerTitleAlign: "center",
      headerTitle: () => (
        <View style={{ alignItems: "center" }}>
          <Text style={styles.Title}>My Dearday</Text>
          <Text style={styles.SubTitle}>알림 설정</Text>
        </View>
      ),
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          style={{ paddingHorizontal: 6, paddingVertical: 4 }}
        >
          <Feather name="chevron-left" size={24} color="#000" />
        </Pressable>
      ),
    });
  }, [navigation]);

  // ✅ 초기 로딩: 두 컬럼 불러오기
  useEffect(() => {
    if (!profileId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("is_shoot_notif_enabled, is_bedtime_notif_enabled")
        .eq("profile_id", profileId)
        .single();
      if (error) {
        console.error("알림 설정 불러오기 실패:", error.message);
        Alert.alert("오류", "알림 설정을 불러오지 못했습니다.");
      }
      setShootEnabled(data?.is_shoot_notif_enabled ?? true);
      setBedtimeEnabled(data?.is_bedtime_notif_enabled ?? true);
      setLoading(false);
    })();
  }, [profileId]);

  // ✅ 토글 핸들러: 특정 컬럼만 업데이트
  const toggleSwitch = async (
    key: "is_shoot_notif_enabled" | "is_bedtime_notif_enabled",
    value: boolean
  ) => {
    if (!profileId || loading) return;

    if (key === "is_shoot_notif_enabled") setShootEnabled(value);
    else setBedtimeEnabled(value);

    const { error } = await supabase
      .from("profiles")
      .update({ [key]: value })
      .eq("profile_id", profileId);

    if (error) {
      // 롤백
      if (key === "is_shoot_notif_enabled") setShootEnabled(!value);
      else setBedtimeEnabled(!value);
      Alert.alert("오류", "설정 저장에 실패했습니다.");
    }
  };

  // ✅ 토큰 재발급: 그대로 유지
  const handleReissueToken = async () => {
    if (!profileId) return;
    try {
      setReissuing(true);
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        Alert.alert("안내", "토큰을 발급하지 못했습니다. 권한을 확인해주세요.");
        return;
      }
      const tokenColumn =
        Platform.OS === "android"
          ? "expo_push_token_android"
          : Platform.OS === "ios"
          ? "expo_push_token_ios"
          : null;

      const updates: Record<string, any> = {};
      if (tokenColumn) updates[tokenColumn] = token;

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("profile_id", profileId);

      if (error) throw error;
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
        {/* ⬇︎ 디어데이 알람 */}
        <SwitchRow
          title="디어데이 알람"
          subtitle="사진 찍을 시간을 알려드려요."
          value={shootEnabled}
          onValueChange={(v) => toggleSwitch("is_shoot_notif_enabled", v)}
          disabled={loading}
        />

        {/* ⬇︎ 기록 알람 */}
        <SwitchRow
          title="기록 알람"
          subtitle="찍었던 사진들을 오늘 하루가 가기 전에 정리해보세요!"
          value={bedtimeEnabled}
          onValueChange={(v) => toggleSwitch("is_bedtime_notif_enabled", v)}
          disabled={loading}
        />

        {/* ⬇︎ 토큰 재발급 */}
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
  Title: {
    fontFamily: "Pretendard-Bold",
    fontSize: 18,
    color: "#5B8DEF",
  },
  SubTitle: {
    fontFamily: "Pretendard-Regular",
    fontSize: 12,
    color: "#929292",
    marginTop: -1,
  },
});
