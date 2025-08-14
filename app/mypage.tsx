// import { useAuthStore } from "@/utils/authStore";
// import { supabase } from "@/utils/supabase";
// import { Feather } from "@expo/vector-icons";
// import { useNavigation, useRouter } from "expo-router";
// import { useEffect, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   Image,
//   Pressable,
//   SafeAreaView,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";

// export default function MypageScreen() {
//   const navigation = useNavigation();
//   const router = useRouter();
//   const { profileId, logOut } = useAuthStore(); // logOut 함수 가져오기

//   const [profile, setProfile] = useState<any>(null);
//   const [loading, setLoading] = useState(true);

//   // 헤더 설정 (기존과 동일)
//   useEffect(() => {
//     navigation.setOptions({
//       headerLeft: () => (
//         <Pressable style={{ flexDirection: "row", alignItems: "center" }} onPress={() => router.back()}>
//           <Feather name="chevron-left" size={24} color="black" />
//         </Pressable>
//       ),
//       headerTitle: "마이페이지", // 타이틀 추가
//     });
//   }, [navigation, router]);

//   // 프로필 정보 로드 (기존과 동일)
//   useEffect(() => {
//     if (!profileId) return;
//     const fetchProfile = async () => {
//       setLoading(true);
//       const { data, error } = await supabase.from("profiles").select("*").eq("profile_id", profileId).single();
//       if (error) {
//         console.error("❌ 프로필 조회 실패:", error.message);
//         Alert.alert("오류", "프로필 정보를 불러오는 데 실패했습니다.");
//       } else {
//         setProfile(data);
//       }
//       setLoading(false);
//     };
//     fetchProfile();
//   }, [profileId]);

//   // 로그아웃 핸들러
//   const handleLogout = async () => {
//     Alert.alert("로그아웃", "정말 로그아웃 하시겠어요?", [
//       { text: "취소", style: "cancel" },
//       {
//         text: "확인",
//         onPress: async () => {
//           const { error } = await supabase.auth.signOut();
//           if (error) {
//             Alert.alert("오류", "로그아웃 중 문제가 발생했습니다.");
//           } else {
//             logOut(); // Zustand 스토어 상태 업데이트
//             router.replace("/sign-in"); // 로그인 화면으로 이동
//           }
//         },
//       },
//     ]);
//   };

//   if (loading || !profile) {
//     return (
//       <SafeAreaView style={styles.center}>
//         <ActivityIndicator size="large" color="#5B8DEF" />
//       </SafeAreaView>
//     );
//   }

//   const joinDate = new Date(profile.created_at).toLocaleDateString("ko-KR");

//   return (
//     <SafeAreaView style={styles.container}>
//       <ScrollView contentContainerStyle={{ padding: 16 }}>
//         {/* 프로필 카드 */}
//         <View style={styles.card}>
//           <View style={styles.profileRow}>
//             <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
//             <View style={{ marginLeft: 12 }}>
//               <Text style={styles.nickname}>{profile.nickname}</Text>
//               <Text style={styles.subText}>{joinDate} 가입</Text>
//             </View>
//           </View>
//         </View>

//         {/* 메뉴 리스트 */}
//         <View style={styles.card}>
//           {[
//             { label: "계정 관리", path: "/mypage/account" },
//             { label: "수면 시간 변경", path: "/mypage/edit-time" },
//             { label: "알림 설정", path: "/mypage/notifications" },
//           ].map((item) => (
//             <Pressable key={item.label} onPress={() => router.push(item.path)} style={styles.listItem}>
//               <Text style={styles.listLabel}>{item.label}</Text>
//               <Feather name="chevron-right" size={18} color="#929292" />
//             </Pressable>
//           ))}
//         </View>

//         <View style={styles.card}>
//           {[
//             { label: "개인정보 처리 방침", path: "/mypage/privacy-policy" },
//             { label: "의견 보내기", path: "/mypage/feedback" },
//           ].map((item) => (
//             <Pressable key={item.label} onPress={() => router.push(item.path)} style={styles.listItem}>
//               <Text style={styles.listLabel}>{item.label}</Text>
//               <Feather name="chevron-right" size={18} color="#929292" />
//             </Pressable>
//           ))}
//         </View>
        
