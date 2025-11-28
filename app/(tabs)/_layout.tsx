import Feather from "@expo/vector-icons/Feather";
import { Tabs, router } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* ------ 커스텀 탭바 ------- */
function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;

  const { width: screenWidth } = Dimensions.get("window");

  // 비율 계산
  const LEFT_MARGIN_RATIO = 0.0556; // 5.56%
  const PILL_WIDTH_RATIO = 0.6805; // 68.05%
  const FAB_WIDTH_RATIO = 0.1667; // 16.67%
  const RIGHT_MARGIN_RATIO = 0.0556; // 5.56%

  const pillWidth = screenWidth * PILL_WIDTH_RATIO;
  const PILL_LEFT = screenWidth * LEFT_MARGIN_RATIO;
  const FAB_SIZE = screenWidth * FAB_WIDTH_RATIO;
  const FAB_RIGHT = screenWidth * RIGHT_MARGIN_RATIO;

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
      name: "organize",
      label: "정리",
      icon: "grid",
    },
    {
      name: "record",
      label: "기록",
      icon: "edit-3",
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
      {/* 탭바(pill) 부분 */}
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

          return (
            <Pressable
              key={t.name}
              onPress={() => go(t.name)}
              style={styles.tab}
            >
              {t.imgActive ? (
                <Image
                  source={focused ? t.imgActive : t.imgInactive}
                  style={{ width: 30, height: 30, resizeMode: "contain" }}
                />
              ) : (
                <Feather name={t.icon as any} size={24} color={labelColor} />
              )}
              <Text style={[styles.tabLabel, { color: labelColor }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 카메라 버튼(FAB) 부분 */}
      <Pressable
        onPress={() => router.push("/making-dearday" as any)}
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
        {/* <Image
          source={require("@/assets/images/camera.png")}
          style={{
            width: FAB_SIZE * 0.52,
            height: FAB_SIZE * 0.52,
            resizeMode: "contain",
          }}
        /> */}
        <Feather name="plus" size={FAB_SIZE * 0.5} color="#fff" />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarStyle: { display: "none" },
          headerShadowVisible: false,
          headerStyle: { borderBottomWidth: 2, borderBottomColor: "#f2f2f2" },
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="organize" options={{ headerShown: false }} />
        <Tabs.Screen name="record" />
        <Tabs.Screen name="mypage" />
      </Tabs>
    </GestureHandlerRootView>
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
});
