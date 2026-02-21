import { commonHeaderOptions } from "@/styles/common";
import { supabase } from "@/utils/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { router, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const DDSleep_URL = `${SUPABASE_URL}/storage/v1/object/public/emoji/sleep.png`;

/* ====== SVG 아이콘 ====== */
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
    <Circle cx={12} cy={5} r={1.5} fill="#0D0D0D" />
    <Circle cx={12} cy={12} r={1.5} fill="#0D0D0D" />
    <Circle cx={12} cy={19} r={1.5} fill="#0D0D0D" />
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
  isNew?: boolean;
}

const SEEN_FRIENDS_KEY = "@seen_friend_ids";

/* ====== 확인 팝업 ====== */
function ConfirmPopup({
  visible,
  profile,
  title,
  description,
  confirmText,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  profile: FriendProfile | null;
  title: string;
  description: string;
  confirmText: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!profile) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.popupOverlay} onPress={onCancel}>
        <Pressable style={styles.popupContainer} onPress={() => {}}>
          {/* 프로필 카드 */}
          <View style={styles.popupProfileCard}>
            <View style={styles.popupAvatar}>
              {profile.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.popupAvatarImage}
                  cachePolicy="disk"
                />
              ) : null}
            </View>
            <Text style={styles.popupProfileName}>{profile.nickname}</Text>
          </View>

          {/* 텍스트 영역 */}
          <View style={styles.popupTextArea}>
            <Text style={styles.popupTitle}>{title}</Text>
            <Text style={styles.popupDescription}>{description}</Text>
          </View>

          {/* 버튼 영역 */}
          <View style={styles.popupButtonRow}>
            <Pressable style={styles.popupCancelButton} onPress={onCancel}>
              <Text style={styles.popupCancelButtonText}>취소</Text>
            </Pressable>
            <Pressable style={styles.popupConfirmButton} onPress={onConfirm}>
              <Text style={styles.popupConfirmButtonText}>{confirmText}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ====== 검색바 (Pressable) ====== */
