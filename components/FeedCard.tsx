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
  avatarUrl?: string | null;
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
  myReactedEmojiIds?: number[]; // 내가 누른 이모지 ID 목록
  onPress?: () => void;
  onPressNickname?: (data: FeedCardData) => void;
  onPressReaction?: (reaction: ReactionItem, isMyReaction: boolean) => void;
  onPressMoreReactions?: () => void;
  onPressAddReaction?: () => void;
  onLongPressReaction?: (payload: ReactionLongPressPayload) => void;
}

export default function FeedCard({
  data,
  reactions,
  answerReactionsRaw,
  myReactedEmojiIds = [],
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
          <Pressable
            style={styles.userProfile}
            onPress={() => onPressNickname?.(data)}
            hitSlop={4}
          >
            <View style={styles.avatarContainer}>
              {data.avatarUrl ? (
                <Image
                  source={{ uri: data.avatarUrl }}
                  style={styles.avatarImage}
                  cachePolicy="disk"
                />
              ) : null}
            </View>
            <View style={styles.userTextInfo}>
              <Text style={styles.nickname}>{data.nickname}</Text>
              <Text style={styles.createdAt}>{data.createdAt}</Text>
            </View>
          </Pressable>
        </View>

        <ReactionBar
          answerId={data.id}
          reactions={reactions}
          myReactedEmojiIds={myReactedEmojiIds}
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
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    marginRight: 36,
  },
  userProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8E8E8",
    overflow: "hidden",
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  userTextInfo: {
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
