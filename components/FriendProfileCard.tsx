import React from "react";
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

/* ====== 타입 ====== */
export interface FriendProfile {
  profile_id: number;
  nickname: string;
  avatar_url: string | null;
  bio?: string | null;
}

// follows 테이블 구조 기반 타입
export interface FollowRelation {
  follower_profile_id: number;
  followee_profile_id: number;
  status: "pending" | "accepted";
}

interface FriendProfileCardProps {
  profile: FriendProfile;
  myProfileId: number | null;
  // 내가 보낸 요청 (follower = 나)
  sentFollow?: FollowRelation | null;
  // 내가 받은 요청 (followee = 나)
  receivedFollow?: FollowRelation | null;
  // 상대방이 공개 계정인지 여부
  isTargetPublic?: boolean;
  isProcessing?: boolean;
  onSendRequest?: () => void;
  onCancelRequest?: () => void;
  onAcceptRequest?: () => void;
  onRejectRequest?: () => void;
  onDeleteFriend?: () => void;
}

/* ====== SVG 아이콘 ====== */
const MoreIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={5} r={1.5} fill="#0D0D0D" />
    <Circle cx={12} cy={12} r={1.5} fill="#0D0D0D" />
    <Circle cx={12} cy={19} r={1.5} fill="#0D0D0D" />
  </Svg>
);

export default function FriendProfileCard({
  profile,
  myProfileId,
  sentFollow,
  receivedFollow,
  isTargetPublic = true,
  isProcessing = false,
  onSendRequest,
  onCancelRequest,
  onAcceptRequest,
  onRejectRequest,
  onDeleteFriend,
}: FriendProfileCardProps) {
  // follows 테이블 데이터 기반으로 관계 상태 판단
  const isFriend =
    sentFollow?.status === "accepted" || receivedFollow?.status === "accepted";
  // 비공개 계정에만 pending 상태 표시 (공개 계정은 바로 친구가 됨)
  const hasSentRequest = !isTargetPublic && sentFollow?.status === "pending";
  const hasReceivedRequest = receivedFollow?.status === "pending";

  const handleMorePress = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["취소", "삭제하기"],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            onDeleteFriend?.();
          }
        },
      );
    } else {
      Alert.alert("", "", [
        { text: "취소", style: "cancel" },
        {
          text: "삭제하기",
          style: "destructive",
          onPress: onDeleteFriend,
        },
      ]);
    }
  };

  const renderActionButtons = () => {
    // 이미 친구인 경우
    if (isFriend) {
      return (
        <Pressable
          style={styles.moreButton}
          onPress={handleMorePress}
          hitSlop={8}
        >
          <MoreIcon />
        </Pressable>
      );
    }

    // 내가 친구 요청을 보낸 경우
    if (hasSentRequest) {
      return (
        <Pressable
          style={[styles.disabledButton, isProcessing && styles.disabled]}
          onPress={onCancelRequest}
          disabled={isProcessing}
        >
          <Text style={styles.disabledButtonText}>친구 요청됨</Text>
        </Pressable>
      );
    }

    // 상대가 나에게 친구 요청을 보낸 경우
    if (hasReceivedRequest) {
      return (
        <View style={styles.requestActions}>
          <Pressable
            style={[styles.acceptButton, isProcessing && styles.disabled]}
            onPress={onAcceptRequest}
            disabled={isProcessing}
          >
            <Text style={styles.acceptButtonText}>수락</Text>
          </Pressable>
          <Pressable
            style={[styles.rejectButton, isProcessing && styles.disabled]}
            onPress={onRejectRequest}
            disabled={isProcessing}
          >
            <Text style={styles.rejectButtonText}>거절</Text>
          </Pressable>
        </View>
      );
    }

    // 아무 관계도 없는 경우
    return (
      <Pressable
        style={[styles.primaryButton, isProcessing && styles.disabled]}
        onPress={onSendRequest}
        disabled={isProcessing}
      >
        <Text style={styles.primaryButtonText}>친구 요청</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {profile.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatarImage}
            />
          ) : null}
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.nickname}>{profile.nickname}</Text>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>
      </View>
      <View style={styles.actionContainer}>{renderActionButtons()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 12,
    marginHorizontal: 13,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8E8E8",
    overflow: "hidden",
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  infoContainer: {
    flex: 1,
    gap: 2,
  },
  nickname: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15,
    lineHeight: 20,
    color: "#0D0D0D",
  },
  bio: {
    fontFamily: "Pretendard",
    fontSize: 13,
    lineHeight: 18,
    color: "#929292",
  },
  actionContainer: {
    flexShrink: 0,
  },

  /* 친구 요청 버튼 */
  primaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#5B8DEF",
  },
  primaryButtonText: {
    fontFamily: "Pretendard-Medium",
    fontSize: 13,
    letterSpacing: -0.39,
    color: "#FFFFFF",
    textAlign: "center",
  },

  /* 친구 요청됨 버튼 */
  disabledButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#C2C2C2",
  },
  disabledButtonText: {
    fontFamily: "Pretendard-Medium",
    fontSize: 13,
    letterSpacing: -0.39,
    color: "#FFFFFF",
    textAlign: "center",
  },

  /* 수락/거절 버튼 */
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#5B8DEF",
  },
  acceptButtonText: {
    fontFamily: "Pretendard-Medium",
    fontSize: 13,
    letterSpacing: -0.39,
    color: "#FFFFFF",
    textAlign: "center",
  },
  rejectButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  rejectButtonText: {
    fontFamily: "Pretendard-Medium",
    fontSize: 13,
    letterSpacing: -0.39,
    color: "#626262",
    textAlign: "center",
  },

  /* 더보기 아이콘 */
  moreButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  disabled: {
    opacity: 0.5,
  },
});
