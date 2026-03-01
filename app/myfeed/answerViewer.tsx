import { MoreIcon } from "@/app/social/friends";
import EmojiPickerSheet, { EmojiOption } from "@/components/EmojiPickerSheet";
import FeedCard from "@/components/FeedCard";
import ReactionUserSheet from "@/components/ReactionUserSheet";
import { commonHeaderOptions } from "@/styles/common";
import { supabase } from "@/utils/supabase";
import BottomSheet from "@gorhom/bottom-sheet";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Svg, { Path } from "react-native-svg";

const { width, height } = Dimensions.get("window");

interface Reaction {
  reaction_id: string;
  emoji_url: string;
  count: number;
}

interface Answer {
  answer_id: string;
  photo_url: string;
  caption: string;
  question_date: string;
  created_at: string;
  updated_at: string;
  owner_profile_id: number; // ✅ 추가
  question_text?: string;
  answer_reactions?: any[];
  daily_questions?: { question_text: string } | null;
}

const ArrowLeft = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12.5659 19.4341C12.8783 19.7465 12.8783 20.2531 12.5659 20.5655C12.2535 20.8779 11.7469 20.8779 11.4345 20.5655L3.43451 12.5655C3.12209 12.2531 3.12209 11.7465 3.43451 11.4341L11.4345 3.43412C11.7469 3.1217 12.2535 3.1217 12.5659 3.43412C12.8783 3.74654 12.8783 4.25307 12.5659 4.56549L5.93157 11.1998L19.9998 11.1998C20.4416 11.1998 20.7998 11.558 20.7998 11.9998C20.7998 12.4416 20.4416 12.7998 19.9998 12.7998L5.93157 12.7998L12.5659 19.4341Z"
      fill="#0D0D0D"
    />
  </Svg>
);

/* ====== 리액션 집계 헬퍼 ====== */
function buildDisplayedReactions(answerReactions: any[]): {
  displayedReactions: Reaction[];
  hasMoreReactions: boolean;
} {
  if (!answerReactions || answerReactions.length === 0) {
    return { displayedReactions: [], hasMoreReactions: false };
  }

  const countMap: Record<number, { emoji_image_url: string; count: number }> =
    {};
  answerReactions.forEach((r: any) => {
    const eid = r.emoji_id;
    if (!countMap[eid]) {
      countMap[eid] = { emoji_image_url: r.emojis?.value ?? "", count: 0 };
    }
    countMap[eid].count += 1;
  });

  const all: Reaction[] = Object.entries(countMap).map(([eid, val]) => ({
    reaction_id: eid,
    emoji_url: val.emoji_image_url,
    count: val.count,
  }));

  return {
    displayedReactions: all.slice(0, 3),
    hasMoreReactions: all.length > 3,
  };
}

/* ====== 오늘 이전(어제 포함) 날짜인지 판단 ====== */
function isBeforeToday(questionDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(questionDate);
  target.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
}