//         {/* 로그아웃 버튼 */}
//         <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
//           <Text style={styles.logoutText}>로그아웃</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// // 스타일 시트
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#F3F5F7" },
//   center: { flex: 1, justifyContent: "center", alignItems: "center" },
//   card: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     marginBottom: 12,
//     shadowColor: "#000",
//     shadowOpacity: 0.04,
//     shadowOffset: { width: 0, height: 1 },
//     shadowRadius: 10,
//     elevation: 1,
//   },
//   profileRow: { flexDirection: "row", alignItems: "center", paddingVertical: 20 },
//   avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#ccc" },
//   nickname: { fontSize: 18, fontWeight: "bold", color: "#0F172A" },
//   subText: { fontSize: 13, color: "#666", marginTop: 4 },
//   listItem: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingVertical: 18,
//     borderBottomColor: "#F2F2F2",
//     borderBottomWidth: 1,
//   },
//   listLabel: { fontSize: 16, color: "#333" },
//   logoutButton: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 16,
//     marginTop: 8,
//     alignItems: "center",
//   },
//   logoutText: { fontSize: 16, color: "#FF5A5A" },
// });

import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function MypageScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { profileId, logOut } = useAuthStore();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 헤더 설정
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable style={{ flexDirection: "row", alignItems: "center" }} onPress={() => router.back()}>
          <Feather name="chevron-left" size={24} color="black" />
        </Pressable>
      ),
      headerTitle: "마이페이지",
    });
  }, [navigation, router]);

    useFocusEffect(
      useCallback(() => {
        if (!profileId) return;

        const fetchProfile = async () => {
          setLoading(true);
          const { data, error } = await supabase.from("profiles").select("*, sleep_time").eq("profile_id", profileId).single();
          if (error) console.error("❌ 프로필 조회 실패:", error.message);
          else setProfile(data);
          setLoading(false);
        };

        fetchProfile();

        // 화면을 벗어날 때 정리할 작업이 있다면 여기에 return 함수를 추가
        return () => {};
      }, [profileId])
    );

  // 로그아웃 핸들러
  const handleLogout = async () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "확인",
        onPress: async () => {
          await supabase.auth.signOut();
          await GoogleSignin.signOut(); // 구글 로그인 세션 종료
          Alert.alert("로그아웃", "성공적으로 로그아웃되었습니다.");
          logOut();
          router.replace("/sign-in");
        },
      },
    ]);
  };

  if (loading || !profile) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" /></SafeAreaView>;
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString("ko-KR");
  const sleepTime = profile.sleep_time ? profile.sleep_time.slice(0, 5) : "설정 안함";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* 프로필 카드 */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.nickname}>{profile.nickname}</Text>
              <Text style={styles.subText}>{joinDate} 가입</Text>
            </View>
          </View>
        </View>

        {/* 내가 설정한 시간 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>내가 설정한 시간</Text>
          <Pressable onPress={() => router.push("/mypage/edit-time")} style={styles.editIcon}>
            <Text style={{ fontSize: 18 }}>✏️</Text>
          </Pressable>
          <View style={styles.timeRow}>
            <View style={styles.dot} />
            <Text style={styles.fixedLabel}>수면 시간</Text>
            <Text style={styles.value}>{sleepTime}</Text>
          </View>
        </View>

        {/* 메뉴 리스트 */}
        <View style={styles.card}>
          {[
            { label: "계정 관리", path: "/mypage/account" },
            { label: "알림 설정", path: "/mypage/notifications" },
            { label: "개인정보 처리 방침", path: "/mypage/privacy-policy" },
            { label: "의견 보내기", path: "/mypage/feedback" },
            { label: "버전 정보", path: "/mypage/version" }, // '버전 정보' 항목 복원
          ].map((item) => (
            <Pressable key={item.label} onPress={() => router.push(item.path)} style={styles.listItem}>
              <Text style={styles.listLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={18} color="#929292" />
            </Pressable>
          ))}
        </View>
        
        {/* 로그아웃 버튼 */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// 스타일
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F5F7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  profileRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#ccc" },
  nickname: { fontSize: 18, fontWeight: "bold", color: "#0F172A" },
  subText: { fontSize: 13, color: "#666", marginTop: 4 },
  cardTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 16 },
  editIcon: { position: "absolute", right: 16, top: 16 },
  timeRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DDD", marginRight: 8 },
  fixedLabel: { width: 70, color: "#666", fontSize: 15 },
  value: { fontSize: 15, fontWeight: "600", color: "#000" },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomColor: "#F2F2F2",
    borderBottomWidth: 1,
    "&:last-child": {
        borderBottomWidth: 0,
    }
  },
  listLabel: { fontSize: 16, color: "#333" },
  logoutButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  logoutText: { fontSize: 16, color: "#FF5A5A" },
});