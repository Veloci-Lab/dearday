// app/mypage/account.tsx

import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
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

  // 헤더 (제목 + 부제)
  useEffect(() => {
    navigation.setOptions({
      headerTitleAlign: "center",
      headerTitle: () => (
        <View style={{ alignItems: "center" }}>
          <Text style={ styles.Title }>My Dearday</Text>
          <Text style={ styles.SubTitle }>내 계정 관리</Text>
        </View>
      ),
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
          <Feather name="chevron-left" size={24} color="#000" />
        </Pressable>
      ),
    });
  }, [navigation]);

  // 이메일 로드
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user?.email) setEmail(data.user.email);
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
          await supabase.auth.signOut();
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
              const { data: me, error: meErr } = await supabase.auth.getUser();
              if (meErr || !me?.user) {
                Alert.alert("오류", "사용자 정보를 불러오지 못했습니다.");
                return;
              }
              const uid = me.user.id;
              console.log("[delete] auth uid =", uid);

              // 2) profiles 소프트 삭제 (profileId가 있으면 우선 사용)
              const target = profileId ?? uid;
              const { error: updateErr } = await supabase
                .from("profiles")
                .update({ is_deleted: true, nickname: null }) // is_deleted 플래그와 nickname 초기화
                .eq("profile_id", target); // 스키마에 맞춰 필요 시 컬럼명 변경
                
              if (updateErr) {
                console.error("[delete] profiles.update error:", updateErr);
                Alert.alert("오류", "프로필 삭제 중 문제가 발생했습니다.\n" + updateErr.message);
                return;
              }

              // 3) Edge Function 호출 → 실제 Auth 계정 삭제
              const { error: fnErr } = await supabase.functions.invoke("delete-user", {
                method: "POST",
              });
              if (fnErr) {
                Alert.alert("오류", "계정 삭제 중 문제가 발생했습니다.");
                return;
              }

              // 4) 로그아웃 및 이동
              await supabase.auth.signOut();
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
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 16, paddingTop: 8 },

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
    //fontWeight: "600" 
  },
  rowValue: { 
    fontFamily: "Pretendard-Regular",
    fontSize: 14, 
    color: "#8E8E93" 
  },
  Title: { 
    fontFamily: "Pretendard-Bold",
    fontSize: 18, 
    //fontWeight: "700", 
    color: "#5B8DEF" },
  SubTitle: { 
    fontFamily: "Pretendard-Regular",
    fontSize: 12, 
    color: "#929292", 
    marginTop: -1 }
});
