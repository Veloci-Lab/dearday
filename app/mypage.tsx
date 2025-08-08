import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function MypageScreen() {
  const { profileId } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("profile_id", profileId)
        .single();

      if (error) {
        console.error("❌ 프로필 조회 실패:", error.message);
        return;
      }

      setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, [profileId]);

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#5B8DEF" />
      </SafeAreaView>
    );
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString("ko-KR");
  const sleepStart = profile.sleep_start ? profile.sleep_start : null;
  const sleepEnd = profile.sleep_end ? profile.sleep_end : null;
  const workStart = profile.work_start ? profile.work_start : null;
  const workEnd = profile.work_end ? profile.work_end : null;


  return (
    <SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* 로고 */}
        <Text style={styles.logo}>🟦Dearday</Text>

        {/* 프로필 카드 */}
        <View style={styles.card}>
          {/* ✏️ 우측 상단 아이콘 */}
          <Pressable
            onPress={() => router.push("/edit-profile")}
            style={styles.editIcon}
          >
            <Text style={{ fontSize: 18 }}>✏️</Text>
          </Pressable>

          <View style={styles.profileRow}>
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatar}
            />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.nickname}>{profile.nickname}</Text>
              <Text style={styles.subText}>{joinDate} 가입</Text>
            </View>
          </View>
        </View>

        {/* 설정한 시간 카드 */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>내가 설정한 시간</Text>

            {/* ✏️ 상단 우측 */}
            <Pressable
                onPress={() => router.push("/edit-time")}
                style={styles.editIcon}
            >
                <Text style={{ fontSize: 18 }}>✏️</Text>
            </Pressable>

            <View style={styles.timeRow}>
                <View style={styles.dot} />
                <Text style={styles.fixedLabel}>수면시간</Text>
                <Text style={styles.value}>
                    {sleepStart && sleepEnd ? `${sleepStart} - ${sleepEnd}` : "설정 안함"}
                </Text>
            </View>

            <View style={styles.timeRow}>
                <View style={styles.dot} />
                <Text style={styles.fixedLabel}>그 외 시간</Text>
                <Text style={styles.value}>
                    {workStart && workEnd ? `${workStart} - ${workEnd}` : "설정 안함"}
                </Text>
            </View>
        </View>

        {/* 메뉴 리스트 */}
        <View style={styles.card}>
          {[
            { label: "내 계정 관리", path: "/account" },
            { label: "알림 설정", path: "/notification-settings" },
            { label: "개인정보 처리 방침", path: "/privacy-policy" },
            { label: "의견 보내기", path: "/feedback" },
            { label: "버전 정보", path: "/version" },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.path)}
              style={styles.listItem}
            >
              <Text>{item.label}</Text>
              <Text style={{ fontSize: 16 }}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5B8DEF",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ccc",
  },
  nickname: {
    fontSize: 16,
    fontWeight: "bold",
  },
  subText: {
    fontSize: 12,
    color: "#666",
  },
  editIcon: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  fixedLabel: {
    width: 80,
    color: "#666",
    fontSize: 14,
    marginRight: 8,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#DDD",
    marginRight: 8,
  },
});
