import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { EmojiAddIcon } from "./icons/EmojiAddIcon";

/* ====== 타입 ====== */
export interface ReactionItem {
  emojiId: number;
  emoji: string; // 이모지 문자 또는 이미지 키
  count: number;
}

interface ReactionBarProps {
  reactions: ReactionItem[];
  onPressReaction?: (reaction: ReactionItem) => void;
  onPressMore?: () => void;
  onPressAdd?: () => void;
  maxVisible?: number; // 최대 표시 개수 (기본 3)
}

/* ====== 개별 리액션 칩 ====== */
function ReactionChip({
  reaction,
  onPress,
}: {
  reaction: ReactionItem;
  onPress?: () => void;
}) {
  const displayCount = reaction.count > 99 ? "99+" : String(reaction.count);

  return (
    <Pressable style={styles.reactionChip} onPress={onPress}>
      <Text style={styles.emoji}>{reaction.emoji}</Text>
      <Text style={styles.count}>{displayCount}</Text>
    </Pressable>
  );
}

/* ====== 더보기 버튼 ====== */
function MoreButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable style={styles.moreButton} onPress={onPress}>
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
  reactions,
  onPressReaction,
  onPressMore,
  onPressAdd,
  maxVisible = 3,
}: ReactionBarProps) {
  const hasMore = reactions.length > maxVisible;
  const visibleReactions = hasMore ? reactions.slice(0, maxVisible) : reactions;

  return (
    <View style={styles.container}>
      {/* 더보기 버튼 (4개 이상일 때) */}
      {hasMore && <MoreButton onPress={onPressMore} />}

      {/* 리액션 칩들 */}
      {visibleReactions.map((reaction) => (
        <ReactionChip
          key={reaction.emojiId}
          reaction={reaction}
          onPress={() => onPressReaction?.(reaction)}
        />
      ))}

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

  /* 리액션 칩 */
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

  /* 더보기 버튼 */
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

  /* 추가 버튼 */
  addButton: {
    width: 32,
    height: 32,
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#F2F2F2",
  },
});
