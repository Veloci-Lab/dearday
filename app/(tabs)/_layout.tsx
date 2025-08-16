// // app/(tabs)/_layout.tsx
// import Feather from "@expo/vector-icons/Feather";
// import { Tabs, router } from "expo-router";
// import React from "react";
// import { Dimensions, Image, Pressable, StyleSheet, Text, View } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// const InboxButton = ({ color = "#000" }: { color?: string }) => (
//   <Pressable onPress={() => router.push("/pending")} style={{ padding: 6, marginRight: 0 }}>
//     <Feather name="inbox" size={20} color={color} />
//   </Pressable>
// );

// /* ------ 커스텀 탭바 그대로 ------- */
// function CustomTabBar({ state, navigation }) {
//   const insets = useSafeAreaInsets();
//   const current = state.routes[state.index]?.name;

//   const PILL_HEIGHT = 56;
//   const PILL_RADIUS = PILL_HEIGHT / 2;
//   const H_MARGIN = 16;

//   const FAB_SIZE = 60;
//   const FAB_GAP = 12;
//   const RIGHT_RESERVED = FAB_SIZE + FAB_GAP + H_MARGIN;

//   const screenW = Dimensions.get("window").width;
//   const pillWidth = screenW - (H_MARGIN + RIGHT_RESERVED);
//   const safeBottom = Math.max(insets.bottom, 8);

//   const go = (name: string) => navigation.navigate(name as never);

//   return (
//     <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
//       <View
//         style={[
//           styles.pill,
//           { bottom: safeBottom + 8, left: H_MARGIN, width: pillWidth, height: PILL_HEIGHT, borderRadius: PILL_RADIUS },
//         ]}
//       >
//         {[
//           { name: "index", label: "홈", icon: "home" as const },
//           { name: "calendar", label: "월간", icon: "calendar" as const },
//           { name: "mypage", label: "마이", icon: "user" as const },
//         ].map((t) => {
//           const focused = current === t.name;
//           const color = focused ? "#5B8DEF" : "#C2C2C2";
//           return (
//             <Pressable key={t.name} onPress={() => go(t.name)} style={styles.tab}>
//               {t.name === "index" ? (
//                 <Image
//                   source={require("@/assets/images/logo_blue.png")}
//                   style={{ width: 25, 
//                            height: 25, 
//                            resizeMode: "contain",
//                            tintColor: focused ? undefined : "#BDBDBD", }}
//                 />
//               ) : (
//               <Feather name={t.icon} size={20} color={color} />
//               )}
//               <Text style={[styles.tabLabel, { color }]}>{t.label}</Text>
//             </Pressable>
//           );
//         })}
//       </View>

//       <Pressable
//         onPress={() => router.push("/camera")}
//         style={[
//           styles.fab,
//           { right: H_MARGIN, bottom: safeBottom + 8, width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2 },
//         ]}
//       >
//         <Feather name="camera" size={28} color="#fff" />
//       </Pressable>
//     </View>
//   );
// }

// export default function TabsLayout() {
//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: true,                 // ← 헤더 켜기
//         tabBarStyle: { display: "none" },  // ← 네이티브 탭은 숨김
//       }}
//       tabBar={(props) => <CustomTabBar {...props} />}
//     >
//       <Tabs.Screen
//         name="index"
//         options={{
//             headerTitle: "",
//             headerTitleAlign: "left",
//             headerLeft: () => (
//             <Image
//                 source={require("@/assets/images/logo_blue.png")}
//                 style={{ width: 28, height: 28, resizeMode: "contain" }}
//             />
//             ),
//             headerLeftContainerStyle: { paddingLeft: 16 },   // 왼쪽 여백

//             headerRight: () => <InboxButton />,
//             headerRightContainerStyle: { paddingRight: 16 }, // 오른쪽 여백
//         }}
//       />

//       <Tabs.Screen
//         name="calendar"
//         options={{
//           headerTitleAlign: "center",
//           headerTitle: () => (
//             <View style={{ alignItems: "center" }}>
//                 <Text style={{ fontSize: 18, fontWeight: "700", color: "#5B8DEF" }}>
//                 Dear Month
//                 </Text>
//                 <Text style={{ fontSize: 12, color: "#929292", marginTop: 2 }}>
//                 월간 디어데이
//                 </Text>
//             </View>
//           ),
//           headerRight: () => <InboxButton />,
//             headerRightContainerStyle: { paddingRight: 16 },
//         }}
//       />
//       <Tabs.Screen
//         name="mypage"
//         options={{
//           headerTitle: () => (
//             <View style={{ alignItems: "center" }}>
//                 <Text style={{ fontSize: 18, fontWeight: "700", color: "#5B8DEF" }}>
//                 My Dearday
//                 </Text>
//                 <Text style={{ fontSize: 12, color: "#929292", marginTop: 2 }}>
//                 환경설정
//                 </Text>
//             </View>
//           ),
//         }}
//       />
//     </Tabs>
//   );
// }

// const styles = StyleSheet.create({
//   pill: {
//     position: "absolute",
//     backgroundColor: "rgba(255,255,255,0.95)",
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-around",
//     paddingHorizontal: 8,
//     shadowColor: "#000",
//     shadowOpacity: 0.12,
//     shadowRadius: 10,
//     shadowOffset: { width: 0, height: 4 },
//     elevation: 6,
//   },
//   tab: { flex: 1, alignItems: "center", justifyContent: "center" },
//   tabLabel: { fontSize: 12, marginTop: 4, fontWeight: "600" },
//   fab: {
//     position: "absolute",
//     backgroundColor: "#5B8DEF",
//     alignItems: "center",
//     justifyContent: "center",
//     shadowColor: "#000",
//     shadowOpacity: 0.25,
//     shadowRadius: 12,
//     shadowOffset: { width: 0, height: 6 },
//     elevation: 8,
//   },
// });


