import EmojiPickerSheet, { EmojiOption } from "@/components/EmojiPickerSheet";
import FeedCard, { FeedCardData } from "@/components/FeedCard";
import ReactionUserSheet, {
  ReactionTab,
  ReactionUser,
} from "@/components/ReactionUserSheet";
import { supabase } from "@/utils/supabase";
import BottomSheet from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";

/* ====== 유틸리티 ====== */
const formatDateKorean = (dateStr: string): string => {
  const [year, month, day] = dateStr.split("-");
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일의 질문`;
};

const formatTimeAgo = (createdAt: string): string => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 ${diffMins % 60}분`;
  return `${diffDays}일 전`;
};

/* ====== SVG 아이콘 ====== */
const ArrowLeft = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12.5659 19.4341C12.8783 19.7465 12.8783 20.2531 12.5659 20.5655C12.2535 20.8779 11.7469 20.8779 11.4345 20.5655L3.43451 12.5655C3.12209 12.2531 3.12209 11.7465 3.43451 11.4341L11.4345 3.43412C11.7469 3.1217 12.2535 3.1217 12.5659 3.43412C12.8783 3.74654 12.8783 4.25307 12.5659 4.56549L5.93157 11.1998L19.9998 11.1998C20.4416 11.1998 20.7998 11.558 20.7998 11.9998C20.7998 12.4416 20.4416 12.7998 19.9998 12.7998L5.93157 12.7998L12.5659 19.4341Z"
      fill="#0D0D0D"
    />
  </Svg>
);

const PersonIcon = ({
  hasNotification = false,
}: {
  hasNotification?: boolean;
}) => (
  <Svg width={25} height={24} viewBox="0 0 25 24" fill="none">
    <Path
      d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
      stroke="#0D0D0D"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
      stroke="#0D0D0D"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {hasNotification && (
      <Rect x={18} y={1} width={7} height={7} rx={3.5} fill="#4190FF" />
    )}
  </Svg>
);

/* ====== 질문 Pill ====== */
interface QuestionPillProps {
  date: string;
  question: string;
}

function QuestionPill({ date, question }: QuestionPillProps) {
  return (
    <View style={styles.questionPillContainer}>
      <BlurView intensity={20} tint="light" style={styles.questionPill}>
        <View style={styles.questionPillInner}>
          <Text style={styles.questionDate}>{formatDateKorean(date)}</Text>
          <Text style={styles.questionText}>Q. {question}</Text>
        </View>
      </BlurView>
    </View>
  );
}

/* ====== 리액션 집계 헬퍼 ====== */
function buildReactionsMap(reactionsRaw: any[]): Record<string, any[]> {
  const countMap: Record<string, Record<number, number>> = {};
  reactionsRaw.forEach((r: any) => {
    const aid = String(r.answer_id);
    if (!countMap[aid]) countMap[aid] = {};
    countMap[aid][r.emoji_id] = (countMap[aid][r.emoji_id] || 0) + 1;
  });

  const reactionsMap: Record<string, any[]> = {};
  reactionsRaw.forEach((r: any) => {
    const aid = String(r.answer_id);
    if (!reactionsMap[aid]) reactionsMap[aid] = [];
    if (!reactionsMap[aid].find((x) => x.emojiId === r.emoji_id)) {
      reactionsMap[aid].push({
        emojiId: r.emoji_id,
        emoji: r.emojis?.value,
        emojiName: r.emojis?.name,
        count: countMap[aid][r.emoji_id],
      });
    }
  });

  return reactionsMap;
}

