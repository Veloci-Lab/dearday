// layouts.tsx
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native"; // ✅ Text 추가
import type { FeedItem } from "./types";
import { isPH } from "./utils";

export function PlaceholderBox({
  width,
  height,
  radius,
}: {
  width: number;
  height: number;
  radius: number;
}) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: "transparent",
      }}
    />
  );
}

export function Tile({
  it,
  width,
  height,
  radius,
  onPressItem,
}: {
  it: FeedItem;
  width: number;
  height: number;
  radius: number;
  onPressItem?: (item: FeedItem) => void;
}) {
  if (isPH(it)) {
    return <PlaceholderBox width={width} height={height} radius={radius} />;
  }

  const pressable = !!onPressItem;

  const Img = (
    <Image
      source={{ uri: it.imageUrl }}
      style={{ width, height, borderRadius: radius, opacity: 1 }}
      contentFit="cover"
      transition={0}
      placeholder={undefined}
    />
  );

  // 왼쪽 하단 오버레이
  const Overlay = (
    <View
      style={{
        position: "absolute",
        left: 6,
        bottom: 6,
        // backgroundColor: "rgba(0,0,0,0.45)",
        // borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 12,
        maxWidth: width - 12,
      }}
      pointerEvents="none"
    >
      {!!it.dateISO && (
        <Text style={{ 
          fontFamily: "Pretendard-Bold",
          color: "#FEFEFE", 
          fontSize: 15,
          textShadowColor: "rgba(0,0,0,0.6)",
          textShadowRadius: 4,
          }}>
          {it.dateISO}
        </Text>
      )}
      {!!it.place && (
        <Text
          numberOfLines={1}
          style={{ 
            fontFamily: "Pretendard-Medium",
            color: "#F2F2F2", 
            fontSize: 10,
            textShadowColor: "rgba(0,0,0,0.6)",
            textShadowRadius: 4,
          }}
        >
          {it.place}
        </Text>
      )}
    </View>
  );

  // 공통 래퍼: 오버플로우 클립으로 둥근 모서리 안에 오버레이 포함
  const WrapperStyle = {
    width,
    height,
    borderRadius: radius,
    overflow: "hidden" as const,
  };

  if (!pressable) {
    return (
      <View style={WrapperStyle}>
        {Img}
        {Overlay}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => onPressItem?.(it)}
      accessibilityRole="button"
      style={WrapperStyle}
      android_ripple={{}}
    >
      {Img}
      {Overlay}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  fillBig: { width: "100%", height: "100%", borderRadius: 8 },
});