// app/(tabs)/_layout.tsx
import Feather from "@expo/vector-icons/Feather";
import { Tabs, router } from "expo-router";
import React from "react";
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * 사용 이미지(assets/images) — 단색(검정) PNG 권장:
 * - logo_blue.png        (홈 전용, 활성 시 원본 컬러 그대로)
 * - tab_calendar.png     (월간 탭 아이콘)
 * - tab_user.png         (마이 탭 아이콘)
 */

const InboxButton = ({ color = "#000" }: { color?: string }) => (
  <Pressable onPress={() => router.push("/pending")} style={{ padding: 6, marginRight: 0 }}>
    <Feather name="inbox" size={25} color={color} />
  </Pressable>
);

/* ------ 커스텀 탭바 ------- */
function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;

  const PILL_HEIGHT = 56;
  const PILL_RADIUS = PILL_HEIGHT / 2;
  const H_MARGIN = 16;

  const FAB_SIZE = 60;
  const FAB_GAP = 12;
  const RIGHT_RESERVED = FAB_SIZE + FAB_GAP + H_MARGIN;

  const screenW = Dimensions.get("window").width;
  const pillWidth = screenW - (H_MARGIN + RIGHT_RESERVED);
  const safeBottom = Math.max(insets.bottom, 8);

  const go = (name: string) => navigation.navigate(name as never);

  const ACTIVE = "#5B8DEF";
  const INACTIVE = "#C2C2C2";

  // 탭 메타 (이미지 경로와 틴트 전략 포함)
  const TABS = [
    {
      name: "index",
      label: "홈",
      img: require("@/assets/images/logo_blue.png"),
      tintMode: "inactiveOnly" as const, // 활성: 원본 컬러, 비활성: INACTIVE 틴트
    },
    {
      name: "calendar",
      label: "월간",
      img: require("@/assets/images/tab_calendar.png"),
      tintMode: "both" as const, // 활성: ACTIVE 틴트, 비활성: INACTIVE 틴트
    },
    {
      name: "mypage",
      label: "마이",
      img: require("@/assets/images/tab_user.png"),
      tintMode: "both" as const,
    },
  ];

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.pill,
          { bottom: safeBottom + 8, left: H_MARGIN, width: pillWidth, height: PILL_HEIGHT, borderRadius: PILL_RADIUS },
        ]}
      >
        {TABS.map((t) => {
          const focused = current === t.name;
          const labelColor = focused ? ACTIVE : INACTIVE;

          // 이미지 틴트 규칙
          const tintColor =
            t.tintMode === "inactiveOnly"
              ? focused
                ? undefined // 활성: 로고 원본 컬러
                : INACTIVE // 비활성: 회색화
              : focused
              ? ACTIVE
              : INACTIVE;

          return (
            <Pressable key={t.name} onPress={() => go(t.name)} style={styles.tab}>
              <Image
                source={t.img}
                style={{
                  width: 25,
                  height: 25,
                  resizeMode: "contain",
                  tintColor, // 위 규칙 적용
                }}
              />
              <Text style={[styles.tabLabel, { color: labelColor }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => router.push("/camera")}
        style={[
          styles.fab,
          { right: H_MARGIN, bottom: safeBottom + 8, width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2 },
        ]}
      >
        <Feather name="camera" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {

  const LOGO_AR = 253 / 53;   // textmark_blue.png 가로/세로
  const LOGO_H = 32;          // 여기만 바꾸면 전체 스케일 조절
  const LOGO_W = Math.round(LOGO_H * LOGO_AR);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,                 // 네이티브 헤더 사용
        tabBarStyle: { display: "none" },  // 네이티브 탭은 숨김 (커스텀 탭 사용)
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >

      <Tabs.Screen
        name="index"
        options={{
          headerTitle: "",
          headerTitleAlign: "left",
          headerLeft: () => (
            <Image
              source={require("@/assets/images/textmark_blue.png")}
              style={{ width: LOGO_W, height: LOGO_H, resizeMode: "contain" }}
            />
          ),
          headerLeftContainerStyle: { paddingLeft: 16 },
          headerRight: () => <InboxButton />,
          headerRightContainerStyle: { paddingRight: 16 },
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          headerTitleAlign: "center",
          headerTitle: () => (
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#5B8DEF" }}>Dear Month</Text>
              <Text style={{ fontSize: 12, color: "#929292", marginTop: 2 }}>월간 디어데이</Text>
            </View>
          ),
          headerRight: () => <InboxButton />,
          headerRightContainerStyle: { paddingRight: 16 },
        }}
      />

      <Tabs.Screen
        name="mypage"
        options={{
          headerTitle: () => (
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#5B8DEF" }}>My Dearday</Text>
              <Text style={{ fontSize: 12, color: "#929292", marginTop: 2 }}>환경설정</Text>
            </View>
          ),
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
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabLabel: { fontSize: 12, marginTop: 4, fontWeight: "600" },
  fab: {
    position: "absolute",
    backgroundColor: "#5B8DEF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
