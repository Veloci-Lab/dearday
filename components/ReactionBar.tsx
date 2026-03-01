import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { EmojiAddIcon } from "./icons/EmojiAddIcon";

/* ====== 타입 ====== */
export interface ReactionItem {
  emojiId: number;
  emoji: string;
  count: number;
}

export interface ReactionLongPressPayload {
  answerId: string;
  initialTab: string;
}

interface ReactionBarProps {
  answerId: string;
  reactions: ReactionItem[];
  myReactedEmojiIds?: number[]; // 내가 누른 이모지 ID 목록
  onPressReaction?: (reaction: ReactionItem, isMyReaction: boolean) => void;
  onPressMore?: () => void;
  onPressAdd?: () => void;
  onLongPress?: (payload: ReactionLongPressPayload) => void; // ← Sheet 열기를 부모로 위임
  maxVisible?: number;
}

/* ====== 개별 리액션 칩 ====== */
function ReactionChip({
  reaction,
  isMyReaction,
  onPress,
  onLongPress,
}: {
  reaction: ReactionItem;
  isMyReaction?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const isImage =
    typeof reaction.emoji === "string" &&
    (reaction.emoji.endsWith(".png") ||
      reaction.emoji.endsWith(".jpg") ||
      reaction.emoji.endsWith(".jpeg") ||
      reaction.emoji.startsWith("http"));

  return (
    <Pressable
      style={[
        styles.reactionChip,
        isMyReaction && styles.reactionChipHighlighted,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {isImage ? (
        <Image
          source={
            reaction.emoji.startsWith("http")
              ? { uri: reaction.emoji }
              : {
                  uri: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/emoji/${reaction.emoji}`,
                }
          }
          style={styles.emojiImage}
          resizeMode="contain"
          cachePolicy="disk"
        />
      ) : (
        <Text style={styles.emoji}>{reaction.emoji}</Text>
      )}
      <Text style={[styles.count, isMyReaction && styles.countHighlighted]}>
        {reaction.count}
      </Text>
    </Pressable>
  );
}

/* ====== 더보기 버튼 ====== */
function MoreButton({
  onPress,
  onLongPress,
}: {
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.moreButton}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Text style={styles.moreText}>···</Text>
    </Pressable>
  );
}

/* ====== 이모지 추가 버튼 ====== */
function AddButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable style={styles.addButton} onPress={onPress}>
      <EmojiAddIcon />
    </Pressable>
  );
}

/* ====== 메인 컴포넌트 ====== */
export default function ReactionBar({
  answerId,
  reactions,
  myReactedEmojiIds = [],
  onPressReaction,
  onPressMore,
  onPressAdd,
  onLongPress,
  maxVisible = 3,
}: ReactionBarProps) {
  const hasMore = reactions.length > maxVisible;
  const visibleReactions = hasMore ? reactions.slice(0, maxVisible) : reactions;

  return (
    <View style={styles.container}>
      {/* 더보기 버튼 */}
      {hasMore && (
        <MoreButton
          onPress={onPressMore}
          onLongPress={() => onLongPress?.({ answerId, initialTab: "all" })}
        />
      )}

      {/* 리액션 칩들 */}
      {visibleReactions.map((reaction) => {
        const isMyReaction = myReactedEmojiIds.includes(reaction.emojiId);
        return (
          <ReactionChip
            key={reaction.emojiId}
            reaction={reaction}
            isMyReaction={isMyReaction}
            onPress={() => onPressReaction?.(reaction, isMyReaction)}
            onLongPress={() =>
              onLongPress?.({ answerId, initialTab: String(reaction.emojiId) })
            }
          />
        );
      })}

      {/* 이모지 추가 버튼 */}
      <AddButton onPress={onPressAdd} />
    </View>
  );
}

/* ====== 스타일 ====== */
const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    gap: 5,
  },
  reactionChip: {
    flexDirection: "row",
    height: 32,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 6,
    paddingRight: 8,
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    backgroundColor: "#F2F2F2",
  },
  reactionChipHighlighted: {
    backgroundColor: "#E3EDFF",
    borderWidth: 1,
    borderColor: "#5B8DEF",
  },
  emoji: {
    fontSize: 18,
  },
  count: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18.9,
    letterSpacing: -0.42,
    color: "#0D0D0D",
    textAlign: "center",
  },
  countHighlighted: {
    color: "#5B8DEF",
  },
  moreButton: {
    flexDirection: "row",
    height: 32,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    backgroundColor: "#F2F2F2",
  },
  moreText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18.9,
    letterSpacing: -0.42,
    color: "#C3C3C3",
    textAlign: "center",
  },
  addButton: {
    width: 32,
    height: 32,
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#F2F2F2",
  },
  emojiImage: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
});
