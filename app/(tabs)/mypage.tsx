import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
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

/** 우상단 편집 버튼과 겹치지 않도록 카드 오른쪽 여백 계산 */
const EDIT_SIZE = 28;
const EDIT_RIGHT = 16;
const EDIT_SAFE = 8;
const CARD_RIGHT_PADDING = EDIT_SIZE + EDIT_RIGHT + EDIT_SAFE; // 52

export default function MypageScreen() {
  const navigation = useNavigation();
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
    // PNG 아이콘: 배경 없이 평평하게
    if (source) {
      return <Image source={source} style={styles.rowIconImg} />;
    }
    // Feather 아이콘: 기존처럼 동그란 배지 배경
    return (
      <View style={styles.rowIconBadge}>
        <Feather name={name!} size={16} color="#5B8DEF" />
      </View>
    );
  };

  // ↓ SettingRow도 PNG를 받도록 iconImg 옵션 추가
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
    moon: require("@/assets/images/icons/moon.png"),
  };

  // const EditCornerButton = ({ onPress }: { onPress: () => void }) => (
  //   // 카드 오른쪽에 세로로 꽉 차게 붙여 중앙 정렬 → 텍스트와 높낮이 일치
  //   <View style={styles.editAtCornerWrap} pointerEvents="box-none">
  //     <Pressable onPress={onPress} style={styles.editBadge} hitSlop={8}>
  //       <Feather name="edit-2" size={16} color="#5B8DEF" />
  //     </Pressable>
  //   </View>
  // );
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

  // 프로필 불러오기
  useFocusEffect(
    useCallback(() => {
      if (!profileId) return;
      (async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("*, sleep_time")
          .eq("profile_id", profileId)
          .single();
        if (!error) setProfile(data);
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
  const sleepTime = profile.sleep_time ? profile.sleep_time.slice(0, 5) : "설정 안함";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* 프로필 카드 */}
        <SectionTitle>프로필</SectionTitle>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            {/* <Image source={{ uri: profile.avatar_url }} style={styles.avatar} /> */}
            <View>
              {/* style={{ marginLeft: 12 }} */}
              <Text style={styles.nickname}>{profile.nickname}</Text>
              <Text style={styles.subText}>{joinDate} 가입</Text>
            </View>
          </View>
          <EditCornerButton onPress={() => router.push("/mypage/profile-edit")} />
        </View>

        {/* 내가 설정한 시간 카드 */}
        <SectionTitle>내가 설정한 시간</SectionTitle>
        <View style={[styles.card, styles.cardHasEdit]}>
          <EditCornerButton onPress={() => router.push("/mypage/edit-time")} />
          <View style={styles.timeRow}>
            <View style={styles.rowLeft}>
              <RowIcon source={ICONS.moon} />
              <Text style={styles.rowTitle}>하루 기록 시간</Text>
            </View>
            <Text style={styles.timeValue}>{sleepTime}</Text>
          </View>
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

// 스타일
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F5F7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  /* 카드 공통 */
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 10,
    elevation: 1,
  },

  card2: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 2,
    marginBottom: 12,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 10,
    elevation: 1,
  },

  /* 프로필 카드 */
  profileRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#ccc" },
  nickname: { 
    fontFamily: "Pretendard-Medium",
    fontSize: 18, 
    //fontWeight: "bold", 
    color: "#0F172A" 
  },
  subText: { 
    fontFamily: "Pretendard-Regular",
    fontSize: 13, 
    color: "#666", 
    marginTop: 1
  },
  editIcon: { position: "absolute", right: 16, top: 16 },

  /* 행(아이콘 + 라벨) 공통 */
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  rowLeft: { flexDirection: "row", alignItems: "center" },

  rowIconBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#EFF3FF",
    alignItems: "center", justifyContent: "center",
    marginRight: 10,
  },

  rowIconImg: {
    width: 22, height: 22,
    resizeMode: "contain",
    marginRight: 10,
  },

  rowTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15, 
    color: "#111", 
    //fontWeight: "700",
    marginLeft: 2, 
    flexShrink: 1,
  },

  /* '내가 설정한 시간' 행 */
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeValue: { 
    fontFamily: "Pretendard-Regular",
    fontSize: 16, 
    color: "#111", 
    //fontWeight: "700" 
  },

  /* 섹션 부제 */
  sectionTitle: {
    fontFamily: "Pretendard-Bold",
    fontSize: 14, color: "#000",
    //fontWeight: "700",
    marginTop: 12, marginBottom: 8, marginLeft: 10,
  },

  cardHasEdit: {
    paddingRight: 56, // 아이콘(28) + 여백(16~20) 만큼 공간 비워두기
  },

  editAtCornerWrap: { 
    position: "absolute", 
    right: 16, 
    top: 0, 
    bottom: 0, 
    justifyContent: "center" 
  },

  // 아이콘 배지 스타일
  editBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#EFF3FF",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#E6ECFF",
  },

  editIconImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});