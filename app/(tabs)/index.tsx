import { commonStyles } from "@/styles/common";
import { updateExpoPushToken } from "@/utils/api/notifications";
import { useAuthStore } from "@/utils/authStore";
import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SwipeableHome from "@/components/SwipableHome";

async function checkPermissions(): Promise<boolean> {
  const v = await AsyncStorage.getItem("hasRequestedPermissions");
  return v === "true";
}

export default function HomeScreen() {
  const { profileId } = useAuthStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let mounted = true;

    (async () => {
      const alreadyRequested = await checkPermissions();
      if (mounted && !alreadyRequested) setVisible(true);
    })();

    return () => {
      mounted = false;
    };
  }, [profileId]);

  useFocusEffect(
    useCallback(() => {
      // 화면에 돌아올 때마다 실행
      return () => {
        // 화면을 떠날 때 정리 작업
      };
    }, [])
  );

  const handleRequestPermissions = useCallback(async () => {
    if (!profileId) return;

    try {
      const token = await registerForPushNotificationsAsync();
      if (token) await updateExpoPushToken(profileId, token);
    } catch (err) {
      console.error("푸시 알림 권한/토큰 처리 실패:", err);
    }

    try {
      await AsyncStorage.setItem("hasRequestedPermissions", "true");
    } catch (err) {
      console.error("AsyncStorage 저장 실패:", err);
    }

    setVisible(false);
  }, [profileId]);

  return (
    <SwipeableHome>
      <SafeAreaView style={commonStyles.container}>
        <View style={commonStyles.content}>
          <Text style={commonStyles.title}>홈</Text>
          <Text style={commonStyles.subtitle}>v2.0.0</Text>

          <Link href="/photo-organize-1">사진 정리하기 (소언)</Link>
          <Link href="/photo-organize-2">사진 정리하기 (하연)</Link>
          <Link href="/photo-organize-3">사진 정리하기 (서윤)</Link>
          <Link href="/photo-organize-4">사진 정리하기 (민재)</Link>
        </View>

        <Modal visible={visible} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>필요한 권한 요청이 있어요.</Text>
              <Text style={styles.modalDesc}>
                Dearday를 원활히 사용하기 위해서,{"\n"}알림 권한을 요청드릴
                예정이에요.
              </Text>

              <Pressable
                style={styles.confirmButton}
                onPress={handleRequestPermissions}
              >
                <Text style={styles.confirmText}>확인했어요</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SwipeableHome>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontFamily: "Pretendard-Bold",
    fontSize: 20,
    marginBottom: 8,
    color: "#0d0d0d",
  },
  modalDesc: {
    fontFamily: "Pretendard-Regular",
    fontSize: 16,
    color: "#000000ff",
    textAlign: "left",
    marginBottom: 24,
  },
  confirmButton: {
    backgroundColor: "#5B8DEF",
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 12,
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    fontFamily: "Pretendard-Bold",
    color: "#fff",
    fontSize: 16,
  },
});
