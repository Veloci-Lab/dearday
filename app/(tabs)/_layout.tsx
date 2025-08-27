// import Feather from "@expo/vector-icons/Feather";
// import { Tabs, router } from "expo-router";
// import React from "react";
// import { Dimensions, Image, Pressable, StyleSheet, Text, View } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// /**
//  * 사용 이미지(assets/images) — 단색(검정) PNG 권장:
//  * - logo_blue.png        (홈 전용, 활성 시 원본 컬러 그대로)
//  * - tab_calendar.png     (월간 탭 아이콘)
//  * - tab_user.png         (마이 탭 아이콘)
//  */

// const InboxButton = ({ color = "#000" }: { color?: string }) => (
//   <Pressable onPress={() => router.push("/pending")} style={{ padding: 6, marginRight: 0 }}>
//     <Feather name="inbox" size={25} color={color} />
//   </Pressable>
// );

// /* ------ 커스텀 탭바 ------- */
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

//   const ACTIVE = "#5B8DEF";
//   const INACTIVE = "#C2C2C2";

//   // 탭 메타 (이미지 경로와 틴트 전략 포함)
//   const TABS = [
//     {
//       name: "index",
//       label: "홈",
//       img: require("@/assets/images/logo_blue.png"),
//       tintMode: "inactiveOnly" as const, // 활성: 원본 컬러, 비활성: INACTIVE 틴트
//     },
//     {
//       name: "calendar",
//       label: "월간",
//       img: require("@/assets/images/tab_calendar.png"),
//       tintMode: "both" as const, // 활성: ACTIVE 틴트, 비활성: INACTIVE 틴트
//     },
//     {
//       name: "mypage",
//       label: "마이",
//       img: require("@/assets/images/tab_user.png"),
//       tintMode: "both" as const,
//     },
//   ];

//   return (
//     <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
//       <View
//         style={[
//           styles.pill,
//           { bottom: safeBottom + 10, left: H_MARGIN, width: pillWidth, height: PILL_HEIGHT, borderRadius: PILL_RADIUS },
//         ]}
//       >
//         {TABS.map((t) => {
//           const focused = current === t.name;
//           const labelColor = focused ? ACTIVE : INACTIVE;

//           // 이미지 틴트 규칙
//           const tintColor =
//             t.tintMode === "inactiveOnly"
//               ? focused
//                 ? undefined // 활성: 로고 원본 컬러
//                 : INACTIVE // 비활성: 회색화
//               : focused
//               ? ACTIVE
//               : INACTIVE;

//           return (
//             <Pressable key={t.name} onPress={() => go(t.name)} style={styles.tab}>
//               <Image
//                 source={t.img}
//                 style={{
//                   width: 25,
//                   height: 25,
//                   resizeMode: "contain",
//                   tintColor, // 위 규칙 적용
//                 }}
//               />
//               <Text style={[styles.tabLabel, { color: labelColor }]}>{t.label}</Text>
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

//   const LOGO_AR = 253 / 53;   // textmark_blue.png 가로/세로
//   const LOGO_H = 32;          // 여기만 바꾸면 전체 스케일 조절
//   const LOGO_W = Math.round(LOGO_H * LOGO_AR);

//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: true,                 // 네이티브 헤더 사용
//         tabBarStyle: { display: "none" },  // 네이티브 탭은 숨김 (커스텀 탭 사용)
//       }}
//       tabBar={(props) => <CustomTabBar {...props} />}
//     >

//       <Tabs.Screen
//         name="index"
//         options={{
//           headerTitle: "",
//           headerTitleAlign: "left",
//           headerLeft: () => (
//             <Image
//               source={require("@/assets/images/textmark_blue.png")}
//               style={{ width: LOGO_W, height: LOGO_H, resizeMode: "contain" }}
//             />
//           ),
//           headerLeftContainerStyle: { paddingLeft: 16 },
//           headerRight: () => <InboxButton />,
//           headerRightContainerStyle: { paddingRight: 16 },
//         }}
//       />

//       <Tabs.Screen
//         name="calendar"
//         options={{
//           headerTitleAlign: "center",
//           headerTitle: () => (
//             <View style={{ alignItems: "center" }}>
//               <Text style={ styles.Title }>Dear Month</Text>
//               <Text style={ styles.SubTitle }>월간 디어데이</Text>
//             </View>
//           ),
//           headerRight: () => <InboxButton />,
//           headerRightContainerStyle: { paddingRight: 16 },
//         }}
//       />

//       <Tabs.Screen
//         name="mypage"
//         options={{
//           headerTitleAlign: "center",
//           headerTitle: () => (
//             <View style={{ alignItems: "center" }}>
//               <Text style={ styles.Title }>My Dearday</Text>
//               <Text style={ styles.SubTitle }>환경설정</Text>
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
//   tabLabel: { 
//     fontFamily: "Pretendard-Bold",
//     fontSize: 12, 
//     marginTop: 4, 
//     //fontWeight: "600" 
//   },
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
//   Title: { 
//     fontFamily: "Pretendard-Bold",
//     fontSize: 18, 
//     //fontWeight: "700", 
//     color: "#5B8DEF" },
//   SubTitle: { 
//     fontFamily: "Pretendard-Regular",
//     fontSize: 12, 
//     color: "#929292", 
//     marginTop: 2 }
// });

