import { supabase } from "@/utils/supabase";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import SearchFriendsScreen from "./SearchFriendsScreen";

/* ====== SVG 아이콘 ====== */
const BackArrow = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 12H5"
      stroke="#0D0D0D"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 19L5 12L12 5"
      stroke="#0D0D0D"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SearchIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
      stroke="#A0A0A0"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19 19L14.65 14.65"
      stroke="#A0A0A0"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MoreIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={6} r={1.5} fill="#0D0D0D" />
    <Circle cx={12} cy={12} r={1.5} fill="#0D0D0D" />
    <Circle cx={12} cy={18} r={1.5} fill="#0D0D0D" />
  </Svg>
);

/* ====== 타입 ====== */
interface FriendProfile {
  profile_id: number;
  nickname: string;
  avatar_url: string | null;
}

interface FriendRequest {
  follower_profile_id: number;
  followee_profile_id: number;
  profile: FriendProfile;
}

interface FriendRelation {
  follower_profile_id: number;
  followee_profile_id: number;
  profile: FriendProfile;
}

/* ====== 헤더 ====== */
function FriendsHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top + 18 }]}>
      <View style={styles.headerContent}>
        <Pressable style={styles.headerIconWrapper} onPress={onBack}>
          <BackArrow />
        </Pressable>
        <Text style={styles.headerTitle}>친구들</Text>
        <View style={styles.headerSpacer} />
      </View>
    </View>
  );
}

/* ====== 검색바 (Pressable) ====== */
function SearchBarButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.searchContainer} onPress={onPress}>
      <SearchIcon />
      <Text style={styles.searchPlaceholder}>친구 찾기</Text>
    </Pressable>
  );
}

/* ====== 내 아이디 ====== */
function MyIdCard({ myId }: { myId: string }) {
  return (
    <View style={styles.myIdContainer}>
      <Text style={styles.myIdLabel}>내 아이디</Text>
      <Text style={styles.myIdValue}>{myId}</Text>
    </View>
  );
}

