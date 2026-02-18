import { commonStyles } from "@/styles/common";
import { useAuthStore } from "@/utils/authStore";
import { useOnboardingStore } from "@/utils/onboardingStore";
import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CheckIcon } from "@/components/icons/CheckIcon";
import { FriendsIcon } from "@/components/icons/FriendsIcon";
import { GlobeIcon } from "@/components/icons/GlobeIcon";

type VisibilityOption = "public" | "friends" | "private";
const AVATAR_BUCKET = "avatars";

interface OptionItem {
  key: VisibilityOption;
  IconComponent: React.ComponentType<{ size?: number; color?: string }>; // 추가
  title: string;
  description: string;
}

const OPTIONS: OptionItem[] = [
  {
    key: "public",
    IconComponent: GlobeIcon,
    title: "전체 공개",
    description: "누구나 내 피드를 보고 팔로우할 수 있어요.",
  },
  {
    key: "friends",
    IconComponent: FriendsIcon,
    title: "친구 공개",
    description: "내가 설정한 친구들만 볼 수 있어요.",
  },
  // {
  //   key: "private",
  //   icon: "lock-closed-outline",
  //   title: "비공개",
  //   description: "오직 나만 볼 수 있어요.",
  // },
];

export default function OnboardingPrivacyScreen() {
  const { setProfileId, setHasCompletedOnboarding } = useAuthStore();
  const { nickname, avatarUri, reset: resetOnboarding } = useOnboardingStore();
  const router = useRouter();

  const [selected, setSelected] = useState<VisibilityOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const handleComplete = () => {
    if (!selected) return;
    setShowPermissionModal(true);
  };

  const handleConfirmPermissions = async () => {
    if (!selected) return;

    setLoading(true);
    try {
      // 1. 알림 권한 + expo push token
      const expoPushToken = await registerForPushNotificationsAsync();

      // 2. 사진 권한
      await ImagePicker.requestMediaLibraryPermissionsAsync();

      // 3. 현재 로그인된 유저 정보
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인 정보를 찾을 수 없습니다.");

      // 4. avatarUri가 있으면 Supabase Storage에 업로드
      let avatarUrl: string | null = null;
    
      if (avatarUri) {
        const manip = await ImageManipulator.manipulateAsync(
        avatarUri,
        [{ resize: { width: 320, height: 320 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
      );

      const base64 = await FileSystem.readAsStringAsync(manip.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binary =
        typeof atob !== "undefined"
          ? atob(base64)
          : Buffer.from(base64, "base64").toString("binary");

      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const fileName = `avatar_${user.id}_${Date.now()}.jpg`;

      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(fileName, bytes.buffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (upErr) throw upErr;

      const { data } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(fileName);

      avatarUrl = data.publicUrl;
      console.log("avatarUrl:", avatarUrl);
      }

      // 5. profiles 테이블에 INSERT
      const { data: profile, error } = await supabase
        .from("profiles")
        .update({
          nickname,
          avatar_url: avatarUrl,
          is_public: selected === "public",
          has_completed_onboarding: true,
        })
        .eq("uid", user.id)
        .select("profile_id")
        .single();

      if (error) throw error;

      // 6. notification_settings 테이블에 INSERT
      const { error: notifError } = await supabase
        .from("notification_settings")
        .insert({
          profile_id: profile.profile_id,
          expo_push_token: expoPushToken ?? null,
        });

      if (notifError) throw notifError;

      // 7. authStore 업데이트 + 임시 데이터 정리
      setProfileId(profile.profile_id);
      setHasCompletedOnboarding(true);
      resetOnboarding();

      setShowPermissionModal(false);
      router.replace("/(tabs)");
    } catch (error) {
      console.error("온보딩 완료 실패:", error);
      Alert.alert("오류", "설정 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const isCompleteDisabled = !selected || loading;

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.content}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: "100%" }]} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>
            멋진 프로필을 설정하셨네요.{"\n"}프로필의 공개 범위를 설정해주세요
          </Text>
          <Text style={styles.subtitle}>설정에서 언제든지 변경할 수 있어요.</Text>
        </View>

        <View style={styles.optionList}>
          {OPTIONS.map((option) => {
            const isSelected = selected === option.key;
            const IconComponent = option.IconComponent;

            return (
              <Pressable
                key={option.key}
                onPress={() => setSelected(option.key)}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected,
                  ]}
                >
                  {isSelected && (
                    <CheckIcon size={16} color="#FFFFFF" />
                  )}
                </View>

                <View style={[styles.optionIcon /*, isSelected && styles.optionIconSelected*/]}>
                  <IconComponent/>
                </View>

                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle /*, isSelected && styles.optionTitleSelected*/]}>
                    {option.title}
                  </Text>
                  <Text style={styles.optionDesc}>{option.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={handleComplete}
          disabled={isCompleteDisabled}
          style={[
            styles.completeBtn,
            isCompleteDisabled && styles.completeBtnDisabled,
          ]}
        >
          <Text
            style={[
              styles.completeBtnText,
              isCompleteDisabled && { color: "#A3AAB8" },
            ]}
          >
            완료
          </Text>
        </Pressable>
      </View>

      {/* 권한 요청 바텀시트 모달 */}
      <Modal
        visible={showPermissionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPermissionModal(false)}
        >
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>필요한 권한 요청이 있어요.</Text>
            <Text style={styles.modalDesc}>
              Dearday를 원활히 사용하기 위해서,{"\n"}다음 권한을 요청드릴 예정이에요.
            </Text>

            <View style={styles.permissionRow}>
              <View style={styles.permissionIcon}>
                <Ionicons name="notifications-outline" size={22} color="#64748B" />
              </View>
              <View style={styles.permissionText}>
                <Text style={styles.permissionTitle}>알람</Text>
                <Text style={styles.permissionDesc}>~를 위해서 필요해요</Text>
              </View>
            </View>

            <View style={styles.permissionRow}>
              <View style={styles.permissionIcon}>
                <Ionicons name="image-outline" size={22} color="#64748B" />
              </View>
              <View style={styles.permissionText}>
                <Text style={styles.permissionTitle}>사진</Text>
                <Text style={styles.permissionDesc}>~를 위해서 필요해요</Text>
              </View>
            </View>

            <Pressable
              onPress={handleConfirmPermissions}
              disabled={loading}
              style={styles.confirmBtn}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>확인했어요</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 21,
    paddingTop: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    marginBottom: 32,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#5B8DEF",
    borderRadius: 2,
  },
  header: {
    marginBottom: 36,
  },
  title: {
    fontFamily: "Pretendard-Bold",
    fontSize: 20,
    lineHeight: 28,
    fontStyle: "normal",
    fontWeight: 700,
    color: "#0F172A",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Pretendard-Regular",
    fontSize: 14,
    color: "#929292",
  },
  optionList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 19,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#F2F2F2",
  },
  optionCardSelected: {
    // borderColor: "#5B8DEF",
    backgroundColor: "#F0F5FF",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 17,
  },
  checkboxSelected: {
    backgroundColor: "#5B8DEF",
    borderColor: "#5B8DEF",
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  // optionIconSelected: {
  //   backgroundColor: "#DBEAFE",
  // },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    fontStyle: "normal",
    fontWeight: 600,
    lineHeight: 18.9, /* 18.9px */
    letterSpacing: -0.42,
  },
  // optionTitleSelected: {
  //   color: "#1E40AF",
  // },
  optionDesc: {
    fontFamily: "Pretendard-Regular",
    fontSize: 13,
    color: "#626262",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  completeBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: "#5B8DEF",
    alignItems: "center",
    justifyContent: "center",
  },
  completeBtnDisabled: {
    backgroundColor: "#F2F2F2",
  },
  completeBtnText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 17,
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 34,
  },
  modalTitle: {
    fontFamily: "Pretendard-Bold",
    fontSize: 20,
    lineHeight: 28,
    color: "#0F172A",
    marginBottom: 8,
  },
  modalDesc: {
    fontFamily: "Pretendard-Regular",
    fontSize: 17,
    color: "#929292",
    lineHeight: 20,
    marginBottom: 28,
    letterSpacing: -0.51,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  permissionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 17,
    color: "#0F172A",
    letterSpacing: -0.51,
    marginBottom: 2,
  },
  permissionDesc: {
    fontFamily: "Pretendard-Regular",
    fontSize: 15,
    color: "#929292",
    letterSpacing: -0.51,
  },
  confirmBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: "#5B8DEF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  confirmBtnText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: -0.51,
    color: "#FFFFFF",
  },
});