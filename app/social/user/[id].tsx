import FriendProfileCard, {
  FollowRelation,
  FriendProfile,
} from "@/components/FriendProfileCard";
import ArrowIcon from "@/components/icons/ArrowIcon";
import PhotoGrid, { PhotoGridItem } from "@/components/PhotoGrid";
import Toggle from "@/components/Toggle";
import { commonHeaderOptions } from "@/styles/common";
import { supabase } from "@/utils/supabase";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

const ArrowLeft = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12.5659 19.4341C12.8783 19.7465 12.8783 20.2531 12.5659 20.5655C12.2535 20.8779 11.7469 20.8779 11.4345 20.5655L3.43451 12.5655C3.12209 12.2531 3.12209 11.7465 3.43451 11.4341L11.4345 3.43412C11.7469 3.1217 12.2535 3.1217 12.5659 3.43412C12.8783 3.74654 12.8783 4.25307 12.5659 4.56549L5.93157 11.1998L19.9998 11.1998C20.4416 11.1998 20.7998 11.558 20.7998 11.9998C20.7998 12.4416 20.4416 12.7998 19.9998 12.7998L5.93157 12.7998L12.5659 19.4341Z"
      fill="#0D0D0D"
    />
  </Svg>
);

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const DDSurprised_URL = `${SUPABASE_URL}/storage/v1/object/public/emoji/surprise.png`;
const DDBored_URL = `${SUPABASE_URL}/storage/v1/object/public/emoji/bored.png`;
const DDLogo_URL = `${SUPABASE_URL}/storage/v1/object/public/emoji/wrinkled.png`;

const LockIcon = () => (
  <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <Path
      d="M20.8537 16.1538C6.89364 16.1538 6.05376 16.1538 6.00323 32.821C5.99753 34.7021 7.52501 36.231 9.40619 36.231H31.5938C33.475 36.231 35.0024 34.7021 34.9969 32.821C34.9488 16.1538 34.1489 16.1538 20.8537 16.1538Z"
      fill="#929292"
    />
    <Path
      d="M12.6924 20.6156V12.8077C12.6924 8.49563 16.188 5 20.5001 5C24.8121 5 28.3078 8.49563 28.3078 12.8077V20.6156"
      stroke="#929292"
      strokeWidth={2.72496}
    />
  </Svg>
);

function LockedOverlay() {
  return (
    <View style={styles.lockedContainer}>
      <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(255,255,255,0)", "#FFFFFF"]}
        locations={[0, 0.8641]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.lockedContent}>
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: DDLogo_URL }}
            style={styles.logo}
            transition={200}
            cachePolicy="disk"
          />
        </View>
        <LockIcon />
        <Text style={styles.lockedText}>
          비공개 계정이에요.{"\n"}친구 요청을 보내보세요!
        </Text>
      </View>
    </View>
  );
}

function EndOfFeed() {
  return (
    <View style={styles.endOfFeedContainer}>
      <Text style={styles.endOfFeedText}>끝까지 오실 줄은 몰랐어요!</Text>
      <Image
        source={{ uri: DDSurprised_URL }}
        style={styles.endOfFeedImage}
        transition={200}
        cachePolicy="disk"
      />
    </View>
  );
}

