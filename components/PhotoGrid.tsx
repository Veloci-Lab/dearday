import { Image } from "expo-image";
import React, { useMemo } from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";

export interface PhotoGridItem {
  id: string;
  image_url: string;
  user_id?: string;
  username?: string;
  profile_image_url?: string;
  is_public?: boolean;
}

interface PhotoGridProps {
  photos: PhotoGridItem[];
  onPressPhoto?: (photo: PhotoGridItem) => void;
  patternKey?: number; // ✅ 변경 시에만 패턴 재랜덤
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_HORIZONTAL_PADDING = 11;
const GAP = 4;
const CONTAINER_WIDTH = SCREEN_WIDTH - GRID_HORIZONTAL_PADDING * 2;
const COL_WIDTH = Math.floor((CONTAINER_WIDTH - GAP * 2) / 3);
const LARGE_WIDTH = CONTAINER_WIDTH - COL_WIDTH - GAP;
const LARGE_HEIGHT = COL_WIDTH * 2 + GAP;
const SMALL_HEIGHT = COL_WIDTH;

type PatternType = "large_left" | "three_equal" | "large_right";
const ALL_PATTERNS: PatternType[] = ["large_left", "three_equal", "large_right"];

function getRandomPattern(): PatternType {
  return ALL_PATTERNS[Math.floor(Math.random() * ALL_PATTERNS.length)];
}

function LargeLeftRow({ photos, onPressPhoto }: { photos: PhotoGridItem[]; onPressPhoto?: (photo: PhotoGridItem) => void }) {
  const [large, small1, small2] = photos;
  return (
    <View style={gridStyles.row}>
      <Pressable style={[gridStyles.largeImage, { width: LARGE_WIDTH, height: LARGE_HEIGHT }]} onPress={() => onPressPhoto?.(large)}>
        <Image source={{ uri: large.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" transition={200} cachePolicy="disk" />
      </Pressable>
      <View style={gridStyles.smallColumn}>
        <Pressable style={[gridStyles.smallImage, { width: COL_WIDTH, height: SMALL_HEIGHT }]} onPress={() => onPressPhoto?.(small1)}>
          <Image source={{ uri: small1.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" transition={200} cachePolicy="disk" />
        </Pressable>
        <Pressable style={[gridStyles.smallImage, { width: COL_WIDTH, height: SMALL_HEIGHT }]} onPress={() => onPressPhoto?.(small2)}>
          <Image source={{ uri: small2.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" transition={200} cachePolicy="disk" />
        </Pressable>
      </View>
    </View>
  );
}

function ThreeEqualRow({ photos, onPressPhoto }: { photos: PhotoGridItem[]; onPressPhoto?: (photo: PhotoGridItem) => void }) {
  return (
    <View style={gridStyles.row}>
      {photos.map((photo) => (
        <Pressable key={photo.id} style={[gridStyles.equalImage, { width: COL_WIDTH, height: COL_WIDTH }]} onPress={() => onPressPhoto?.(photo)}>
          <Image source={{ uri: photo.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" transition={200} cachePolicy="disk" />
        </Pressable>
      ))}
    </View>
  );
}

function LargeRightRow({ photos, onPressPhoto }: { photos: PhotoGridItem[]; onPressPhoto?: (photo: PhotoGridItem) => void }) {
  const [small1, small2, large] = photos;
  return (
    <View style={gridStyles.row}>
      <View style={gridStyles.smallColumn}>
        <Pressable style={[gridStyles.smallImage, { width: COL_WIDTH, height: SMALL_HEIGHT }]} onPress={() => onPressPhoto?.(small1)}>
          <Image source={{ uri: small1.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" transition={200} cachePolicy="disk" />
        </Pressable>
        <Pressable style={[gridStyles.smallImage, { width: COL_WIDTH, height: SMALL_HEIGHT }]} onPress={() => onPressPhoto?.(small2)}>
          <Image source={{ uri: small2.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" transition={200} cachePolicy="disk" />
        </Pressable>
      </View>
      <Pressable style={[gridStyles.largeImage, { width: LARGE_WIDTH, height: LARGE_HEIGHT }]} onPress={() => onPressPhoto?.(large)}>
        <Image source={{ uri: large.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" transition={200} cachePolicy="disk" />
      </Pressable>
    </View>
  );
}

export default function PhotoGrid({ photos, onPressPhoto, patternKey = 0 }: PhotoGridProps) {
  const rows = useMemo(() => {
    const result: { pattern: PatternType; photos: PhotoGridItem[] }[] = [];

    for (let i = 0; i + 2 < photos.length; i += 3) {
      result.push({
        pattern: getRandomPattern(),
        photos: photos.slice(i, i + 3),
      });
    }

    const remaining = photos.length % 3;
    if (remaining > 0) {
      result.push({
        pattern: "three_equal",
        photos: photos.slice(photos.length - remaining),
      });
    }

    return result;
  }, [photos, patternKey]);

  if (photos.length === 0) return null;

  return (
    <View style={gridStyles.container}>
      {rows.map((row, index) => {
        const key = `row-${index}-${patternKey}`;
        switch (row.pattern) {
          case "large_left":
            return <LargeLeftRow key={key} photos={row.photos} onPressPhoto={onPressPhoto} />;
          case "three_equal":
            return <ThreeEqualRow key={key} photos={row.photos} onPressPhoto={onPressPhoto} />;
          case "large_right":
            return <LargeRightRow key={key} photos={row.photos} onPressPhoto={onPressPhoto} />;
          default:
            return null;
        }
      })}
    </View>
  );
}

const gridStyles = StyleSheet.create({
  container: { paddingHorizontal: GRID_HORIZONTAL_PADDING, gap: GAP },
  row: { flexDirection: "row", alignItems: "center", gap: GAP },
  smallColumn: { flexDirection: "column", gap: GAP },
  largeImage: { borderRadius: 10, overflow: "hidden" },
  smallImage: { borderRadius: 10, overflow: "hidden" },
  equalImage: { borderRadius: 10, overflow: "hidden" },
});