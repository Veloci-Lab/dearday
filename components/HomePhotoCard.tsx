import { HomePhoto } from "@/types/photo";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  photo: HomePhoto | null; // placeholder 고려
  width: number;
  height: number;
  radius: number;
  onPress?: () => void;
};

export default function HomePhotoCard({
  photo,
  width,
  height,
  radius,
  onPress,
}: Props) {
  if (!photo) {
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

  return (
    <Pressable
      onPress={onPress}
      style={{ width, height, borderRadius: radius, overflow: "hidden" }}
    >
      <Image
        source={{ uri: photo.imageUrl }}
        style={{ width, height }}
        contentFit="cover"
      />

      <View style={styles.overlay}>
        {photo.category && (
          <View style={[styles.badge, { backgroundColor: "#ffffffdd" }]}>
            <Text style={styles.badgeText}>{photo.category}</Text>
          </View>
        )}

        {photo.isRecorded && (
          <View style={[styles.badge, { backgroundColor: "#5B8DEF" }]}>
            <Text style={styles.badgeText2}>기록</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    color: "#444",
  },
  badgeText2: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
  },
});