// ✅ 통일된 날짜 포맷 (점 사이 공백 있게)
function formatDate(dateString: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}. ${mm}. ${dd}.`;
}

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
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [sentFollow, setSentFollow] = useState<FollowRelation | null>(null);
  const [receivedFollow, setReceivedFollow] = useState<FollowRelation | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("grid");
  const [photos, setPhotos] = useState<PhotoGridItem[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const flatListRef = useRef(null);

  const isFriend =
    sentFollow?.status === "accepted" || receivedFollow?.status === "accepted";
  const isLocked = !isPublic && !isFriend;

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

  const fetchFollowRelation = useCallback(
    async (myId: number, targetId: number) => {
      const { data: sentRequest } = await supabase
        .from("follows")
        .select("follower_profile_id, followee_profile_id, status")
        .eq("follower_profile_id", myId)
        .eq("followee_profile_id", targetId)
        .single();
      setSentFollow(sentRequest ? (sentRequest as FollowRelation) : null);

      const { data: receivedRequest } = await supabase
        .from("follows")
        .select("follower_profile_id, followee_profile_id, status")
        .eq("follower_profile_id", targetId)
        .eq("followee_profile_id", myId)
        .single();
      setReceivedFollow(
        receivedRequest ? (receivedRequest as FollowRelation) : null,
      );
    },
    [],
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!profileId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const myId = await fetchMyProfile();

        if (myId && profileId === myId) {
          router.replace({
            pathname: "../../mypage",
            params: { profileId: myId },
          });
          return;
        }

        const { data: profileData } = await supabase
          .from("profiles")
          .select("profile_id, nickname, avatar_url, is_public")
          .eq("profile_id", profileId)
          .single();

        if (profileData) {
          setProfile({
            profile_id: profileData.profile_id,
            nickname: profileData.nickname ?? "",
            avatar_url: profileData.avatar_url,
            bio: null,
          });
          setIsPublic(profileData.is_public ?? true);
        }

        if (myId && profileId !== myId) {
          await fetchFollowRelation(myId, profileId);
        }

        // 그리드 사진
        const { data: photoData } = await supabase
          .from("answers")
          .select("answer_id, photo_url, owner_profile_id")
          .eq("owner_profile_id", profileId)
          .not("photo_url", "is", null)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (photoData) {
          setPhotos(
            photoData.map((item: any) => ({
              id: String(item.answer_id),
              image_url: item.photo_url,
              user_id: String(item.owner_profile_id),
            })),
          );
        }

        // 질문 탭: join으로 한 번에
        setAnswersLoading(true);
        const { data: answerData, error: answerError } = await supabase
          .from("answers")
          .select(
            "answer_id, photo_url, question_date, created_at, updated_at, owner_profile_id, daily_questions:question_date(question_text)",
          )
          .eq("owner_profile_id", profileId)
          .not("photo_url", "is", null)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (!answerError && answerData) {
          const mapped = answerData.map((item: any) => {
            const dq = item.daily_questions;
            const questionText = Array.isArray(dq)
              ? (dq[0]?.question_text ?? "")
              : (dq?.question_text ?? "");
            return { ...item, question_text: questionText };
          });
          setAnswers(mapped);
        } else {
          setAnswers([]);
        }
        setAnswersLoading(false);
      } catch (error) {
        console.error("유저 피드 로드 오류:", error);
        setAnswersLoading(false);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [profileId, fetchMyProfile, fetchFollowRelation]);

  useEffect(() => {
    let title = "";
    if (myProfileId && profile && Number(profile.profile_id) === myProfileId) {
      title = "나의 피드";
    } else if (profile?.nickname) {
      title = `${profile.nickname}님의 피드`;
    } else {
      title = "피드";
    }
    navigation.setOptions({
      ...commonHeaderOptions,
      headerShown: true,
      headerShadowVisible: true,
      headerTitle: () => <Text style={styles.headerTitle}>{title}</Text>,
      headerLeft: () => (
        <Pressable onPress={() => router.back()}>
          <ArrowLeft />
        </Pressable>
      ),
    });
  }, [navigation, myProfileId, profile]);

  const handleSendRequest = async () => {
    if (!myProfileId || !profileId) return;
    setIsProcessing(true);
    const { error } = await supabase.from("follows").insert({
      follower_profile_id: myProfileId,
      followee_profile_id: profileId,
      status: "pending",
    });
    if (error) Alert.alert("오류", "친구 요청에 실패했어요.");
    else
      setSentFollow({
        follower_profile_id: myProfileId,
        followee_profile_id: profileId,
        status: "pending",
      });
    setIsProcessing(false);
  };

  const handleCancelRequest = async () => {
    if (!myProfileId || !profileId) return;
    setIsProcessing(true);
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_profile_id", myProfileId)
      .eq("followee_profile_id", profileId);
    if (error) Alert.alert("오류", "친구 요청 취소에 실패했어요.");
    else setSentFollow(null);
    setIsProcessing(false);
  };

  const handleAcceptRequest = async () => {
    if (!myProfileId || !profileId) return;
    setIsProcessing(true);
    const { error } = await supabase
      .from("follows")
      .update({ status: "accepted" })
      .eq("follower_profile_id", profileId)
      .eq("followee_profile_id", myProfileId);
    if (error) Alert.alert("오류", "친구 요청 수락에 실패했어요.");
    else
      setReceivedFollow({
        follower_profile_id: profileId,
        followee_profile_id: myProfileId,
        status: "accepted",
      });
    setIsProcessing(false);
  };

  const handleRejectRequest = async () => {
    if (!myProfileId || !profileId) return;
    setIsProcessing(true);
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_profile_id", profileId)
      .eq("followee_profile_id", myProfileId);
    if (error) Alert.alert("오류", "친구 요청 거절에 실패했어요.");
    else setReceivedFollow(null);
    setIsProcessing(false);
  };

  const handleDeleteFriend = async () => {
    if (!myProfileId || !profileId) return;
    setIsProcessing(true);
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

  const QuestionList = () => (
    <View style={styles.questionListContainer}>
      {answers.map((item, index) => {
        // ✅ 오름차순 번호
        const questionNumber = index + 1;
        const dateStr = formatDate(item.question_date || item.created_at);
        return (
          <TouchableOpacity
            key={String(item.answer_id)}
            style={styles.questionListItem}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: "/social/user/answerViewer",
                params: { profileId, initialAnswerId: item.answer_id },
              })
            }
          >
            {/* ✅ 썸네일 40x40 */}
            <View style={styles.questionThumbnailWrapper}>
              <Image
                source={{ uri: item.photo_url }}
                style={styles.questionThumbnail}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            </View>

            {/* 텍스트 영역 */}
            <View style={styles.questionTextArea}>
              {/* ✅ 질문 한 줄 + ... 처리 */}
              <Text
                style={styles.questionListText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                <Text style={styles.questionListNumber}>
                  Q{questionNumber}.{" "}
                </Text>
                {item.question_text ?? ""}
              </Text>
              <Text style={styles.questionListDate}>{dateStr}</Text>
            </View>

            {/* ✅ 화살표 왼쪽 14 간격 */}
            <View style={{ marginLeft: 14 }}>
              <ArrowIcon width={13.333} height={20} />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isLocked}
      >
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

        {isLocked ? (
          <>
            <View style={styles.toggleContainer}>
              <Toggle
                options={TAB_OPTIONS}
                activeKey={activeTab}
                onChangeKey={setActiveTab}
              />
            </View>
            <View style={styles.lockedSection}>
              <View style={styles.gridContainer}>
                {photos.length > 0 ? (
                  <PhotoGrid
                    photos={photos}
                    onPressPhoto={(photo) =>
                      router.push({
                        pathname: "/social/user/answerViewer",
                        params: { profileId, initialAnswerId: photo.id },
                      })
                    }
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>아직 사진이 없어요.</Text>
                    <Image
                      source={{ uri: DDBored_URL }}
                      style={styles.emptyImage}
                      transition={200}
                      cachePolicy="disk"
                    />
                  </View>
                )}
              </View>
              <LockedOverlay />
            </View>
          </>
        ) : (
          <>
            <View style={styles.toggleContainer}>
              <Toggle
                options={TAB_OPTIONS}
                activeKey={activeTab}
                onChangeKey={setActiveTab}
              />
            </View>

            <View style={styles.gridContainer}>
              {activeTab === "grid" && (
                <>
                  {photos.length > 0 ? (
                    <PhotoGrid
                      photos={photos}
                      onPressPhoto={(photo) =>
                        router.push({
                          pathname: "/social/user/answerViewer",
                          params: { profileId, initialAnswerId: photo.id },
                        })
                      }
                    />
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>아직 사진이 없어요.</Text>
                      <Image
                        source={{ uri: DDBored_URL }}
                        style={styles.emptyImage}
                        transition={200}
                        cachePolicy="disk"
                      />
                    </View>
                  )}
                </>
              )}

              {activeTab === "question" && (
                <>
                  {answersLoading ? (
                    <View style={styles.emptyContainer}>
                      <ActivityIndicator size="small" color="#5B8DEF" />
                    </View>
                  ) : answers.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>아직 답변이 없어요.</Text>
                      <Image
                        source={{ uri: DDBored_URL }}
                        style={styles.emptyImage}
                        transition={200}
                        cachePolicy="disk"
                      />
                    </View>
                  ) : (
                    <QuestionList />
                  )}
                </>
              )}
            </View>

            {activeTab === "grid" && photos.length > 0 && <EndOfFeed />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
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
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: 40 },
  profileCardContainer: { marginTop: 15, marginBottom: 27 },
  toggleContainer: { alignItems: "center", marginBottom: 21 },
  gridContainer: {},
  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 26 },
  emptyText: {
    fontFamily: "Pretendard",
    fontSize: 17,
    fontWeight: "400",
    lineHeight: 20,
    letterSpacing: -0.51,
    color: "#929292",
    textAlign: "center",
  },
  emptyImage: { width: 120, height: 120 },
  endOfFeedContainer: {
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 80,
    gap: 16,
  },
  endOfFeedText: {
    fontFamily: "Pretendard",
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 20,
    letterSpacing: -0.51,
    color: "#626262",
    textAlign: "center",
  },
  endOfFeedImage: { width: 118, height: 118 },
  lockedSection: {
    position: "relative",
    minHeight: 439,
    overflow: "hidden",
    marginTop: -21,
    paddingTop: 21,
  },
  lockedContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  lockedContent: { alignItems: "center", gap: 8 },
  lockedText: {
    fontFamily: "Pretendard",
    fontSize: 17,
    fontWeight: "400",
    lineHeight: 20,
    letterSpacing: -0.51,
    color: "#0D0D0D",
    textAlign: "center",
  },
  logoContainer: { marginBottom: 16 },
  logo: { width: 130, height: 130 },
  // ✅ 통일된 질문 탭 스타일
  questionListContainer: { paddingHorizontal: 8 },
  questionListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 10,
  },
  questionThumbnailWrapper: {
    width: 40, // ✅ 40x40
    height: 40,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F2F2F2",
    flexShrink: 0,
    marginRight: 12,
  },
  questionThumbnail: { width: "100%", height: "100%" },
  questionTextArea: { flex: 1 },
  questionListNumber: {
    fontFamily: "Pretendard-Regular",
    fontSize: 13,
    color: "#5B8DEF",
    fontWeight: "400",
    letterSpacing: -0.39,
  },
  questionListText: {
    fontFamily: "HakgyoansimBadasseugi-L",
    fontSize: 13,
    color: "#0D0D0D",
    fontWeight: "400",
    letterSpacing: -0.39,
  },
  questionListDate: {
    fontFamily: "Pretendard-Regular",
    fontSize: 13,
    color: "#C3C3C3",
    letterSpacing: -0.3,
    marginTop: 4,
  },
});
