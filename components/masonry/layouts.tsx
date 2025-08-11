// layouts.tsx
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
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

/** 공통 타일: onPressItem 유무로 활성/비활성 결정 */
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

  const content = (
    <Image
      source={{ uri: it.imageUrl }}
      style={{ width, height, borderRadius: radius, opacity: pressable ? 1 : 0.5 }}
      contentFit="cover"
    />
  );

  if (!pressable) return content;

  return (
    <Pressable
      onPress={() => onPressItem?.(it)}
      accessibilityRole="button"
      style={{ width, height, borderRadius: radius, overflow: "hidden" }}
      android_ripple={{}}
    >
      {content}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  fillBig: { width: "100%", height: "100%", borderRadius: 8 },
});
