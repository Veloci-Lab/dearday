import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

// variant: "pre" (온보딩 전) / "post" (온보딩 후)
export function BrandedSplash({
  variant,
  onFinish,
  showMs = 1500,
  fadeMs = 400,
}: {
  variant: "pre" | "post";
  onFinish: () => void;
  showMs?: number; // 화면 표시 시간
  fadeMs?: number; // 페이드아웃 시간
}) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // // 너무 번쩍이지 않게 짧게 유지 후 페이드아웃
    // Animated.timing(opacity, {
    //   toValue: 0,
    //   duration: 350,
    //   delay: variant === "pre" ? 120 : 10, // pre일 때도 살짝만 보이고 사라짐
    //   useNativeDriver: true,
    // }).start(() => onFinish());
    // 지정한 시간(showMs) 유지 후, fadeMs로 페이드아웃
    Animated.timing(opacity, {
      toValue: 0,
      duration: fadeMs,
      delay: showMs,
      useNativeDriver: true,
    }).start(() => onFinish());
  }, [variant, opacity, onFinish, showMs, fadeMs]);

  const isPost = variant === "post";
  const bg = isPost ? "#5B8DEF" : "#FFFFFF";
  const logo = isPost
    ? require("../assets/images/splash_icon_white.png") // 파란 배경용 "흰 로고"
    : require("../assets/images/splash_icon.png");      // 흰 배경용 "파란 로고"

  return (
    <Animated.View style={[styles.wrap, { opacity }]}>
      <View style={[styles.fill, { backgroundColor: bg }]}>
        <Image source={logo} style={styles.logo} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    zIndex: 9999,
    top: 0, left: 0, right: 0, bottom: 0,
  },
  fill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 160,
    height: 160,
    resizeMode: "contain",
  },
});
