import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export interface FeedCardData {
  id: number;
  imageUrl: string;
  nickname: string;
  createdAt: string; // "18시 49분" 형식으로 변환된 문자열
}

interface FeedCardProps {
  data: FeedCardData;
  onPress?: () => void;
}

export default function FeedCard({ data, onPress }: FeedCardProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      {/* 이미지 영역 */}
      <Image source={{ uri: data.imageUrl }} style={styles.image} />

      {/* 정보 영역 */}
      <View style={styles.infoContainer}>
        <View style={styles.userInfo}>
          <Text style={styles.nickname}>{data.nickname}</Text>
          <Text style={styles.createdAt}>{data.createdAt}</Text>
        </View>
        {/* 이모지 영역은 추후 추가 */}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 9,
  },
  image: {
    width: 390,
    height: 390,
    alignSelf: "center",
  },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 13,
  },
  userInfo: {
    flexDirection: "column",
    gap: 1,
  },
  nickname: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18.9,
    letterSpacing: -0.42,
    color: "#333333",
  },
  createdAt: {
    fontFamily: "Pretendard",
    fontSize: 12,
    fontWeight: "400",
    letterSpacing: -0.36,
    color: "#C3C3C3",
  },
});