import Feather from "@expo/vector-icons/Feather";
import { Tabs, router } from "expo-router";
import React from "react";
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * 사용 이미지(assets/images) — 단색(검정) PNG 권장:
 * - 활성:   logo_blue.png,        tab_calendar.png,     tab_user.png
 * - 비활성: logo_gray.png,        tab_calendar_gray.png,tab_user_gray.png
 */

const InboxButton = ({ color = "#000" }: { color?: string }) => (
  <Pressable onPress={() => router.push("/pending")} style={{ padding: 6, marginRight: 0 }}>
    <Feather name="inbox" size={25} color={color} />
  </Pressable>
);

const INBOX_BUTTON_WIDTH = 37; // 아이콘(25) + 좌우 패딩(6+6)

/* ------ 커스텀 탭바 ------- */
function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;

  const PILL_HEIGHT = 67;
  // const PILL_RADIUS = PILL_HEIGHT / 2;
  const PILL_RADIUS = 100;
  const H_MARGIN = 16;
  const INNER_MARGIN = 32;

  // const FAB_SIZE = 60;
  const FAB_SIZE = 67;
  const FAB_GAP = 12;
  const RIGHT_RESERVED = FAB_SIZE + FAB_GAP + H_MARGIN;

  const screenW = Dimensions.get("window").width;
  //const pillWidth = screenW - (H_MARGIN + RIGHT_RESERVED);
  const pillWidth = 263;
  const safeBottom = Math.max(insets.bottom, 8);

  const REGION_W = screenW - RIGHT_RESERVED;
  const PILL_LEFT = INNER_MARGIN;
  const FAB_RIGHT = INNER_MARGIN;

  const go = (name: string) => navigation.navigate(name as never);

  const ACTIVE = "#5B8DEF";
  const INACTIVE = "#C2C2C2";

  // 탭 메타 (이미지 경로와 틴트 전략 포함)
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
      <View
        style={[
          styles.pill,
          { bottom: safeBottom + 10, 
            //left: H_MARGIN, 
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
            <Pressable key={t.name} onPress={() => go(t.name)} style={styles.tab}>
              <Image
                source={imgSrc}
                style={{ width: 30, height: 30, resizeMode: "contain" }}
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
          { right: FAB_RIGHT, 
            bottom: safeBottom + 10, 
            width: FAB_SIZE, 
            height: FAB_SIZE, 
            borderRadius: FAB_SIZE / 2,
          },
        ]}
      >
        <Image
          source={ require("@/assets/images/camera.png") } // 카메라 아이콘 이미지
          style={{ width: 35, height: 35, resizeMode: "contain" }}
        />
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
        headerShadowVisible: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >

      <Tabs.Screen
        name="index"
        options={{
          headerTitle: "",
          headerTitleAlign: "left",
          headerStyle: { 
            height: 80,
            borderBottomWidth: 2,
            borderBottomColor: '#F2F2F2' 
          },
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
          headerStyle: { 
            height: 80,
            borderBottomWidth: 2,
            borderBottomColor: '#F2F2F2' 
          },
          headerTitle: () => (
            <View style={{ alignItems: "center" }}>
              <Text style={ styles.Title }>Dear Month</Text>
              <Text style={ styles.SubTitle }>월간 디어데이</Text>
            </View>
          ),
          headerRight: () => <InboxButton />,
          headerRightContainerStyle: { paddingRight: 16 },
          headerLeft: () => <View style={{ width: INBOX_BUTTON_WIDTH }} />,
          headerLeftContainerStyle: { paddingLeft: 16 },
        }}
      />

      <Tabs.Screen
        name="mypage"
        options={{
          headerTitleAlign: "center",
          headerStyle: { 
            height: 80,
            borderBottomWidth: 2,
            borderBottomColor: '#F2F2F2' 
          },
          headerTitle: () => (
            <View style={{ alignItems: "center" }}>
              <Text style={ styles.Title }>My Dearday</Text>
              <Text style={ styles.SubTitle }>환경설정</Text>
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
    borderWidth: 2,
    borderColor: "#f2f2f2",
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabLabel: { 
    fontFamily: "Pretendard-Bold",
    fontSize: 12, 
    marginTop: 1, 
  },
  fab: {
    position: "absolute",
    backgroundColor: "#5B8DEF",
    alignItems: "center",
    justifyContent: "center",
  },
  Title: { 
    fontFamily: "Pretendard-Bold",
    fontSize: 18, 
    color: "#5B8DEF" },
  SubTitle: { 
    fontFamily: "Pretendard-Regular",
    fontSize: 12, 
    color: "#929292", 
    marginTop: -1 
  }
});