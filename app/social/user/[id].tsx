import FriendProfileCard, {
  FollowRelation,
  FriendProfile,
} from "@/components/FriendProfileCard";
import PhotoGrid, { PhotoGridItem } from "@/components/PhotoGrid";
import Toggle from "@/components/Toggle";
import { commonHeaderOptions } from "@/styles/common";
import { supabase } from "@/utils/supabase";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import Svg, { Path } from "react-native-svg";

/* ====== 탭 옵션 ====== */
const TAB_OPTIONS = [
  { key: "grid", label: "그리드" },
  { key: "question", label: "질문" },
];

export default function UserFeedScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string; nickname?: string }>();

  const profileId = useMemo(() => {
    const id = Number(params.id);
    return isNaN(id) ? null : id;
  }, [params.id]);
  const [myProfileId, setMyProfileId] = useState<number | null>(null);
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  // follows 테이블 데이터 기반 상태
  const [sentFollow, setSentFollow] = useState<FollowRelation | null>(null);
  const [receivedFollow, setReceivedFollow] = useState<FollowRelation | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("grid");
  const [photos, setPhotos] = useState<PhotoGridItem[]>([]);

  /* ====== 내 프로필 가져오기 ====== */
  const fetchMyProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("profile_id")
      .eq("uid", user.id)
      .single();

    if (data) {
      setMyProfileId(data.profile_id);
      return data.profile_id as number;
    }
    return null;
  }, []);

  /* ====== 친구 관계 상태 확인 ====== */
  const fetchFollowRelation = useCallback(
    async (myId: number, targetId: number) => {
      // 내가 보낸 요청 확인 (follower = 나)
      const { data: sentRequest } = await supabase
        .from("follows")
        .select("follower_profile_id, followee_profile_id, status")
        .eq("follower_profile_id", myId)
        .eq("followee_profile_id", targetId)
        .single();

      if (sentRequest) {
        setSentFollow(sentRequest as FollowRelation);
      } else {
        setSentFollow(null);
      }

      // 상대가 보낸 요청 확인 (followee = 나)
      const { data: receivedRequest } = await supabase
        .from("follows")
        .select("follower_profile_id, followee_profile_id, status")
        .eq("follower_profile_id", targetId)
        .eq("followee_profile_id", myId)
        .single();

      if (receivedRequest) {
        setReceivedFollow(receivedRequest as FollowRelation);
      } else {
        setReceivedFollow(null);
      }
    },
    [],
  );

  /* ====== 프로필 및 사진 가져오기 ====== */
  useEffect(() => {
    const fetchData = async () => {
      if (!profileId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // 내 프로필 ID 가져오기
        const myId = await fetchMyProfile();

        // TODO: 나 자신의 피드인 경우 나의 피드 페이지로 이동
        if (myId && profileId === myId) {
          // 추후 나의 피드 페이지 구현 시 router.replace로 변경
          router.back();
          return;
        }

        // 대상 프로필 정보 가져오기
        const { data: profileData } = await supabase
          .from("profiles")
          .select("profile_id, nickname, avatar_url")
          .eq("profile_id", profileId)
          .single();

        if (profileData) {
          setProfile({
            profile_id: profileData.profile_id,
            nickname: profileData.nickname ?? "",
            avatar_url: profileData.avatar_url,
            bio: null,
          });
        }

        // 친구 관계 확인
        if (myId && profileId !== myId) {
          await fetchFollowRelation(myId, profileId);
        }

        // 사진 가져오기
        const { data, error } = await supabase
          .from("answers")
          .select("answer_id, photo_url, owner_profile_id")
          .eq("owner_profile_id", profileId)
          .not("photo_url", "is", null)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (!error && data) {
          const mapped: PhotoGridItem[] = data.map((item: any) => ({
            id: String(item.answer_id),
            image_url: item.photo_url,
            user_id: String(item.owner_profile_id),
          }));
          setPhotos(mapped);
        }
      } catch (error) {
        console.error("유저 피드 로드 오류:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [profileId, fetchMyProfile, fetchFollowRelation]);

  /* ====== 헤더 설정 ====== */
  useEffect(() => {
    navigation.setOptions({
      ...commonHeaderOptions,
      headerShown: true,
      headerShadowVisible: true,
      headerTitle: () => (
        <Text style={styles.headerTitle}>
          {profile?.nickname ? `${profile.nickname}님의 피드` : "피드"}
        </Text>
      ),
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
  }, [navigation, profile?.nickname]);

  /* ====== 친구 요청 보내기 ====== */
  const handleSendRequest = async () => {
    if (!myProfileId || !profileId) return;
    setIsProcessing(true);

    const { error } = await supabase.from("follows").insert({
      follower_profile_id: myProfileId,
      followee_profile_id: profileId,
      status: "pending",
    });

    if (error) {
      Alert.alert("오류", "친구 요청에 실패했어요.");
    } else {
      setSentFollow({
        follower_profile_id: myProfileId,
        followee_profile_id: profileId,
        status: "pending",
      });
    }
    setIsProcessing(false);
  };

  /* ====== 친구 요청 취소 ====== */
  const handleCancelRequest = async () => {
    if (!myProfileId || !profileId) return;
    setIsProcessing(true);

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_profile_id", myProfileId)
      .eq("followee_profile_id", profileId);

    if (error) {
      Alert.alert("오류", "친구 요청 취소에 실패했어요.");
    } else {
      setSentFollow(null);
    }
    setIsProcessing(false);
  };

  /* ====== 친구 요청 수락 ====== */
  const handleAcceptRequest = async () => {
    if (!myProfileId || !profileId) return;
    setIsProcessing(true);

    const { error } = await supabase
      .from("follows")
      .update({ status: "accepted" })
      .eq("follower_profile_id", profileId)
      .eq("followee_profile_id", myProfileId);

    if (error) {
      Alert.alert("오류", "친구 요청 수락에 실패했어요.");
    } else {
      setReceivedFollow({
        follower_profile_id: profileId,
        followee_profile_id: myProfileId,
        status: "accepted",
      });
    }
    setIsProcessing(false);
  };

  /* ====== 친구 요청 거절 ====== */
  const handleRejectRequest = async () => {
    if (!myProfileId || !profileId) return;
    setIsProcessing(true);

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_profile_id", profileId)
      .eq("followee_profile_id", myProfileId);

    if (error) {
      Alert.alert("오류", "친구 요청 거절에 실패했어요.");
    } else {
      setReceivedFollow(null);
    }
    setIsProcessing(false);
  };

  /* ====== 친구 삭제 ====== */
  const handleDeleteFriend = async () => {
    if (!myProfileId || !profileId) return;
    setIsProcessing(true);

    // 양쪽 방향 모두 삭제
    await supabase
      .from("follows")
      .delete()
      .eq("follower_profile_id", myProfileId)
      .eq("followee_profile_id", profileId);

    await supabase
      .from("follows")
      .delete()
      .eq("follower_profile_id", profileId)
      .eq("followee_profile_id", myProfileId);

    setSentFollow(null);
    setReceivedFollow(null);
    setIsProcessing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#5B8DEF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 친구 프로필 카드 */}
        {profile && (
          <View style={styles.profileCardContainer}>
            <FriendProfileCard
              profile={profile}
              myProfileId={myProfileId}
              sentFollow={sentFollow}
              receivedFollow={receivedFollow}
              isProcessing={isProcessing}
              onSendRequest={handleSendRequest}
              onCancelRequest={handleCancelRequest}
              onAcceptRequest={handleAcceptRequest}
              onRejectRequest={handleRejectRequest}
              onDeleteFriend={handleDeleteFriend}
            />
          </View>
        )}

        {/* 토글 */}
        <View style={styles.toggleContainer}>
          <Toggle
            options={TAB_OPTIONS}
            activeKey={activeTab}
            onChangeKey={setActiveTab}
          />
        </View>

        {/* 그리드 */}
        <View style={styles.gridContainer}>
          {activeTab === "grid" && (
            <>
              {photos.length > 0 ? (
                <PhotoGrid photos={photos} />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    아직 공개된 사진이 없어요
                  </Text>
                </View>
              )}
            </>
          )}

          {activeTab === "question" && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>아직 공개된 질문이 없어요</Text>
            </View>
          )}
        </View>

        {/* 캐릭터 이미지 */}
        <View style={styles.characterContainer}>
          <Image
            source={require("@/assets/images/DD/ver_wink.png")}
            style={styles.characterImage}
            resizeMode="contain"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.51,
    color: "#0D0D0D",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  profileCardContainer: {
    marginTop: 15,
    marginBottom: 27,
  },
  toggleContainer: {
    alignItems: "center",
    marginBottom: 21,
  },
  gridContainer: {},
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontFamily: "Pretendard",
    fontSize: 15,
    lineHeight: 20,
    color: "#A0A0A0",
  },
  characterContainer: {
    alignItems: "center",
    marginTop: 71,
    marginBottom: 71,
  },
  characterImage: {
    height: 95,
  },
});
