import { getProfile } from "@/utils/api/profiles";
import { useAuthStore } from "@/utils/authStore";
import { useFocusEffect } from "@react-navigation/native";
import { Tabs } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

/* ------ 아이콘 SVG 컴포넌트들 ------- */

const HomeIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M17.7221 6.72183C18.8135 7.81336 19.3592 8.35913 19.6614 9.04605C19.6847 9.09916 19.707 9.15278 19.728 9.20686C20 9.90628 20 10.6781 20 12.2217C20 15.7777 20 17.5558 18.9488 18.7027C18.8704 18.7883 18.7883 18.8704 18.7027 18.9488C17.5558 20 15.7777 20 12.2216 20H7.77835C4.22227 20 2.44423 20 1.29731 18.9488C1.21174 18.8704 1.12962 18.7883 1.05119 18.7027C0 17.5558 0 15.7777 0 12.2216C0 10.6781 0 9.90628 0.272013 9.20686C0.293045 9.15278 0.315252 9.09916 0.338617 9.04605C0.6408 8.35913 1.18651 7.81336 2.27793 6.72183L8.29126 0.707835C8.74443 0.254618 9.35909 0 10 0C10.6409 0 11.2556 0.254619 11.7087 0.707836L17.7221 6.72183Z"
      fill={color}
    />
  </Svg>
);

const SocialIcon = ({ color }: { color: string }) => (
  <Svg width={30} height={30} viewBox="0 0 30 30" fill="none">
    <Path
      d="M5 13C5 9.22876 5 7.34315 6.17157 6.17157C7.34315 5 9.22876 5 13 5H14V14H5V13Z"
      fill={color}
    />
    <Path
      d="M16 5H17C20.7712 5 22.6569 5 23.8284 6.17157C25 7.34315 25 9.22876 25 13V14H16V5Z"
      fill={color}
    />
    <Path
      d="M5 16H14V25H13C9.22876 25 7.34315 25 6.17157 23.8284C5 22.6569 5 20.7712 5 17V16Z"
      fill={color}
    />
    <Path
      d="M16 16H25V17C25 20.7712 25 22.6569 23.8284 23.8284C22.6569 25 20.7712 25 17 25H16V16Z"
      fill={color}
    />
  </Svg>
);

/* ------ Reanimated 탭 버튼 (라벨 애니메이션 제거) ------- */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TabButton({
  focused,
  onPress,
  children,
  label,
  labelColor,
}: {
  focused: boolean;
  onPress: () => void;
  children: React.ReactNode;
  label: string;
  labelColor: string;
}) {
  // press-in/out용
  const pressScale = useSharedValue(1);
  // focused 변화용
  const focusedScale = useSharedValue(focused ? 1.12 : 1);

  useEffect(() => {
    // 포커스 상태에 따른 스케일 업/복귀
    focusedScale.value = withSpring(focused ? 1.12 : 1, {
      damping: 14,
      stiffness: 220,
      mass: 0.6,
    });
  }, [focused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: focusedScale.value * pressScale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        // press-in: 짧게 scale down
        pressScale.value = withTiming(0.94, { duration: 90 });
      }}
      onPressOut={() => {
        // press-out: spring(bounce) 복귀
        pressScale.value = withSpring(1, { damping: 12, stiffness: 260 });
      }}
      style={styles.tab}
    >
      <Animated.View style={[styles.iconWrapper, iconStyle]}>
        {children}
      </Animated.View>

      {/* 라벨 애니메이션 없음: 정적 렌더링 (색상만 변경) */}
      <Text style={[styles.tabLabel, { color: labelColor }]}>{label}</Text>
    </AnimatedPressable>
  );
}

/* ------ 커스텀 탭바 ------- */
function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profileId } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);

  const current = state.routes[state.index]?.name;
  const safeBottom = Math.max(insets.bottom, 8);
  const go = (name: string) => navigation.navigate(name as never);

  const ACTIVE = "#5B8DEF";
  const INACTIVE = "#C3C3C3";

  useFocusEffect(
    useCallback(() => {
      if (!profileId) return;

      (async () => {
        try {
          const data = await getProfile(profileId);
          setProfile(data);
        } catch (error) {
          console.error("프로필 조회 실패:", error);
        }
      })();

      return () => {};
    }, [profileId])
  );

  const TABS = [
    { name: "home", label: "홈", type: "home" },
    { name: "social", label: "소셜", type: "social" },
    { name: "mypage", label: "마이", type: "profile" },
  ];

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.tabBar, { bottom: safeBottom + 10 }]}>
        {TABS.map((t) => {
          const focused = current === t.name;
          const iconColor = focused ? ACTIVE : INACTIVE;
          const labelColor = focused ? ACTIVE : INACTIVE;

          return (
            <TabButton
              key={t.name}
              focused={focused}
              onPress={() => go(t.name)}
              label={t.label}
              labelColor={labelColor}
            >
              {t.type === "home" && <HomeIcon color={iconColor} />}
              {t.type === "social" && <SocialIcon color={iconColor} />}
              {t.type === "profile" && (
                <View
                  style={[
                    styles.profileWrapper,
                    focused && styles.profileWrapperActive,
                  ]}
                >
                  <Image
                    source={
                      profile?.avatar_url
                        ? { uri: profile.avatar_url }
                        : require("@/assets/images/avatar.png")
                    }
                    style={styles.profileImage}
                  />
                </View>
              )}
            </TabButton>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="social" />
        <Tabs.Screen name="mypage" />
      </Tabs>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "#FEFEFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 90,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  tabLabel: {
    fontFamily: "Pretendard",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
    letterSpacing: -0.36,
    alignSelf: "stretch",
  },
  profileWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#C3C3C3",
  },
  profileWrapperActive: {
    borderColor: "#5B8DEF",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
});
