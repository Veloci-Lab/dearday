// app/mypage/account.tsx

import { BackButton } from "@/components/BackButton";
import { commonHeaderOptions } from "@/styles/common";
import { deleteUserAccount, getCurrentUser, signOut } from "@/utils/api/auth";
import { deleteProfile } from "@/utils/api/profiles";
import { useAuthStore } from "@/utils/authStore";
import { Feather } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function AccountScreen() {
  const navigation = useNavigation();
  const { profileId, logOut } = useAuthStore();
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // 헤더 설정
  useEffect(() => {
    navigation.setOptions({
      ...commonHeaderOptions,
      headerTitle: "내 계정 관리",
      headerLeft: () => <BackButton />,
    });
  }, [navigation]);

  // 이메일 로드
  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (user?.email) setEmail(user.email);
      } catch (error) {
        console.error("사용자 정보 조회 실패:", error);
      }
      setLoading(false);
    })();
  }, []);

  const handleLogout = () => {
    Alert.alert("로그아웃", "로그아웃하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          await signOut();
          logOut();
          router.replace("/sign-in");
        },
      },
    ]);
  };

  const handleAccountDelete = () => {
    Alert.alert(
      "회원 탈퇴",
      "정말로 탈퇴하시겠습니까? 모든 기록이 영구적으로 삭제되며 복구할 수 없습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴하기",
          style: "destructive",
          onPress: async () => {
            try {
              // 1) 현재 로그인 사용자 uid
              console.log("[delete] profileId from store =", profileId);
              const me = await getCurrentUser();
              if (!me) {
                Alert.alert("오류", "사용자 정보를 불러오지 못했습니다.");
                return;
              }
              const uid = me.id;
              console.log("[delete] auth uid =", uid);

              // 2) profiles 소프트 삭제 (profileId가 있으면 우선 사용)
              const target = profileId ?? uid;
              await deleteProfile(target);

              // 3) Edge Function 호출 → 실제 Auth 계정 삭제
              await deleteUserAccount();

              // 4) 로그아웃 및 이동
              await signOut();
              logOut();
              router.replace("/sign-in");
            } catch (e: any) {
              console.error(e);
              Alert.alert("오류", "예상치 못한 오류가 발생했습니다.");
            }
          },
        },
      ]
    );
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.list}>

        {/* 연결된 이메일 주소 (비활성, 오른쪽 정렬) */}
        <View style={styles.row}>
          <Text style={styles.rowTitle}>연결된 이메일 주소</Text>
          <Text style={styles.rowValue}>{email || "-"}</Text>
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <Text style={styles.rowTitle}>로그아웃</Text>
          <Feather name="chevron-right" size={20} color="#C2C2C2" />
        </TouchableOpacity>

        {/* 계정 삭제 */}
        <TouchableOpacity style={styles.row} onPress={handleAccountDelete}>
          <Text style={styles.rowTitle}>계정 삭제</Text>
          <Feather name="chevron-right" size={20} color="#C2C2C2" />
        </TouchableOpacity>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 16, paddingTop: 5 },

  row: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EFEFF0",
  },
  rowTitle: { 
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15, 
    color: "#111",
  },
  rowValue: {
    fontFamily: "Pretendard-Regular",
    fontSize: 14,
    color: "#8E8E93"
  },
});
