import { Image } from "expo-image";
import React from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import ReactionBar, {
  ReactionItem,
  ReactionLongPressPayload,
} from "./ReactionBar";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface FeedCardData {
  id: string;
  imageUrl: string;
  nickname: string;
  createdAt: string;
  ownerProfileId: number;
  reactions?: ReactionItem[];
  answerReactionsRaw?: any[];
  isEdited?: boolean;
}

interface FeedCardProps {
  data: FeedCardData;
  reactions: ReactionItem[]; // ← 별도 prop으로 받기
  answerReactionsRaw?: any[];
  onPress?: () => void;
  onPressNickname?: (data: FeedCardData) => void;
  onPressReaction?: (reaction: ReactionItem) => void;
  onPressMoreReactions?: () => void;
  onPressAddReaction?: () => void;
  onLongPressReaction?: (payload: ReactionLongPressPayload) => void;
}

export default function FeedCard({
  data,
  reactions,
  answerReactionsRaw,
  onPress,
  onPressNickname,
  onPressReaction,
  onPressMoreReactions,
  onPressAddReaction,
  onLongPressReaction,
}: FeedCardProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Image
        source={{ uri: data.imageUrl }}
        style={styles.image}
        cachePolicy="disk"
      />
      {data.isEdited && (
        <View style={styles.editedBadge}>
          <Text style={styles.editedBadgeText}>수정됨</Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <View style={styles.userInfo}>
          <Pressable onPress={() => onPressNickname?.(data)} hitSlop={4}>
            <Text style={styles.nickname}>{data.nickname}</Text>
          </Pressable>
          <Text style={styles.createdAt}>{data.createdAt}</Text>
        </View>

        <ReactionBar
          answerId={data.id}
          reactions={reactions}
          onPressReaction={onPressReaction}
          onPressMore={onPressMoreReactions}
          onPressAdd={onPressAddReaction}
          onLongPress={onLongPressReaction} // ← 전달
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
  editedBadge: {
    position: "absolute",
    top: 15,
    right: 13,
    backgroundColor: "rgba(0, 0, 0, 0.30)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  editedBadgeText: {
    fontFamily: "Pretendard",
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
});
