// app/(tabs)/_layout.tsx

import Feather from "@expo/vector-icons/Feather";
import { Tabs, router } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const InboxButton = ({ color = "#000" }: { color?: string }) => (
  <Pressable onPress={() => router.push("/pending")} style={{ padding: 6, marginRight: 0 }}>
    <Feather name="inbox" size={25} color={color} />
  </Pressable>
);

const BUTTON_PLACEHOLDER_WIDTH = 37; // InboxButton의 대략적인 너비 (아이콘 25 + 패딩 12)

/* ------ 커스텀 탭바 (수정 없음) ------- */
function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  const PILL_HEIGHT = 67;
  const PILL_RADIUS = 100;
  const INNER_MARGIN = 20;
  const FAB_SIZE = 67;
  const pillWidth = 263;
  const safeBottom = Math.max(insets.bottom, 8);
  const PILL_LEFT = INNER_MARGIN;
  const FAB_RIGHT = INNER_MARGIN;
  const go = (name: string) => navigation.navigate(name as never);
  const ACTIVE = "#5B8DEF";
  const INACTIVE = "#C2C2C2";
  const TABS = [
    { name: "index", label: "홈", imgActive: require("@/assets/images/logo_blue.png"), imgInactive: require("@/assets/images/logo_gray.png") },
    { name: "calendar", label: "월간", imgActive: require("@/assets/images/tab_calendar.png"), imgInactive: require("@/assets/images/tab_calendar_gray.png") },
    { name: "mypage", label: "마이", imgActive: require("@/assets/images/tab_user.png"), imgInactive: require("@/assets/images/tab_user_gray.png") },
  ];
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[ styles.pill, { bottom: safeBottom + 10, left: PILL_LEFT, width: pillWidth, height: PILL_HEIGHT, borderRadius: PILL_RADIUS } ]} >
        {TABS.map((t) => {
          const focused = current === t.name;
          const labelColor = focused ? ACTIVE : INACTIVE;
          const imgSrc = focused ? t.imgActive : t.imgInactive;
          return (
            <Pressable key={t.name} onPress={() => go(t.name)} style={styles.tab}>
              <Image source={imgSrc} style={{ width: 30, height: 30, resizeMode: "contain" }} />
              <Text style={[styles.tabLabel, { color: labelColor }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={() => router.push("/camera")} style={[ styles.fab, { right: FAB_RIGHT, bottom: safeBottom + 10, width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2 }]} >
        <Image source={require("@/assets/images/camera.png")} style={{ width: 35, height: 35, resizeMode: "contain" }} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const LOGO_AR = 253 / 53;
  const LOGO_H = 32;
  const LOGO_W = Math.round(LOGO_H * LOGO_AR);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarStyle: { display: "none" },
        headerShadowVisible: false,
        headerStyle: { borderBottomWidth: 2, borderBottomColor: '#f2f2f2' },
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitleAlign: "center",
          headerTitle: () => (
            <View style={{ opacity: 0 }}>
              <Text style={styles.Title}>Title</Text>
              <Text style={styles.SubTitle}>Subtitle</Text>
            </View>
          ),
          headerLeft: () => (
            <Image
              source={require("@/assets/images/textmark_blue.png")}
              style={{ width: LOGO_W, height: LOGO_H, resizeMode: "contain" }}
            />
          ),
          headerLeftContainerStyle: { paddingLeft: 13 },
          headerRight: () => <InboxButton />,
          headerRightContainerStyle: { paddingRight: 13 },
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          headerTitleAlign: "center",
          headerTitle: () => (
            <View style={{ alignItems: "center" }}>
              <Text style={ styles.Title }>Dear Month</Text>
              <Text style={ styles.SubTitle }>월간 디어데이</Text>
            </View>
          ),
          headerRight: () => <InboxButton />,
          headerRightContainerStyle: { paddingRight: 16 },
          headerLeft: () => <View style={{ width: BUTTON_PLACEHOLDER_WIDTH }} />,
          headerLeftContainerStyle: { paddingLeft: 16 },
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          headerTitleAlign: "center",
          headerTitle: () => (
            <View style={{ alignItems: "center" }}>
              <Text style={ styles.Title }>My Dearday</Text>
              <Text style={ styles.SubTitle }>환경설정</Text>
            </View>
          ),
          // ✅ 추가: calendar 스크린과 동일한 구조로 맞추기 위한 빈 공간
          headerRight: () => <View style={{ width: BUTTON_PLACEHOLDER_WIDTH }} />,
          headerRightContainerStyle: { paddingRight: 16 },
          headerLeft: () => <View style={{ width: BUTTON_PLACEHOLDER_WIDTH }} />,
          headerLeftContainerStyle: { paddingLeft: 16 },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: "#f2f2f2",
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabLabel: { fontFamily: "Pretendard-Bold", fontSize: 12, marginTop: 1, },
  fab: { position: "absolute", backgroundColor: "#5B8DEF", alignItems: "center", justifyContent: "center" },
  Title: { fontFamily: "Pretendard-Bold", fontSize: 18, color: "#5B8DEF" },
  SubTitle: { fontFamily: "Pretendard-Regular", fontSize: 12, color: "#929292", marginTop: -1 }
});
