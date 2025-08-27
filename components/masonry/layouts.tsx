// import { Image } from "expo-image";
// import React from "react";
// import { Pressable, StyleSheet, Text, View } from "react-native";
// import type { FeedItem } from "./types";
// import { isPH } from "./utils";

// export function PlaceholderBox({
//   width,
//   height,
//   radius,
// }: {
//   width: number;
//   height: number;
//   radius: number;
// }) {
//   return (
//     <View
//       style={{
//         width,
//         height,
//         borderRadius: radius,
//         backgroundColor: "transparent",
//       }}
//     />
//   );
// }

// export function Tile({
//   it,
//   width,
//   height,
//   radius,
//   onPressItem,
//   showInfo = false, // ✅ 추가: 가로 2칸 이상일 때만 true로 넘김
// }: {
//   it: FeedItem;
//   width: number;
//   height: number;
//   radius: number;
//   onPressItem?: (item: FeedItem) => void;
//   showInfo?: boolean;
// }) {
//   if (isPH(it)) {
//     return <PlaceholderBox width={width} height={height} radius={radius} />;
//   }

//   const pressable = !!onPressItem;

//   const Img = (
//     <Image
//       source={{ uri: it.imageUrl }}
//       style={{ width, height, borderRadius: radius, opacity: 1 }}
//       contentFit="cover"
//       transition={0}
//       placeholder={undefined}
//     />
//   );

//   // 왼쪽 하단 오버레이 (가로 2칸 이상일 때만)
//   const Overlay = showInfo ? (
//     <View
//       style={{
//         position: "absolute",
//         left: 6,
//         bottom: 6,
//         paddingHorizontal: 12,
//         paddingVertical: 12,
//         maxWidth: width - 12,
//       }}
//       pointerEvents="none"
//     >
//       {!!it.dateISO && <Text style={{ 
//         fontFamily: "Pretendard-Bold", 
//         color: "#FEFEFE", 
//         fontSize: 20 
//         }}>{it.dateISO}</Text>}
//       {!!it.place && (
//         <Text numberOfLines={1} style={{ 
//           fontFamily: "Pretendard-Regular", 
//           color: "#F2F2F2", 
//           fontSize: 15 }}>{it.place}</Text>)}
//     </View>
//   ) : null;

//   const WrapperStyle = { width, height, borderRadius: radius, overflow: "hidden" as const };

//   if (!pressable) {
//     return (
//       <View style={WrapperStyle}>
//         {Img}
//         {Overlay}
//       </View>
//     );
//   }

//   return (
//     <Pressable onPress={() => onPressItem?.(it)} accessibilityRole="button" style={WrapperStyle} android_ripple={{}}>
//       {Img}
//       {Overlay}
//     </Pressable>
//   );
// }

// export const styles = StyleSheet.create({
//   fillBig: { width: "100%", height: "100%", borderRadius: 8 },
// });

//////////////////////////////////////////////////////////////////////////////////////

// components/masonry/layouts.tsx
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  showInfo = false, // ✅ 추가: 가로 2칸 이상일 때만 true로 넘김
}: {
  it: FeedItem;
  width: number;
  height: number;
  radius: number;
  onPressItem?: (item: FeedItem) => void;
  showInfo?: boolean;
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

  // 왼쪽 하단 오버레이 (가로 2칸 이상일 때만)
  const Overlay = showInfo ? (
    <View
      style={{
        position: "absolute",
        left: 6,
        bottom: 6,
        paddingHorizontal: 12,
        paddingVertical: 12,
        maxWidth: width - 12,
      }}
      pointerEvents="none"
    >
      {!!it.dateISO && <Text style={{ 
        fontFamily: "Pretendard-Bold", 
        color: "#FEFEFE", 
        fontSize: 20 
        }}>{it.dateISO}</Text>}
      {!!it.place && (
        <Text numberOfLines={1} style={{ 
          fontFamily: "Pretendard-Regular", 
          color: "#F2F2F2", 
          fontSize: 15 }}>{it.place}</Text>)}
    </View>
  ) : null;

  const Gradient = showInfo ? (
    <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.5)']}
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' }}
    />
) : null;

  const WrapperStyle = { width, height, borderRadius: radius, overflow: "hidden" as const };

  if (!pressable) {
    return (
      <View style={WrapperStyle}>
        {Img}
        {Gradient}
        {Overlay}
      </View>
    );
  }

  return (
    <Pressable onPress={() => onPressItem?.(it)} accessibilityRole="button" style={WrapperStyle} android_ripple={{}}>
      {Img}
      {Gradient}
      {Overlay}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  fillBig: { width: "100%", height: "100%", borderRadius: 8 },
});