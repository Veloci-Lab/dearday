import HomePhotoGrid from '@/components/HomePhotoGrid';
import SwipeableHome from '@/components/SwipableHome';
import { commonStyles } from '@/styles/common';
import { updateExpoPushToken } from '@/utils/api/notifications';
import { getProfile } from '@/utils/api/profiles';
import { useAuthStore } from '@/utils/authStore';
import { registerForPushNotificationsAsync } from '@/utils/registerForPushNotificationsAsync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';

const LogoIcon = () => (
  <Svg width="27" height="20" viewBox="0 0 27 20" fill="none">
    <Path
      d="M13.1147 13.1117H6.55762V19.6687H13.1147V13.1117Z"
      fill="#5B8DEF"
    />
    <Path
      d="M19.6713 12.2937H13.1143V19.6704H19.6713V12.2937Z"
      fill="#84AAF2"
    />
    <Path
      d="M26.2279 12.2937H19.6709V19.6704H26.2279V12.2937Z"
      fill="#AFC8F4"
    />
    <Path
      d="M13.1145 0C20.3571 9.62264e-05 26.2284 5.8719 26.2284 13.1145C26.2284 15.5031 25.5887 17.7421 24.4729 19.6709H19.6709V13.1145H0C6.59592e-05 5.87185 5.87179 0 13.1145 0Z"
      fill="#AFC8F4"
    />
    <Path
      d="M9.83698 3.27686C15.2689 3.27697 19.6723 7.6804 19.6725 13.1123C19.6725 15.6315 18.7245 17.9287 17.1667 19.6687H13.116V13.1134H0.00208211V13.1974C0.00184183 13.1692 0.000976568 13.1406 0.000976562 13.1123C0.00109754 7.68035 4.40501 3.27686 9.83698 3.27686Z"
      fill="#84AAF2"
    />
    <Path
      d="M13.1159 13.1128C13.1159 16.7341 10.1803 19.6697 6.55893 19.6697C2.93757 19.6697 0.00196554 16.7341 0.00195313 13.1128C0.00195297 9.49143 2.93756 6.55579 6.55893 6.55579C10.1803 6.55584 13.1159 9.49143 13.1159 13.1128Z"
      fill="#5B8DEF"
    />
  </Svg>
);

async function checkPermissions(): Promise<boolean> {
  const v = await AsyncStorage.getItem('hasRequestedPermissions');
  return v === 'true';
}

function Hairline() {
  return <View style={{ height: 1, backgroundColor: '#e0e0e0' }} />;
}

export default function HomeScreen() {
  const { profileId } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  const handleRequestPermissions = useCallback(async () => {
    if (!profileId) return;

    try {
      const token = await registerForPushNotificationsAsync();
      if (token) await updateExpoPushToken(profileId, token);
    } catch (err) {
      console.error('푸시 알림 권한/토큰 처리 실패:', err);
    }

    try {
      await AsyncStorage.setItem('hasRequestedPermissions', 'true');
    } catch (err) {
      console.error('AsyncStorage 저장 실패:', err);
    }

    setVisible(false);
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
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
      if (!profileId) return;
      (async () => {
        setLoading(true);
        try {
          const data = await getProfile(profileId);
          setProfile(data);
        } catch (error) {
          console.error('프로필 조회 실패:', error);
        } finally {
          setLoading(false);
        }
      })();
      return () => {};
    }, [profileId])
  );

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SwipeableHome>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 24,
              height: 62,
            }}
          >
            <LogoIcon />
            <Text
              style={{
                fontFamily: 'Pretendard-Bold',
                fontSize: 17,
                lineHeight: 20,
                letterSpacing: -0.03,
                textAlign: 'center',
              }}
            >
              Dearday
            </Text>
            <Image
              source={
                profile.avatar_url
                  ? { uri: profile.avatar_url }
                  : require('@/assets/images/avatar.png')
              }
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#D9D9D9',
              }}
            />
          </View>
          <Hairline />
          <View style={{ padding: 24, gap: 12 }}>
            <Text style={commonStyles.title}>홈</Text>
            <Text style={commonStyles.subtitle}>v2.0.0</Text>

            <Link href="/photo-organize-1">사진 정리하기 (소언)</Link>
            <Link href="/photo-organize-2">사진 정리하기 (하연)</Link>
            <Link href="/photo-organize-3">사진 정리하기 (서윤)</Link>
            <Link href="/photo-organize-4">사진 정리하기 (민재)</Link>
          </View>
          <Hairline />
          <View style={{ flex: 1 }}>
            <HomePhotoGrid />
          </View>
        </View>
        <Modal visible={visible} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>필요한 권한 요청이 있어요.</Text>
              <Text style={styles.modalDesc}>
                Dearday를 원활히 사용하기 위해서,{'\n'}알림 권한을 요청드릴
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 20,
    marginBottom: 8,
    color: '#0d0d0d',
  },
  modalDesc: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 16,
    color: '#000000ff',
    textAlign: 'left',
    marginBottom: 24,
  },
  confirmButton: {
    backgroundColor: '#5B8DEF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 12,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontFamily: 'Pretendard-Bold',
    color: '#fff',
    fontSize: 16,
  },
});