/* ====== 친구 요청 아이템 ====== */
function FriendRequestItem({
  request,
  onAccept,
  onReject,
  isProcessing,
}: {
  request: FriendRequest;
  onAccept: (profileId: number) => void;
  onReject: (profileId: number) => void;
  isProcessing: boolean;
}) {
  return (
    <View style={styles.friendRequestItem}>
      <View style={styles.friendInfo}>
        <View style={styles.avatarPlaceholder}>
          {request.profile.avatar_url ? (
            <Image
              source={{ uri: request.profile.avatar_url }}
              style={styles.avatarImage}
            />
          ) : null}
        </View>
        <Text style={styles.friendName}>{request.profile.nickname}</Text>
      </View>
      <View style={styles.requestActions}>
        <Pressable
          style={[styles.acceptButton, isProcessing && { opacity: 0.5 }]}
          onPress={() => onAccept(request.follower_profile_id)}
          disabled={isProcessing}
        >
          <Text style={styles.acceptButtonText}>수락</Text>
        </Pressable>
        <Pressable
          style={[styles.rejectButton, isProcessing && { opacity: 0.5 }]}
          onPress={() => onReject(request.follower_profile_id)}
          disabled={isProcessing}
        >
          <Text style={styles.rejectButtonText}>거절</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ====== 친구 아이템 ====== */
function FriendItem({
  friend,
  onMore,
}: {
  friend: FriendRelation;
  onMore: (profileId: number) => void;
}) {
  return (
    <View style={styles.friendItem}>
      <View style={styles.friendInfo}>
        <View style={styles.avatarPlaceholder}>
          {friend.profile.avatar_url ? (
            <Image
              source={{ uri: friend.profile.avatar_url }}
              style={styles.avatarImage}
            />
          ) : null}
        </View>
        <Text style={styles.friendName}>{friend.profile.nickname}</Text>
      </View>
      <Pressable
        style={styles.moreButton}
        onPress={() => onMore(friend.profile.profile_id)}
      >
        <MoreIcon />
      </Pressable>
    </View>
  );
}

/* ====== 친구 화면 ====== */
export default function FriendsScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [myNickname, setMyNickname] = useState("");
  const [myProfileId, setMyProfileId] = useState<number | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<FriendRelation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [showSearch, setShowSearch] = useState(false);

  const fetchMyProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("profile_id, nickname")
      .eq("uid", user.id)
      .single();

    if (!error && data) {
      setMyNickname(data.nickname ?? "");
      setMyProfileId(data.profile_id);
      return data.profile_id as number;
    }
    return null;
  }, []);

  const fetchFriendRequests = useCallback(async (profileId: number) => {
    const { data, error } = await supabase
      .from("follows")
      .select(
        `
        follower_profile_id,
        followee_profile_id,
        status,
        profile:follower_profile_id (
          profile_id,
          nickname,
          avatar_url
        )
      `,
      )
      .eq("followee_profile_id", profileId)
      .eq("status", "pending");

    if (!error && data) {
      setFriendRequests(
        data.map((row: any) => ({
          follower_profile_id: row.follower_profile_id,
          followee_profile_id: row.followee_profile_id,
          profile: row.profile,
        })),
      );
    }
  }, []);

  const fetchFriends = useCallback(async (profileId: number) => {
    const { data: asFollower, error: err1 } = await supabase
      .from("follows")
      .select(
        `
        follower_profile_id,
        followee_profile_id,
        profile:followee_profile_id (
          profile_id,
          nickname,
          avatar_url
        )
      `,
      )
      .eq("follower_profile_id", profileId)
      .eq("status", "accepted");

    const { data: asFollowee, error: err2 } = await supabase
      .from("follows")
      .select(
        `
        follower_profile_id,
        followee_profile_id,
        profile:follower_profile_id (
          profile_id,
          nickname,
          avatar_url
        )
      `,
      )
      .eq("followee_profile_id", profileId)
      .eq("status", "accepted");

    const combined: FriendRelation[] = [];

    if (!err1 && asFollower) {
      asFollower.forEach((row: any) => {
        combined.push({
          follower_profile_id: row.follower_profile_id,
          followee_profile_id: row.followee_profile_id,
          profile: row.profile,
        });
      });
    }

    if (!err2 && asFollowee) {
      asFollowee.forEach((row: any) => {
        combined.push({
          follower_profile_id: row.follower_profile_id,
          followee_profile_id: row.followee_profile_id,
          profile: row.profile,
        });
      });
    }

    setFriends(combined);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const profileId = await fetchMyProfile();
    if (profileId) {
      await Promise.all([
        fetchFriendRequests(profileId),
        fetchFriends(profileId),
      ]);
    }
    setIsLoading(false);
  }, [fetchMyProfile, fetchFriendRequests, fetchFriends]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBackFromSearch = () => {
    setShowSearch(false);
    if (myProfileId) {
      fetchFriendRequests(myProfileId);
      fetchFriends(myProfileId);
    }
  };

  const handleAccept = async (followerProfileId: number) => {
    if (!myProfileId) return;

    setProcessingIds((prev) => new Set(prev).add(followerProfileId));

    const { error } = await supabase
      .from("follows")
      .update({ status: "accepted" })
      .eq("follower_profile_id", followerProfileId)
      .eq("followee_profile_id", myProfileId);

    if (error) {
      Alert.alert("오류", "친구 요청 수락에 실패했어요.");
    } else {
      setFriendRequests((prev) =>
        prev.filter((r) => r.follower_profile_id !== followerProfileId),
      );
      await fetchFriends(myProfileId);
    }

    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(followerProfileId);
      return next;
    });
  };

  const handleReject = async (followerProfileId: number) => {
    if (!myProfileId) return;

    setProcessingIds((prev) => new Set(prev).add(followerProfileId));

    const { error } = await supabase
      .from("follows")
      .update({ status: "rejected" })
      .eq("follower_profile_id", followerProfileId)
      .eq("followee_profile_id", myProfileId);

    if (error) {
      Alert.alert("오류", "친구 요청 거절에 실패했어요.");
    } else {
      setFriendRequests((prev) =>
        prev.filter((r) => r.follower_profile_id !== followerProfileId),
      );
    }

    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(followerProfileId);
      return next;
    });
  };

  const handleMore = (profileId: number) => {
    Alert.alert("친구 관리", "어떤 작업을 하시겠어요?", [
      {
        text: "친구 삭제",
        style: "destructive",
        onPress: () => handleRemoveFriend(profileId),
      },
      { text: "취소", style: "cancel" },
    ]);
  };

  const handleRemoveFriend = async (targetProfileId: number) => {
    if (!myProfileId) return;

    const { error: err1 } = await supabase
      .from("follows")
      .delete()
      .eq("follower_profile_id", myProfileId)
      .eq("followee_profile_id", targetProfileId);

    const { error: err2 } = await supabase
      .from("follows")
      .delete()
      .eq("follower_profile_id", targetProfileId)
      .eq("followee_profile_id", myProfileId);

    if (!err1 && !err2) {
      setFriends((prev) =>
        prev.filter((f) => f.profile.profile_id !== targetProfileId),
      );
    } else {
      Alert.alert("오류", "친구 삭제에 실패했어요.");
    }
  };

  const TAB_BAR_HEIGHT = 72;
  const TAB_BAR_BOTTOM_OFFSET = Math.max(insets.bottom, 8) + 10;
  const paddingBottom = TAB_BAR_BOTTOM_OFFSET + TAB_BAR_HEIGHT;

  // 검색 화면
  if (showSearch) {
    return <SearchFriendsScreen onBack={handleBackFromSearch} />;
  }

  const renderHeader = () => (
    <View>
      <SearchBarButton onPress={() => setShowSearch(true)} />
      <MyIdCard myId={myNickname} />

      {friendRequests.length > 0 && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>친구 요청</Text>
            <Text style={styles.sectionCount}>{friendRequests.length}</Text>
          </View>
          {friendRequests.map((request) => (
            <FriendRequestItem
              key={request.follower_profile_id}
              request={request}
              onAccept={handleAccept}
              onReject={handleReject}
              isProcessing={processingIds.has(request.follower_profile_id)}
            />
          ))}
        </View>
      )}

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>내 친구들</Text>
          <Text style={styles.sectionCount}>{friends.length}</Text>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <FriendsHeader onBack={onBack} />
        <View style={styles.headerDivider} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4190FF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FriendsHeader onBack={onBack} />

      {/* 헤더 아래 구분선 */}
      <View style={styles.headerDivider} />

      <FlatList
        data={friends}
        keyExtractor={(item) => String(item.profile.profile_id)}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <FriendItem friend={item} onMore={handleMore} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>아직 친구가 없어요</Text>
          </View>
        }
      />
    </View>
  );
}