/* ====== 피드 화면 ====== */
export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    date: string;
    initialPhotoId: string;
    questionText: string;
    mode: "social" | "friend";
  }>();

  const [question, setQuestion] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [feedCards, setFeedCards] = useState<FeedCardData[]>([]);
  const [answerReactionsRaw, setAnswerReactionsRaw] = useState<any[]>([]);
  const [reactions, setReactions] = useState<Record<string, any[]>>({});
  const [myProfileId, setMyProfileId] = useState<number | null>(null);
  const [friendProfileIds, setFriendProfileIds] = useState<number[]>([]);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [hasScrolledToInitial, setHasScrolledToInitial] = useState(false);

  // ReactionUserSheet 상태
  const [reactionTabs, setReactionTabs] = useState<ReactionTab[]>([]);
  const [reactionUsers, setReactionUsers] = useState<ReactionUser[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>("all");

  const emojiSheetRef = useRef<BottomSheet>(null);
  const reactionUserSheetRef = useRef<BottomSheet>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // 각 카드의 y 위치를 저장
  const cardOffsetsRef = useRef<Record<string, number>>({});

  const HEADER_HEIGHT = insets.top + 18 + 22 + 18;
  const QUESTION_PILL_HEIGHT = 81;

  // 이모지 추가 버튼 핸들러
  const handlePressAddReaction = useCallback((answerId: string) => {
    setSelectedAnswerId(answerId);
    emojiSheetRef.current?.expand();
  }, []);

  // 롱프레스 → 탭/유저 목록 계산 후 시트 열기
  const handleLongPressReaction = useCallback(
    (answerId: string) => {
      const raw = answerReactionsRaw.filter(
        (r) => String(r.answer_id) === answerId,
      );

      const emojiMap: Record<number, { label: string; count: number }> = {};
      raw.forEach((r: any) => {
        if (!emojiMap[r.emoji_id]) {
          emojiMap[r.emoji_id] = { label: r.emojis?.value ?? "?", count: 0 };
        }
        emojiMap[r.emoji_id].count += 1;
      });

      const tabs: ReactionTab[] = [
        { key: "all", label: "전체", count: raw.length },
        ...Object.entries(emojiMap).map(([id, { label, count }]) => ({
          key: id,
          label,
          count,
        })),
      ];

      const users: ReactionUser[] = raw.map((r: any) => ({
        id: r.reactor_profile_id,
        nickname: r.profiles?.nickname ?? "알 수 없음",
        profileImageUrl: r.profiles?.avatar_url ?? null,
        emojiId: r.emoji_id,
      }));

      setReactionTabs(tabs);
      setReactionUsers(users);
      setSelectedTab("all");
      reactionUserSheetRef.current?.expand();
    },
    [answerReactionsRaw],
  );

  const handleSelectTab = useCallback((key: string) => {
    setSelectedTab(key);
  }, []);

  const filteredUsers =
    selectedTab === "all"
      ? reactionUsers
      : reactionUsers.filter((u) => String(u.emojiId) === selectedTab);

  // params에서 질문 텍스트 세팅
  useEffect(() => {
    if (params.questionText) {
      setQuestion(
        decodeURIComponent(params.questionText).replace(/\\n/g, "\n"),
      );
    }
    if (params.date) {
      setDate(params.date);
    }
  }, [params.questionText, params.date]);

  // 내 프로필 ID 로드
  useEffect(() => {
    const loadMyProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profileData } = await supabase
          .from("profiles")
          .select("profile_id")
          .eq("uid", user.id)
          .single();
        if (!profileData) return;
        setMyProfileId(profileData.profile_id);
      } catch (error) {
        console.error("프로필 로드 오류:", error);
      }
    };
    loadMyProfile();
  }, []);

  // 친구 목록 로드
  useEffect(() => {
    const loadFriends = async () => {
      if (params.mode !== "friend" || !myProfileId) return;
      try {
        const { data: asFollower } = await supabase
          .from("follows")
          .select("followee_profile_id")
          .eq("follower_profile_id", myProfileId)
          .eq("status", "accepted");
        const { data: asFollowee } = await supabase
          .from("follows")
          .select("follower_profile_id")
          .eq("followee_profile_id", myProfileId)
          .eq("status", "accepted");
        const friendIds = new Set<number>();
        asFollower?.forEach((r: any) => friendIds.add(r.followee_profile_id));
        asFollowee?.forEach((r: any) => friendIds.add(r.follower_profile_id));
        setFriendProfileIds([...friendIds]);
      } catch (error) {
        console.error("친구 로드 오류:", error);
      }
    };
    loadFriends();
  }, [params.mode, myProfileId]);

  // 질문 서버에서 가져오기
  useEffect(() => {
    const fetchQuestion = async () => {
      if (!params.date || params.questionText) return;
      try {
        const { data, error } = await supabase
          .from("daily_questions")
          .select("*")
          .eq("question_date", params.date)
          .single();
        if (!error && data) {
          setQuestion(data.question_text.replace(/\\n/g, "\n"));
        }
      } catch (error) {
        console.error("질문 로드 오류:", error);
      }
    };
    fetchQuestion();
  }, [params.date, params.questionText]);

  // 공통 리액션 fetch
  const fetchReactionsForAnswerIds = useCallback(async (answerIds: any[]) => {
    const { data: reactionsRaw, error: reactionsError } = await supabase
      .from("answer_reactions")
      .select(
        `
        answer_id,
        emoji_id,
        reactor_profile_id,
        emojis:emoji_id (value, name),
        profiles:reactor_profile_id (nickname, avatar_url)
      `,
      )
      .in("answer_id", answerIds);

    if (!reactionsError && reactionsRaw) {
      setAnswerReactionsRaw(reactionsRaw);
      setReactions(buildReactionsMap(reactionsRaw));
    } else {
      setAnswerReactionsRaw([]);
      setReactions({});
    }
  }, []);

  // 사진 피드 + 리액션 데이터 가져오기
  useEffect(() => {
    const fetchFeedPhotosAndReactions = async () => {
      if (!params.date) return;
      if (params.mode === "friend" && friendProfileIds.length === 0) {
        setFeedCards([]);
        setAnswerReactionsRaw([]);
        setReactions({});
        return;
      }

      try {
        let query = supabase
          .from("answers")
          .select(
            `
            answer_id,
            owner_profile_id,
            photo_url,
            created_at,
            profiles:owner_profile_id (nickname)
          `,
          )
          .eq("question_date", params.date)
          .not("photo_url", "is", null)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (params.mode === "friend") {
          query = query.in("owner_profile_id", friendProfileIds);
        }

        const { data: answers, error: answersError } = await query;

        if (!answersError && answers) {
          const cards: FeedCardData[] = answers.map((item: any) => ({
            id: item.answer_id,
            imageUrl: item.photo_url,
            nickname: item.profiles?.nickname || "익명",
            createdAt: formatTimeAgo(item.created_at),
            ownerProfileId: item.owner_profile_id,
          }));
          setFeedCards(cards);
          // 새 카드 로드 시 스크롤 초기화
          setHasScrolledToInitial(false);

          const answerIds = answers.map((a: any) => a.answer_id);
          console.log("answerIds:", answerIds);
          if (answerIds.length > 0) {
            await fetchReactionsForAnswerIds(answerIds);
          } else {
            setAnswerReactionsRaw([]);
            setReactions({});
          }
        }
      } catch (error) {
        console.error("피드/리액션 로드 오류:", error);
      }
    };

    fetchFeedPhotosAndReactions();
  }, [
    params.date,
    params.mode,
    friendProfileIds,
    myProfileId,
    fetchReactionsForAnswerIds,
  ]);

  // ✅ feedCards 로드 완료 후 initialPhotoId 위치로 스크롤
  useEffect(() => {
    if (
      !params.initialPhotoId ||
      feedCards.length === 0 ||
      hasScrolledToInitial
    )
      return;

    const targetId = String(params.initialPhotoId);
    const targetIndex = feedCards.findIndex(
      (card) => String(card.id) === targetId,
    );

    if (targetIndex <= 0) {
      // 첫 번째이거나 못 찾으면 스크롤 불필요
      setHasScrolledToInitial(true);
      return;
    }

    // 레이아웃이 렌더링될 시간을 주고 스크롤
    const timer = setTimeout(() => {
      const offset = cardOffsetsRef.current[targetId];
      if (offset !== undefined && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: offset,
          animated: false, // 부드럽게 이동하지 않고 바로 이동
        });
      }
      setHasScrolledToInitial(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [feedCards, params.initialPhotoId, hasScrolledToInitial]);

  // 리액션 새로고침
  const fetchReactions = useCallback(async () => {
    if (!params.date) return;
    try {
      let query = supabase
        .from("answers")
        .select(`answer_id`)
        .eq("question_date", params.date)
        .not("photo_url", "is", null)
        .is("deleted_at", null);

      if (params.mode === "friend") {
        query = query.in("owner_profile_id", friendProfileIds);
      }

      const { data: answers, error: answersError } = await query;
      if (!answersError && answers) {
        const answerIds = answers.map((a: any) => a.answer_id);
        if (answerIds.length > 0) {
          await fetchReactionsForAnswerIds(answerIds);
        } else {
          setAnswerReactionsRaw([]);
          setReactions({});
        }
      }
    } catch (error) {
      console.error("리액션 새로고침 오류:", error);
    }
  }, [params.date, params.mode, friendProfileIds, fetchReactionsForAnswerIds]);

  // 이모지 선택 핸들러
  const handleSelectEmoji = useCallback(
    async (emoji: EmojiOption) => {
      if (!selectedAnswerId || !myProfileId) {
        emojiSheetRef.current?.close();
        return;
      }

      setAnswerReactionsRaw((prev) => [
        ...prev,
        {
          answer_id: selectedAnswerId,
          reactor_profile_id: myProfileId,
          emoji_id: emoji.emojiId,
          emojis: { value: emoji.emoji, name: emoji.name },
          profiles: { nickname: "나", avatar_url: null }, 
        },
      ]);

      setReactions((prev) => {
        const prevForAnswer = prev[selectedAnswerId] || [];
        const existing = prevForAnswer.find((r) => r.emojiId === emoji.emojiId);
        if (existing) {
          return {
            ...prev,
            [selectedAnswerId]: prevForAnswer.map((r) =>
              r.emojiId === emoji.emojiId
                ? { ...r, count: r.count + 1 }
                : r
            ),
          };
        } else {
          return {
            ...prev,
            [selectedAnswerId]: [
              ...prevForAnswer,
              { emojiId: emoji.emojiId, emoji: emoji.emoji, emojiName: emoji.name, count: 1 },
            ],
          };
        }
      });

      emojiSheetRef.current?.close();

      try {
        const { error: insertError } = await supabase
          .from("answer_reactions")
          .insert({
            answer_id: selectedAnswerId,
            reactor_profile_id: myProfileId,
            emoji_id: emoji.emojiId,
          });

        if (insertError) {
          console.error("insert 오류:", insertError);
          // 실패하면 로컬 상태 롤백
          setAnswerReactionsRaw((prev) =>
            prev.filter(
              (r) =>
                !(
                  r.answer_id === selectedAnswerId &&
                  r.reactor_profile_id === myProfileId &&
                  r.emoji_id === emoji.emojiId
                )
            )
          );
          setReactions((prev) => {
            const prevForAnswer = prev[selectedAnswerId] || [];
            const existing = prevForAnswer.find((r) => r.emojiId === emoji.emojiId);
            if (existing && existing.count === 1) {
              return {
                ...prev,
                [selectedAnswerId]: prevForAnswer.filter((r) => r.emojiId !== emoji.emojiId),
              };
            } else if (existing) {
              return {
                ...prev,
                [selectedAnswerId]: prevForAnswer.map((r) =>
                  r.emojiId === emoji.emojiId ? { ...r, count: r.count - 1 } : r
                ),
              };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("리액션 추가 오류:", error);
      }
    },
    [selectedAnswerId, myProfileId]
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 헤더 */}
      <View style={[styles.headerOverlay, { paddingTop: insets.top + 18 }]}>
        <View style={styles.headerContent}>
          <Pressable
            style={styles.headerIconWrapper}
            onPress={() => router.back()}
          >
            <ArrowLeft />
          </Pressable>
          <Text style={styles.headerTitle}>소셜</Text>
          <Pressable
            style={styles.headerIconWrapper}
            onPress={() => router.push("/social/friends")}
          >
            <PersonIcon hasNotification={false} />
          </Pressable>
        </View>
      </View>

      {/* 피드 콘텐츠 */}
      <ScrollView
        ref={scrollViewRef}
        style={[styles.scrollView, { marginTop: HEADER_HEIGHT }]}
        contentContainerStyle={[
          styles.feedContainer,
          { paddingTop: QUESTION_PILL_HEIGHT },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {feedCards.map((card) => (
          <View
            key={card.id}
            onLayout={(e) => {
              // 각 카드의 y 위치 기록
              cardOffsetsRef.current[String(card.id)] = e.nativeEvent.layout.y;
            }}
          >
            <FeedCard
              data={card}
              reactions={reactions[String(card.id)] || []}
              answerReactionsRaw={answerReactionsRaw.filter(
                (r) => String(r.answer_id) === String(card.id),
              )}
              onPressNickname={(item) => {
                router.push({
                  pathname: "/social/user/[id]",
                  params: {
                    id: String(item.ownerProfileId),
                    nickname: item.nickname,
                  },
                });
              }}
              onPressAddReaction={() => handlePressAddReaction(String(card.id))}
              onLongPressReaction={() =>
                handleLongPressReaction(String(card.id))
              }
            />
          </View>
        ))}
      </ScrollView>

      {/* 질문 Pill */}
      <View style={[styles.questionArea, { top: HEADER_HEIGHT }]}>
        {date && question && <QuestionPill date={date} question={question} />}
      </View>

      {/* 이모지 피커 BottomSheet */}
      <EmojiPickerSheet
        ref={emojiSheetRef}
        onSelectEmoji={handleSelectEmoji}
        onClose={() => setSelectedAnswerId(null)}
      />

      {/* 리액션 유저 목록 BottomSheet */}
      <ReactionUserSheet
        ref={reactionUserSheetRef}
        onClose={() => {}}
        tabs={reactionTabs}
        selectedTab={selectedTab}
        onSelectTab={handleSelectTab}
        users={filteredUsers}
      />
    </GestureHandlerRootView>
  );
}

/* ====== 스타일 ====== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 18,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    backgroundColor: "#FEFEFE",
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
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
  questionArea: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 81,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  questionPillContainer: {
    alignItems: "center",
  },
  questionPill: {
    borderRadius: 100,
    overflow: "hidden",
    backgroundColor: "rgba(254, 254, 254, 0.8)",
  },
  questionPillInner: {
    paddingTop: 7,
    paddingBottom: 6,
    paddingHorizontal: 15,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  questionDate: {
    fontFamily: "Pretendard",
    fontSize: 12,
    fontWeight: "400",
    letterSpacing: -0.36,
    color: "#333333",
    textAlign: "center",
  },
  questionText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18.9,
    letterSpacing: -0.42,
    color: "#5B8DEF",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  feedContainer: {
    paddingBottom: 40,
    gap: 20,
  },
});