export default function AnswerViewerScreen() {
  const navigation = useNavigation();
  const { profileId, initialAnswerId } = useLocalSearchParams<{
    profileId: string;
    initialAnswerId: string;
  }>();

  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState<string>("사용자");
  const [isMyFeed, setIsMyFeed] = useState<boolean>(true);
  const [initialIndex, setInitialIndex] = useState(0);
  const flatListRef = useRef<FlatList<Answer>>(null);

  const [reactionSheetUsers, setReactionSheetUsers] = useState<any[]>([]);
  const [reactionSheetTabs, setReactionSheetTabs] = useState<any[]>([]);
  const [reactionSheetSelectedTab, setReactionSheetSelectedTab] =
    useState("all");
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const emojiSheetRef = useRef<BottomSheet>(null);
  const reactionUserSheetRef = useRef<BottomSheet>(null);
  const [myProfileId, setMyProfileId] = useState<number | null>(null);
  const hasScrolled = useRef(false);

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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours}시 ${minutes < 10 ? `0${minutes}` : minutes}분`;
  };

  // 내가 누른 이모지 ID 목록 계산 (answerId별)
  const getMyReactedEmojiIds = (
    answerId: string,
    answerReactions: any[],
  ): number[] => {
    if (!myProfileId) return [];
    return (answerReactions || [])
      .filter((r: any) => r.reactor_profile_id === myProfileId)
      .map((r: any) => r.emoji_id);
  };

  // 리액션 칩 클릭 핸들러 (토글 추가/삭제)
  const handlePressReaction = async (
    answerId: string,
    reaction: any,
    isMyReaction: boolean,
    currentAnswerReactions: any[],
  ) => {
    if (!myProfileId) return;

    if (isMyReaction) {
      // 이미 내가 누른 이모지 → 삭제
      setAnswers((prevAnswers) =>
        prevAnswers.map((a) => {
          if (a.answer_id !== answerId) return a;
          return {
            ...a,
            answer_reactions: (a.answer_reactions || []).filter(
              (r: any) =>
                !(
                  r.reactor_profile_id === myProfileId &&
                  r.emoji_id === reaction.emojiId
                ),
            ),
          };
        }),
      );

      await supabase
        .from("answer_reactions")
        .delete()
        .eq("answer_id", answerId)
        .eq("reactor_profile_id", myProfileId);
    } else {
      // 내가 안 누른 이모지 → 추가 (기존 리액션이 있으면 교체)
      const existingReaction = currentAnswerReactions.find(
        (r: any) => r.reactor_profile_id === myProfileId,
      );

      if (existingReaction) {
        // 기존 리액션이 있으면 교체
        setAnswers((prevAnswers) =>
          prevAnswers.map((a) => {
            if (a.answer_id !== answerId) return a;
            return {
              ...a,
              answer_reactions: (a.answer_reactions || []).map((r: any) =>
                r.reactor_profile_id === myProfileId
                  ? {
                      ...r,
                      emoji_id: reaction.emojiId,
                      emojis: { value: reaction.emoji },
                    }
                  : r,
              ),
            };
          }),
        );

        await supabase
          .from("answer_reactions")
          .update({ emoji_id: reaction.emojiId })
          .eq("answer_id", answerId)
          .eq("reactor_profile_id", myProfileId);
      } else {
        // 신규 추가
        setAnswers((prevAnswers) =>
          prevAnswers.map((a) => {
            if (a.answer_id !== answerId) return a;
            const newReaction = {
              answer_id: answerId,
              reactor_profile_id: myProfileId,
              emoji_id: reaction.emojiId,
              emojis: { value: reaction.emoji },
              profiles: { nickname: nickname, avatar_url: null },
            };
            return {
              ...a,
              answer_reactions: [...(a.answer_reactions || []), newReaction],
            };
          }),
        );

        await supabase.from("answer_reactions").insert({
          answer_id: answerId,
          reactor_profile_id: myProfileId,
          emoji_id: reaction.emojiId,
        });
      }
    }
  };

  useEffect(() => {
    navigation.setOptions({
      ...commonHeaderOptions,
      headerShown: true,
      headerShadowVisible: false,
      headerTitle: () => (
        <Text style={styles.headerTitle}>
          {isMyFeed ? "나의 피드" : `${nickname}님의 피드`}
        </Text>
      ),
      headerLeft: () => (
        <TouchableOpacity
          style={{ paddingHorizontal: 4 }}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft />
        </TouchableOpacity>
      ),
      headerRight: () => null,
    });
  }, [navigation, isMyFeed, nickname]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("nickname")
          .eq("profile_id", profileId)
          .single();

        if (profileData) setNickname(profileData.nickname);

        const { data: myProfile } = await supabase.auth.getUser();
        if (myProfile?.user?.id) {
          const { data: myProfileRow } = await supabase
            .from("profiles")
            .select("profile_id")
            .eq("uid", myProfile.user.id)
            .single();
          setIsMyFeed(
            myProfileRow
              ? String(myProfileRow.profile_id) === String(profileId)
              : false,
          );
        }

        const { data, error } = await supabase
          .from("answers")
          .select(
            `*,
            daily_questions:question_date ( question_text ),
            answer_reactions (
              reactor_profile_id,
              emoji_id,
              emojis ( emoji_id, value ),
              profiles:reactor_profile_id (nickname, avatar_url)
            )`,
          )
          .eq("owner_profile_id", profileId)
          .is("deleted_at", null)
          .order("question_date", { ascending: false });

        if (!error && data) {
          setAnswers(data);
          if (initialAnswerId) {
            const index = data.findIndex(
              (a) => String(a.answer_id) === String(initialAnswerId),
            );
            if (index >= 0) setInitialIndex(index);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profileId, initialAnswerId]);

  /* ====== 삭제 실행 ====== */
  const handleDelete = async (answerId: string) => {
    try {
      const { error } = await supabase
        .from("answers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("answer_id", answerId);

      if (error) {
        console.error("삭제 오류:", error);
        Alert.alert("오류", "삭제에 실패했어요. 다시 시도해주세요.");
        return;
      }

      // 로컬 state에서 제거
      setAnswers((prev) => prev.filter((a) => a.answer_id !== answerId));
    } catch (e) {
      console.error(e);
    }
  };

  /* ====== 점점점 버튼 핸들러 ====== */
  const handlePressMore = (item: Answer) => {
    const isMine = item.owner_profile_id === myProfileId;
    const canDelete = isMine && isBeforeToday(item.question_date);

    if (!canDelete) return;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["취소", "삭제"],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            Alert.alert(
              "사진 삭제",
              "이 사진을 삭제할까요?\n삭제 후에는 복구할 수 없어요.",
              [
                { text: "취소", style: "cancel" },
                {
                  text: "삭제",
                  style: "destructive",
                  onPress: () => handleDelete(item.answer_id),
                },
              ],
            );
          }
        },
      );
    } else {
      // Android
      Alert.alert(
        "사진 삭제",
        "이 사진을 삭제할까요?\n삭제 후에는 복구할 수 없어요.",
        [
          { text: "취소", style: "cancel" },
          {
            text: "삭제",
            style: "destructive",
            onPress: () => handleDelete(item.answer_id),
          },
        ],
      );
    }
  };

  const renderItem = ({ item, index }: { item: Answer; index: number }) => {
    const questionNumber = index + 1;
    const questionText = item.daily_questions?.question_text ?? "";

    const { displayedReactions } = buildDisplayedReactions(
      item.answer_reactions ?? [],
    );

    const isEdited =
      new Date(item.updated_at).getTime() -
        new Date(item.created_at).getTime() >
      5000;

    const isMine = item.owner_profile_id === myProfileId;
    const canDelete = isMine && isBeforeToday(item.question_date);

    return (
      <View>
        {/* 질문 섹션 */}
        <View style={styles.questionSection}>
          <View
            style={{ flexDirection: "row", flex: 1, alignItems: "flex-start" }}
          >
            <Text style={styles.questionNumber}>Q{questionNumber}.</Text>
            <Text style={styles.questionText}>{questionText}</Text>
          </View>

          {/* 삭제 가능할 때만 점점점 표시 */}
          {canDelete && (
            <TouchableOpacity
              style={{ paddingLeft: 5 }}
              onPress={() => handlePressMore(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MoreIcon width={20} height={20} />
            </TouchableOpacity>
          )}
        </View>

        <FeedCard
          data={{
            id: item.answer_id,
            imageUrl: item.photo_url,
            nickname: nickname,
            createdAt: formatTime(item.updated_at),
            ownerProfileId: Number(profileId),
            isEdited,
          }}
          reactions={displayedReactions.map((r) => ({
            emojiId: Number(r.reaction_id),
            emoji: r.emoji_url,
            emojiName: "",
            count: r.count,
          }))}
          answerReactionsRaw={item.answer_reactions}
          myReactedEmojiIds={getMyReactedEmojiIds(
            item.answer_id,
            item.answer_reactions ?? [],
          )}
          onPressNickname={() => {}}
          onPressReaction={(reaction, isMyReaction) =>
            handlePressReaction(
              item.answer_id,
              reaction,
              isMyReaction,
              item.answer_reactions ?? [],
            )
          }
          onPressAddReaction={() => {
            setSelectedAnswerId(item.answer_id);
            emojiSheetRef.current?.expand();
          }}
          onLongPressReaction={() => {
            setSelectedAnswerId(item.answer_id);
            const raw = item.answer_reactions ?? [];
            const emojiMap: Record<string, { label: string; count: number }> =
              {};

            raw.forEach((r) => {
              if (!r.emoji_id) {
                console.warn("Missing emoji_id in reaction:", r);
                return;
              }
              if (!emojiMap[r.emoji_id]) {
                emojiMap[r.emoji_id] = {
                  label: r.emojis && r.emojis.value ? r.emojis.value : "?",
                  count: 0,
                };
              }
              emojiMap[r.emoji_id].count += 1;
            });

            const tabs = [
              { key: "all", label: "전체", count: raw.length },
              ...Object.entries(emojiMap).map(([id, { label, count }]) => ({
                key: id,
                label,
                count,
              })),
            ];

            const users = raw.map((r) => ({
              id: r.reactor_profile_id,
              nickname:
                r.profiles && r.profiles.nickname
                  ? r.profiles.nickname
                  : "알 수 없음",
              profileImageUrl:
                r.profiles && r.profiles.avatar_url
                  ? r.profiles.avatar_url
                  : null,
              emojiId: r.emoji_id,
            }));
            setReactionSheetTabs(tabs);
            setReactionSheetUsers(users);
            setReactionSheetSelectedTab("all");
            reactionUserSheetRef.current?.expand();
          }}
        />
      </View>
    );
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: "white" }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FlatList
        ref={flatListRef}
        data={answers}
        keyExtractor={(item) => item.answer_id}
        renderItem={renderItem}
        onLayout={() => {
          if (initialIndex > 0 && !hasScrolled.current) {
            hasScrolled.current = true;
            flatListRef.current?.scrollToIndex({
              index: initialIndex,
              animated: false,
              viewPosition: 0,
            });
          }
        }}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            if (!hasScrolled.current) return;
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
              viewPosition: 0,
            });
          }, 500);
        }}
        contentContainerStyle={{
          backgroundColor: "#fff",
          gap: 30,
          paddingBottom: 40,
        }}
      />
      {/* 이모지 피커 BottomSheet */}
      <EmojiPickerSheet
        ref={emojiSheetRef}
        onSelectEmoji={async (emoji: EmojiOption) => {
          if (!selectedAnswerId || !myProfileId) {
            emojiSheetRef.current?.close();
            return;
          }

          try {
            setAnswers((prevAnswers) =>
              prevAnswers.map((a) => {
                if (a.answer_id !== selectedAnswerId) return a;

                const existingReactionIndex = a.answer_reactions?.findIndex(
                  (r: any) => r.reactor_profile_id === myProfileId,
                );

                if (
                  existingReactionIndex != null &&
                  existingReactionIndex >= 0
                ) {
                  const updatedReactions = [...a.answer_reactions];
                  updatedReactions[existingReactionIndex] = {
                    ...updatedReactions[existingReactionIndex],
                    emoji_id: emoji.emojiId,
                    emojis: { value: emoji.emojiUrl },
                  };
                  return { ...a, answer_reactions: updatedReactions };
                } else {
                  const newReaction = {
                    answer_id: selectedAnswerId,
                    reactor_profile_id: myProfileId,
                    emoji_id: emoji.emojiId,
                    emojis: { value: emoji.emoji },
                    profiles: { nickname: nickname, avatar_url: null },
                  };
                  return {
                    ...a,
                    answer_reactions: [
                      ...(a.answer_reactions || []),
                      newReaction,
                    ],
                  };
                }
              }),
            );

            const { data: existing } = await supabase
              .from("answer_reactions")
              .select("*")
              .eq("answer_id", selectedAnswerId)
              .eq("reactor_profile_id", myProfileId)
              .maybeSingle();

            if (existing) {
              await supabase
                .from("answer_reactions")
                .update({ emoji_id: emoji.emojiId })
                .eq("answer_id", selectedAnswerId)
                .eq("reactor_profile_id", myProfileId);
            } else {
              await supabase.from("answer_reactions").insert({
                answer_id: selectedAnswerId,
                reactor_profile_id: myProfileId,
                emoji_id: emoji.emojiId,
              });
            }
          } catch (e) {
            console.error("이모지 선택 오류:", e);
          } finally {
            emojiSheetRef.current?.close();
          }
        }}
      />
      {/* 리액션 유저 목록 BottomSheet */}
      <ReactionUserSheet
        ref={reactionUserSheetRef}
        onClose={() => {}}
        tabs={reactionSheetTabs}
        selectedTab={reactionSheetSelectedTab}
        onSelectTab={setReactionSheetSelectedTab}
        users={
          reactionSheetSelectedTab === "all"
            ? reactionSheetUsers
            : reactionSheetUsers.filter(
                (u) => String(u.emojiId) === reactionSheetSelectedTab,
              )
        }
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 17,
    fontFamily: "Pretendard-SemiBold",
    fontWeight: "400",
    letterSpacing: -0.51,
  },
  feedItem: {
    width: "100%",
    backgroundColor: "white",
    paddingBottom: 10,
  },
  questionSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  questionNumber: {
    fontFamily: "Pretendard-Regular",
    fontSize: 17,
    color: "#5B8DEF",
    fontStyle: "normal",
    fontWeight: "400",
    letterSpacing: -0.45,
    marginRight: 4,
  },
  questionText: {
    fontFamily: "Pretendard-Regular",
    color: "#0D0D0D",
    fontSize: 17,
    fontStyle: "normal",
    fontWeight: "400",
    letterSpacing: -0.45,
    flex: 1,
  },
  imageContainer: {
    width: width,
    height: width,
    backgroundColor: "#f0f0f0",
  },
  photo: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  footerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  username: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18.9,
    letterSpacing: -0.42,
  },
  timeText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 10,
    color: "#C3C3C3",
    letterSpacing: -0.3,
    marginTop: 2,
  },
  reactionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reactionBadge: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginLeft: 6,
  },
  reactionText: {
    fontSize: 18,
  },
  addEmojiBtn: {
    width: 32,
    height: 32,
    backgroundColor: "#F2F2F2",
    padding: 6,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  moreBadge: {
    backgroundColor: "#F5F5F5",
    width: 28,
    height: 28,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  moreText: {
    color: "#C3C3C3",
    fontFamily: "Pretendard-Regular",
    fontSize: 14,
  },
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  pickerContainer: {
    backgroundColor: "white",
    height: height * 0.7,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
    alignSelf: "center",
    marginVertical: 10,
  },
  searchBar: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  searchText: {
    color: "#999",
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 14,
    color: "#888",
    fontWeight: "600",
    marginBottom: 15,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 15,
    marginBottom: 25,
  },
  deardayImage: {
    width: 65,
    height: 65,
    resizeMode: "contain",
  },
  nativeEmoji: {
    fontSize: 32,
  },
});