/* ====== 스타일 ====== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* 헤더 */
  headerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FEFEFE",
  },
  headerContent: {
    width: 342,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.51,
    color: "#0D0D0D",
    textAlign: "center",
  },
  headerIconWrapper: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 24,
  },
  headerDivider: {
    height: 1,
    backgroundColor: "#F2F2F2",
  },

  /* 검색바 (Pressable) */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    gap: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: "Pretendard",
    fontSize: 16,
    lineHeight: 22,
    color: "#A0A0A0",
  },

  /* 내 아이디 */
  myIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 24,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  myIdLabel: {
    fontFamily: "Pretendard",
    fontSize: 15,
    lineHeight: 20,
    color: "#626262",
  },
  myIdValue: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15,
    lineHeight: 20,
    color: "#0D0D0D",
  },

  /* 섹션 */
  sectionContainer: {
    marginTop: 28,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 17,
    lineHeight: 22,
    color: "#0D0D0D",
  },
  sectionCount: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 17,
    lineHeight: 22,
    color: "#4190FF",
  },

  /* 친구 요청 아이템 */
  friendRequestItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#4190FF",
  },
  acceptButtonText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    lineHeight: 18,
    color: "#FFFFFF",
  },
  rejectButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  rejectButtonText: {
    fontFamily: "Pretendard",
    fontSize: 14,
    lineHeight: 18,
    color: "#626262",
  },

  /* 친구 아이템 */
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8E8E8",
    overflow: "hidden",
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  friendName: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 16,
    lineHeight: 22,
    color: "#0D0D0D",
  },
  moreButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  /* 빈 상태 */
  emptyContainer: {
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: {
    fontFamily: "Pretendard",
    fontSize: 15,
    lineHeight: 20,
    color: "#A0A0A0",
  },
});
