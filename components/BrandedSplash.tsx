import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  View,
} from "react-native";

const LOGO_AR = 253 / 53;
const LOGO_H = 44;
const LOGO_W = Math.round(LOGO_H * LOGO_AR);
const { height } = Dimensions.get("window");

export function BrandedSplash({
  variant,
  onFinish,
  showMs = 1500,
  fadeMs = 400,
}: {
  variant: "pre" | "post";
  onFinish: () => void;
  showMs?: number;
  fadeMs?: number;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // 안전을 위해 마운트 시 초기값 보정
    opacity.setValue(1);

    animRef.current = Animated.timing(opacity, {
      toValue: 0,
      duration: fadeMs,
      delay: showMs,
      useNativeDriver: true,
    });

    animRef.current.start(({ finished }) => {
      if (finished && mountedRef.current) onFinish();
    });

    return () => {
      mountedRef.current = false;
      animRef.current?.stop(); // ? 언마운트 중 애니메이션 정지
    };
  }, [variant, opacity, onFinish, showMs, fadeMs]);

  const isPost = variant === "post";
  const bg = isPost ? "#5B8DEF" : "#FFFFFF";

  const logo = isPost
    ? require("../assets/images/textmark_white.png")
    : require("../assets/images/textmark_blue.png");

  return (
    <Animated.View style={[styles.wrap, { opacity }]}>
      <View style={[styles.fill, { backgroundColor: bg }]}>
        <Image
          source={logo}
          style={{ width: LOGO_W, height: LOGO_H }}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    zIndex: 9999,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -(height * 0.05),
  },
  logo: {
    width: 160,
    height: 160,
    resizeMode: "contain",
  },
});
