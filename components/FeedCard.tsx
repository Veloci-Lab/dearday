import React from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ReactionBar, { ReactionItem } from "./ReactionBar";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface FeedCardData {
  id: number;
  imageUrl: string;
  nickname: string;
  createdAt: string; // "18시 49분" 형식으로 변환된 문자열
  ownerProfileId: number;
  reactions?: ReactionItem[];
}

interface FeedCardProps {
  data: FeedCardData;
  onPress?: () => void;
  onPressNickname?: (data: FeedCardData) => void;
  onPressReaction?: (reaction: ReactionItem) => void;
  onPressMoreReactions?: () => void;
  onPressAddReaction?: () => void;
}

export default function FeedCard({
  data,
  onPress,
  onPressNickname,
  onPressReaction,
  onPressMoreReactions,
  onPressAddReaction,
}: FeedCardProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      {/* 이미지 영역 */}
      <Image source={{ uri: data.imageUrl }} style={styles.image} />

      {/* 정보 영역 */}
      <View style={styles.infoContainer}>
        {/* 왼쪽: 닉네임 + 시간 */}
        <View style={styles.userInfo}>
          <Pressable onPress={() => onPressNickname?.(data)} hitSlop={4}>
            <Text style={styles.nickname}>{data.nickname}</Text>
          </Pressable>
          <Text style={styles.createdAt}>{data.createdAt}</Text>
        </View>

        {/* 오른쪽: 리액션 바 */}
        <ReactionBar
          reactions={data.reactions ?? []}
          onPressReaction={onPressReaction}
          onPressMore={onPressMoreReactions}
          onPressAdd={onPressAddReaction}
        />
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
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    alignSelf: "center",
  },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    minHeight: 32,
  },
  userInfo: {
    flexDirection: "column",
    gap: 1,
    flexShrink: 0,
    marginRight: 36,
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