function SearchBarButton() {
  return (
    <Pressable
      style={styles.searchContainer}
      onPress={() => router.push("/social/search-friends")}
    >
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
  onReject: (request: FriendRequest) => void;
  isProcessing: boolean;
}) {
  return (
    <View style={styles.listItem}>
      <View style={styles.profileInfo}>
        <View style={styles.avatarPlaceholder}>
          {request.profile.avatar_url ? (
            <Image
              source={{ uri: request.profile.avatar_url }}
              style={styles.avatarImage}
              cachePolicy="disk"
            />
          ) : null}
        </View>
        <Text style={styles.profileName}>{request.profile.nickname}</Text>
      </View>
      <View style={styles.requestActions}>
        <Pressable
          style={[styles.acceptButton, isProcessing && { opacity: 0.5 }]}
          onPress={() => onAccept(request.follower_profile_id)}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>수락</Text>
        </Pressable>
        <Pressable
          style={[styles.rejectButton, isProcessing && { opacity: 0.5 }]}
          onPress={() => onReject(request)}
          disabled={isProcessing}
        >
          <Text style={styles.rejectButtonText}>거절</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ====== 새 친구 배지 ====== */
const NewBadge = () => (
  <View style={styles.newBadge}>
    <Text style={styles.newBadgeText}>N</Text>
  </View>
);

/* ====== 친구 아이템 (더보기 아이콘) ====== */
function FriendItem({
  friend,
  onMore,
  onPress,
}: {
  friend: FriendRelation;
  onMore: (friend: FriendRelation) => void;
  onPress: (friend: FriendRelation) => void;
}) {
  return (
    <Pressable style={styles.listItem} onPress={() => onPress(friend)}>
      <View style={styles.profileInfo}>
        <View style={styles.avatarPlaceholder}>
          {friend.profile.avatar_url ? (
            <Image
              source={{ uri: friend.profile.avatar_url }}
              style={styles.avatarImage}
            />
          ) : null}
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.profileName}>{friend.profile.nickname}</Text>
          {friend.isNew && <NewBadge />}
        </View>
      </View>
      <Pressable
        style={styles.moreButton}
        onPress={() => onMore(friend)}
        hitSlop={8}
      >
        <MoreIcon />
      </Pressable>
    </Pressable>
  );
}

/* ====== 친구 화면 ====== */
export default function FriendsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [myNickname, setMyNickname] = useState("");
  const [myProfileId, setMyProfileId] = useState<number | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<FriendRelation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  // 팝업 상태
  const [rejectPopupVisible, setRejectPopupVisible] = useState(false);
  const [deletePopupVisible, setDeletePopupVisible] = useState(false);
  const [targetRequest, setTargetRequest] = useState<FriendRequest | null>(
    null,
  );
  const [targetFriend, setTargetFriend] = useState<FriendRelation | null>(null);

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
    // 저장된 "본" 친구 ID 목록 가져오기
    let seenFriendIds: Set<number> = new Set();
    try {
      const stored = await AsyncStorage.getItem(SEEN_FRIENDS_KEY);
      if (stored) {
        seenFriendIds = new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.error("AsyncStorage 읽기 오류:", e);
    }

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
    const newFriendIds: number[] = [];

    // 내가 팔로우한 친구 (내가 요청을 보낸 경우 - 새 친구 표시 안함)
    if (!err1 && asFollower) {
      asFollower.forEach((row: any) => {
        combined.push({
          follower_profile_id: row.follower_profile_id,
          followee_profile_id: row.followee_profile_id,
          profile: row.profile,
          isNew: false,
        });
      });
    }

    // 나를 팔로우한 친구 (상대가 요청을 보낸 경우 - 공개계정에서 새 친구 표시)
    if (!err2 && asFollowee) {
      asFollowee.forEach((row: any) => {
        const friendProfileId = row.follower_profile_id;
        const isNew = !seenFriendIds.has(friendProfileId);
        if (isNew) {
          newFriendIds.push(friendProfileId);
        }
        combined.push({
          follower_profile_id: row.follower_profile_id,
          followee_profile_id: row.followee_profile_id,
          profile: row.profile,
          isNew,
        });
      });
    }

    // 새 친구를 맨 위로 정렬
    combined.sort((a, b) => {
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      return 0;
    });

    setFriends(combined);

    // 새 친구를 "본" 목록에 추가
    if (newFriendIds.length > 0) {
      try {
        const updatedSeenIds = [...seenFriendIds, ...newFriendIds];
        await AsyncStorage.setItem(
          SEEN_FRIENDS_KEY,
          JSON.stringify(updatedSeenIds),
        );
      } catch (e) {
        console.error("AsyncStorage 쓰기 오류:", e);
      }
    }
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

  useEffect(() => {
    navigation.setOptions({
      ...commonHeaderOptions,
      headerShown: true,
      headerShadowVisible: true,
      headerTitle: () => <Text style={styles.headerTitle}>친구들</Text>,
      headerLeft: () => (
        <Pressable onPress={() => router.back()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12.5659 19.4344C12.8783 19.7468 12.8783 20.2533 12.5659 20.5657C12.2535 20.8782 11.7469 20.8782 11.4345 20.5657L3.43451 12.5657C3.12209 12.2533 3.12209 11.7468 3.43451 11.4344L11.4345 3.43436C11.7469 3.12194 12.2535 3.12194 12.5659 3.43436C12.8783 3.74678 12.8783 4.25331 12.5659 4.56573L5.93157 11.2L19.9998 11.2C20.4416 11.2 20.7998 11.5582 20.7998 12C20.7998 12.4419 20.4416 12.8 19.9998 12.8L5.93157 12.8L12.5659 19.4344Z"
              fill="#0D0D0D"
            />
          </Svg>
        </Pressable>
      ),
    });
  }, [navigation]);

  /* ── 수락 ── */
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

  /* ── 거절 버튼 → 팝업 열기 ── */
  const handleRejectPress = (request: FriendRequest) => {
    setTargetRequest(request);
    setRejectPopupVisible(true);
  };

  /* ── 거절 확인 ── */
  const handleConfirmReject = async () => {
    if (!myProfileId || !targetRequest) return;

    const followerProfileId = targetRequest.follower_profile_id;
    setRejectPopupVisible(false);
    setTargetRequest(null);

    setProcessingIds((prev) => new Set(prev).add(followerProfileId));

    const { error } = await supabase
      .from("follows")
      .delete()
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

  /* ── 더보기 → OS 기본 액션시트 표시 ── */
  const handleMore = (friend: FriendRelation) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["취소", "삭제하기"],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setTargetFriend(friend);
            setDeletePopupVisible(true);
          }
        },
      );
    } else {
      // Android
      Alert.alert("", "", [
        { text: "취소", style: "cancel" },
        {
          text: "삭제하기",
          style: "destructive",
          onPress: () => {
            setTargetFriend(friend);
            setDeletePopupVisible(true);
          },
        },
      ]);
    }
  };

  /* ── 삭제 확인 ── */
  const handleConfirmDelete = async () => {
    if (!myProfileId || !targetFriend) return;

    const targetProfileId = targetFriend.profile.profile_id;
    setDeletePopupVisible(false);
    setTargetFriend(null);

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

      // "본" 친구 목록에서도 제거 (나중에 다시 추가하면 N 표시됨)
      try {
        const stored = await AsyncStorage.getItem(SEEN_FRIENDS_KEY);
        if (stored) {
          const seenIds: number[] = JSON.parse(stored);
          const updatedIds = seenIds.filter((id) => id !== targetProfileId);
          await AsyncStorage.setItem(
            SEEN_FRIENDS_KEY,
            JSON.stringify(updatedIds),
          );
        }
      } catch (e) {
        console.error("AsyncStorage 업데이트 오류:", e);
      }
    } else {
      Alert.alert("오류", "친구 삭제에 실패했어요.");
    }
  };

  const renderHeader = () => (
    <View>
      <SearchBarButton />
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
              onReject={handleRejectPress}
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4190FF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={friends}
        keyExtractor={(item) => String(item.profile.profile_id)}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 20),
          alignSelf: "center",
          width: 342,
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <FriendItem
            friend={item}
            onMore={handleMore}
            onPress={(friend) => {
              router.push({
                pathname: "/social/user/[id]",
                params: {
                  id: String(friend.profile.profile_id),
                  nickname: friend.profile.nickname,
                },
              });
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>아직 친구가 없어요.</Text>
            <Image
              source={{ uri: DDSleep_URL }}
              style={styles.emptyImage}
              cachePolicy="disk"
            />
          </View>
        }
      />

      {/* 친구 요청 거절 팝업 */}
      <ConfirmPopup
        visible={rejectPopupVisible}
        profile={targetRequest?.profile ?? null}
        title="친구 요청을 거절"
        description={`${targetRequest?.profile.nickname ?? ""}님의 친구 요청을 거절하시겠어요?`}
        confirmText="거절하기"
        onCancel={() => {
          setRejectPopupVisible(false);
          setTargetRequest(null);
        }}
        onConfirm={handleConfirmReject}
      />

      {/* 친구 삭제 팝업 */}
      <ConfirmPopup
        visible={deletePopupVisible}
        profile={targetFriend?.profile ?? null}
        title="친구 삭제"
        description={`${targetFriend?.profile.nickname ?? ""}님을 친구에서 삭제하시겠어요?`}
        confirmText="삭제하기"
        onCancel={() => {
          setDeletePopupVisible(false);
          setTargetFriend(null);
        }}
        onConfirm={handleConfirmDelete}
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
  headerTitle: {
    fontSize: 17,
    fontFamily: "Pretendard-Bold",
    fontWeight: "400",
    color: "#0D0D0D",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* 검색바 */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    paddingVertical: 10,
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

  /* 공통 리스트 아이템 */
  listItem: {
    width: 342,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarPlaceholder: {
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
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profileName: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 16,
    lineHeight: 23,
    color: "#0D0D0D",
  },
  newBadge: {
    width: 11,
    height: 11,
    borderRadius: 3,
    backgroundColor: "#FF234F",
    justifyContent: "center",
    alignItems: "center",
  },
  newBadgeText: {
    fontFamily: "Pretendard-Bold",
    fontSize: 8,
    color: "#FFFFFF",
  },

  /* 수락/거절 버튼 */
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#5B8DEF",
    justifyContent: "center",
    alignItems: "center",
  },
  rejectButton: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontFamily: "Pretendard",
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: -0.39,
    color: "#FFFFFF",
    textAlign: "center",
  },
  rejectButtonText: {
    fontFamily: "Pretendard",
    fontSize: 13,
    fontWeight: "400",
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

  /* 빈 상태 */
  emptyContainer: {
    alignItems: "center",
    paddingTop: 110,
    gap: 26,
  },
  emptyText: {
    fontFamily: "Pretendard",
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 20,
    letterSpacing: -0.51,
    color: "#626262",
    textAlign: "center",
  },
  emptyImage: {
    width: 118,
    height: 118,
  },

  /* ====== 팝업 ====== */
  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  popupContainer: {
    width: 315,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    alignItems: "center",
    gap: 15,
  },

  /* 프로필 카드 */
  popupProfileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    alignSelf: "stretch",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  popupAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8E8E8",
    overflow: "hidden",
  },
  popupAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  popupProfileName: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15,
    lineHeight: 20,
    color: "#0D0D0D",
  },

  /* 텍스트 영역 */
  popupTextArea: {
    alignSelf: "stretch",
    gap: 5,
  },
  popupTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: -0.51,
    color: "#0D0D0D",
  },
  popupDescription: {
    fontFamily: "Pretendard",
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.39,
    color: "#929292",
  },

  /* 버튼 영역 */
  popupButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  popupCancelButton: {
    width: 134,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#0D0D0D",
  },
  popupCancelButtonText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15,
    lineHeight: 20,
    color: "#0D0D0D",
  },
  popupConfirmButton: {
    width: 134,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#F4A49D",
  },
  popupConfirmButtonText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15,
    lineHeight: 20,
    color: "#FFFFFF",
  },
});