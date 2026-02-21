import { Image } from "expo-image";
import React, { useMemo } from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";

/* ====== 타입 ====== */
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
  randomize?: boolean; // 랜덤 패턴 & 순서 섞기 활성화
  shuffleKey?: number; // 변경 시 재섞기 트리거
}

/* ====== 레이아웃 상수 ====== */
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_HORIZONTAL_PADDING = 11;
const GAP = 4;
const CONTAINER_WIDTH = SCREEN_WIDTH - GRID_HORIZONTAL_PADDING * 2;
const COL_WIDTH = Math.floor((CONTAINER_WIDTH - GAP * 2) / 3);
const LARGE_WIDTH = CONTAINER_WIDTH - COL_WIDTH - GAP;
const LARGE_HEIGHT = COL_WIDTH * 2 + GAP;
const SMALL_HEIGHT = COL_WIDTH;

/* ====== 그리드 패턴 ====== */

// 패턴 A: 큰 사진(왼쪽) + 작은 사진 2개(오른쪽 세로)
type PatternType = "large_left" | "three_equal" | "large_right";

function LargeLeftRow({
  photos,
  onPressPhoto,
}: {
  photos: PhotoGridItem[];
  onPressPhoto?: (photo: PhotoGridItem) => void;
}) {
  const [large, small1, small2] = photos;

  return (
    <View style={gridStyles.row}>
      <Pressable
        style={[
          gridStyles.largeImage,
          { width: LARGE_WIDTH, height: LARGE_HEIGHT },
        ]}
        onPress={() => onPressPhoto?.(large)}
      >
        <Image
          source={{ uri: large.image_url }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          transition={200}
          cachePolicy="disk"
        />
      </Pressable>
      <View style={gridStyles.smallColumn}>
        <Pressable
          style={[
            gridStyles.smallImage,
            { width: COL_WIDTH, height: SMALL_HEIGHT },
          ]}
          onPress={() => onPressPhoto?.(small1)}
        >
          <Image
            source={{ uri: small1.image_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            transition={200}
            cachePolicy="disk"
          />
        </Pressable>
        <Pressable
          style={[
            gridStyles.smallImage,
            { width: COL_WIDTH, height: SMALL_HEIGHT },
          ]}
          onPress={() => onPressPhoto?.(small2)}
        >
          <Image
            source={{ uri: small2.image_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            transition={200}
            cachePolicy="disk"
          />
        </Pressable>
      </View>
    </View>
  );
}

// 패턴 B: 3개 가로 균등 배열
function ThreeEqualRow({
  photos,
  onPressPhoto,
}: {
  photos: PhotoGridItem[];
  onPressPhoto?: (photo: PhotoGridItem) => void;
}) {
  return (
    <View style={gridStyles.row}>
      {photos.map((photo) => (
        <Pressable
          key={photo.id}
          style={[
            gridStyles.equalImage,
            { width: COL_WIDTH, height: COL_WIDTH },
          ]}
          onPress={() => {
            onPressPhoto?.(photo);
          }}
        >
          <Image
            source={{ uri: photo.image_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            transition={200}
            cachePolicy="disk"
          />
        </Pressable>
      ))}
    </View>
  );
}

// 패턴 C: 작은 사진 2개(왼쪽 세로) + 큰 사진(오른쪽)
function LargeRightRow({
  photos,
  onPressPhoto,
}: {
  photos: PhotoGridItem[];
  onPressPhoto?: (photo: PhotoGridItem) => void;
}) {
  const [small1, small2, large] = photos;

  return (
    <View style={gridStyles.row}>
      <View style={gridStyles.smallColumn}>
        <Pressable
          style={[
            gridStyles.smallImage,
            { width: COL_WIDTH, height: SMALL_HEIGHT },
          ]}
          onPress={() => onPressPhoto?.(small1)}
        >
          <Image
            source={{ uri: small1.image_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            transition={200}
            cachePolicy="disk"
          />
        </Pressable>
        <Pressable
          style={[
            gridStyles.smallImage,
            { width: COL_WIDTH, height: SMALL_HEIGHT },
          ]}
          onPress={() => onPressPhoto?.(small2)}
        >
          <Image
            source={{ uri: small2.image_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            transition={200}
            cachePolicy="disk"
          />
        </Pressable>
      </View>
      <Pressable
        style={[
          gridStyles.largeImage,
          { width: LARGE_WIDTH, height: LARGE_HEIGHT },
        ]}
        onPress={() => onPressPhoto?.(large)}
      >
        <Image
          source={{ uri: large.image_url }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          transition={200}
          cachePolicy="disk"
        />
      </Pressable>
    </View>
  );
}

/* ====== 메인 컴포넌트 ====== */
const PATTERN_ORDER: PatternType[] = [
  "large_left",
  "three_equal",
  "large_right",
  "three_equal",
];

const ALL_PATTERNS: PatternType[] = [
  "large_left",
  "three_equal",
  "large_right",
];

// 배열 섞기 (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 랜덤 패턴 선택
function getRandomPattern(): PatternType {
  return ALL_PATTERNS[Math.floor(Math.random() * ALL_PATTERNS.length)];
}

export default function PhotoGrid({
  photos,
  onPressPhoto,
  randomize = false,
  shuffleKey = 0,
}: PhotoGridProps) {
  // 사진을 3개씩 묶어서 패턴에 할당
  const rows = useMemo(() => {
    // 랜덤 모드면 사진 순서 섞기
    const photoList = randomize ? shuffleArray(photos) : photos;

    const result: { pattern: PatternType; photos: PhotoGridItem[] }[] = [];
    let patternIdx = 0;

    for (let i = 0; i + 2 < photoList.length; i += 3) {
      const chunk = photoList.slice(i, i + 3);
      if (chunk.length < 3) break;

      result.push({
        pattern: randomize
          ? getRandomPattern()
          : PATTERN_ORDER[patternIdx % PATTERN_ORDER.length],
        photos: chunk,
      });
      patternIdx++;
    }

    // 남은 사진이 있으면 마지막 행에 추가 (1~2개)
    const remaining = photoList.length % 3;
    if (remaining > 0) {
      const leftover = photoList.slice(photoList.length - remaining);
      result.push({
        pattern: "three_equal",
        photos: leftover,
      });
    }

    return result;
  }, [photos, randomize, shuffleKey]);

  if (photos.length === 0) return null;

  return (
    <View style={gridStyles.container}>
      {rows.map((row, index) => {
        const key = `row-${index}-${row.photos[0]?.id}`;

        switch (row.pattern) {
          case "large_left":
            return (
              <LargeLeftRow
                key={key}
                photos={row.photos}
                onPressPhoto={onPressPhoto}
              />
            );
          case "three_equal":
            return (
              <ThreeEqualRow
                key={key}
                photos={row.photos}
                onPressPhoto={onPressPhoto}
              />
            );
          case "large_right":
            return (
              <LargeRightRow
                key={key}
                photos={row.photos}
                onPressPhoto={onPressPhoto}
              />
            );
          default:
            return null;
        }
      })}
    </View>
  );
}

/* ====== 스타일 ====== */
const gridStyles = StyleSheet.create({
  container: {
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    gap: GAP,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: GAP,
  },
  smallColumn: {
    flexDirection: "column",
    gap: GAP,
  },
  largeImage: {
    borderRadius: 4,
    overflow: "hidden",
  },
  smallImage: {
    borderRadius: 4,
    overflow: "hidden",
  },
  equalImage: {
    borderRadius: 4,
    overflow: "hidden",
  },
});
