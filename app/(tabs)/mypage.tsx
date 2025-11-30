import { getProfile } from "@/utils/api/profiles";
import { useAuthStore } from "@/utils/authStore";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function MypageScreen() {
  const router = useRouter();
  const { profileId } = useAuthStore();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <Text style={styles.sectionTitle}>{children}</Text>
  );

  const RowIcon = ({
    name,
    source,
  }: {
    name?: React.ComponentProps<typeof Feather>["name"];
    source?: ImageSourcePropType;
  }) => {
    if (source) {
      return <Image source={source} style={styles.rowIconImg} />;
    }
    return (
      <View style={styles.rowIconBadge}>
        <Feather name={name!} size={16} color="#5B8DEF" />
      </View>
    );
  };

  const SettingRow = ({
    icon,
    iconImg,
    label,
    onPress,
    trailing,
    isLast = false,
    showChevron = true,
  }: {
    icon?: React.ComponentProps<typeof Feather>["name"];
    iconImg?: ImageSourcePropType;
    label: string;
    onPress?: () => void;
    trailing?: React.ReactNode;
    isLast?: boolean;
    showChevron?: boolean;
  }) => (
    <Pressable onPress={onPress} style={[styles.settingRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.rowLeft}>
        <RowIcon name={icon} source={iconImg} />
        <Text style={styles.rowTitle}>{label}</Text>
      </View>
      {trailing ? trailing : showChevron && <Feather name="chevron-right" size={18} color="#929292" />}
    </Pressable>
  );

  const ICONS = {
    user: require("@/assets/images/icons/user.png"),
    bell: require("@/assets/images/icons/bell.png"),
    lock: require("@/assets/images/icons/lock.png"),
    mail: require("@/assets/images/icons/mail.png"),
    info: require("@/assets/images/icons/info.png"),
  };

  const EditCornerButton = ({ onPress }: { onPress: () => void }) => (
    <View style={styles.editAtCornerWrap} pointerEvents="box-none">
      <Pressable onPress={onPress} hitSlop={8}>
        <Image
          source={require("@/assets/images/edit_record.png")}
          style={styles.editIconImage}
        />
      </Pressable>
    </View>
  );

  useFocusEffect(
    useCallback(() => {
      if (!profileId) return;
      (async () => {
        setLoading(true);
        try {
          const data = await getProfile(profileId);
          setProfile(data);
        } catch (error) {
          console.error("프로필 조회 실패:", error);
        }
        setLoading(false);
      })();
      return () => {};
    }, [profileId])
  );

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString("ko-KR");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* 프로필 카드 */}
        <SectionTitle>프로필</SectionTitle>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Image
              source={
                profile.avatar_url
                  ? { uri: profile.avatar_url }
                  : require("@/assets/images/avatar.png")
              }
              style={styles.avatar}
            />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.nickname}>{profile.nickname}</Text>
              <Text style={styles.subText}>{joinDate} 가입</Text>
            </View>
          </View>
          <EditCornerButton onPress={() => router.push("/mypage/profile-edit")} />
        </View>

        {/* 메뉴 리스트 */}
        <SectionTitle>디어데이 설정</SectionTitle>
        <View style={styles.card2}>
          <SettingRow
            iconImg={ICONS.user}
            label="내 계정 관리"
            onPress={() => router.push("/mypage/account")}
          />
          <SettingRow
            iconImg={ICONS.bell}
            label="알림 설정"
            onPress={() => router.push("/mypage/notifications")}
          />
          <SettingRow
            iconImg={ICONS.lock}
            label="개인정보 처리 방침"
            onPress={() => router.push("/mypage/privacy-policy")}
          />
          <SettingRow
            iconImg={ICONS.mail}
            label="의견 보내기"
            onPress={() => router.push("/mypage/feedback")}
          />
          <SettingRow
            iconImg={ICONS.info}
            label="버전 정보"
            onPress={() => router.push("/mypage/version")}
            isLast
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FEFEFE" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: "relative",
    borderWidth: 1,
    borderColor: "#F2F2F2",
  },
  card2: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 2,
    marginBottom: 12,
    position: "relative",
    borderWidth: 1,
    borderColor: "#F2F2F2",
  },
  profileRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#ccc" },
  nickname: {
    fontFamily: "Pretendard-Medium",
    fontSize: 18,
    color: "#0F172A",
  },
  subText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 13,
    color: "#666",
    marginTop: 1,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: "row", alignItems: "center" },
  rowIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EFF3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  rowIconImg: {
    width: 22,
    height: 22,
    resizeMode: "contain",
    marginRight: 10,
  },
  rowTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15,
    color: "#111",
    marginLeft: 2,
    flexShrink: 1,
  },
  sectionTitle: {
    fontFamily: "Pretendard-Bold",
    fontSize: 14,
    color: "#000",
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 10,
  },
  editAtCornerWrap: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  editIconImage: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
});
