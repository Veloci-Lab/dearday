import Feather from "@expo/vector-icons/Feather";
import { Tabs, router } from "expo-router";
import React from "react";
import {
  Dimensions, // 화면 크기 측정을 위해 import
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const InboxButton = ({ color = "#000" }: { color?: string }) => (
  <Pressable
    onPress={() => router.push("/pending")}
    style={{ padding: 6, marginRight: 0 }}
  >
    <Feather name="inbox" size={25} color={color} />
  </Pressable>
);

const BUTTON_PLACEHOLDER_WIDTH = 37;

/* ------ 커스텀 탭바 (비율 기반으로 수정) ------- */
function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  
  // --- 비율 계산 시작 ---
  const { width: screenWidth } = Dimensions.get("window");

  // 사용자가 제공한 측정치 기반 비율
  const LEFT_MARGIN_RATIO = 0.0556;   // 5.56%
  const PILL_WIDTH_RATIO = 0.6805;    // 68.05%
  const FAB_WIDTH_RATIO = 0.1667;     // 16.67%
  const RIGHT_MARGIN_RATIO = 0.0556;  // 5.56%

  // 화면 너비에 따라 동적 값 계산
  const pillWidth = screenWidth * PILL_WIDTH_RATIO;
  const PILL_LEFT = screenWidth * LEFT_MARGIN_RATIO;
  const FAB_SIZE = screenWidth * FAB_WIDTH_RATIO;
  const FAB_RIGHT = screenWidth * RIGHT_MARGIN_RATIO;
  // --- 비율 계산 끝 ---

  const PILL_HEIGHT = FAB_SIZE;
  const PILL_RADIUS = 100;
  
  const safeBottom = Math.max(insets.bottom, 8);
  const go = (name: string) => navigation.navigate(name as never);

  const ACTIVE = "#5B8DEF";
  const INACTIVE = "#C2C2C2";
  const TABS = [
    {
      name: "index",
      label: "홈",
      imgActive: require("@/assets/images/logo_blue.png"),
      imgInactive: require("@/assets/images/logo_gray.png"),
    },
    {
      name: "calendar",
      label: "월간",
      imgActive: require("@/assets/images/tab_calendar.png"),
      imgInactive: require("@/assets/images/tab_calendar_gray.png"),
    },
    {
      name: "mypage",
      label: "마이",
      imgActive: require("@/assets/images/tab_user.png"),
      imgInactive: require("@/assets/images/tab_user_gray.png"),
    },
  ];

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* 탭바(pill) 부분: left, width 값을 동적으로 적용 */}
      <View
        style={[
          styles.pill,
          {
            bottom: safeBottom + 10,
            left: PILL_LEFT,
            width: pillWidth,
            height: PILL_HEIGHT,
            borderRadius: PILL_RADIUS,
          },
        ]}
      >
        {TABS.map((t) => {
          const focused = current === t.name;
          const labelColor = focused ? ACTIVE : INACTIVE;
          const imgSrc = focused ? t.imgActive : t.imgInactive;
          return (
            <Pressable
              key={t.name}
              onPress={() => go(t.name)}
              style={styles.tab}
            >
              <Image
                source={imgSrc}
                style={{ width: 30, height: 30, resizeMode: "contain" }}
              />
              <Text style={[styles.tabLabel, { color: labelColor }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 카메라 버튼(FAB) 부분: right, width, height 값을 동적으로 적용 */}
      <Pressable
        onPress={() => router.push("/camera")}
        style={[
          styles.fab,
          {
            right: FAB_RIGHT,
            bottom: safeBottom + 10,
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: FAB_SIZE / 2,
          },
        ]}
      >
        <Image
          source={require("@/assets/images/camera.png")}
          // 내부 아이콘도 버튼 크기에 비례하여 조절 (원래 비율: 35/67 ≈ 0.52)
          style={{
            width: FAB_SIZE * 0.52,
            height: FAB_SIZE * 0.52,
            resizeMode: "contain",
          }}
        />
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
        headerStyle: { borderBottomWidth: 2, borderBottomColor: "#f2f2f2" },
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
              <Text style={styles.Title}>Dear Month</Text>
              <Text style={styles.SubTitle}>월간 디어데이</Text>
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
              <Text style={styles.Title}>My Dearday</Text>
              <Text style={styles.SubTitle}>환경설정</Text>
            </View>
          ),
          headerRight: () => (
            <View style={{ width: BUTTON_PLACEHOLDER_WIDTH }} />
          ),
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
  tabLabel: { fontFamily: "Pretendard-Bold", fontSize: 12, marginTop: 1 },
  fab: {
    position: "absolute",
    backgroundColor: "#5B8DEF",
    alignItems: "center",
    justifyContent: "center",
  },
  Title: {
    fontFamily: "Pretendard-Bold",
    fontSize: 18,
    color: "#5B8DEF",
  },
  SubTitle: {
    fontFamily: "Pretendard-Regular",
    fontSize: 12,
    color: "#929292",
    marginTop: -1,
  },
});