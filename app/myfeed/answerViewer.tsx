import EmojiPickerSheet, { EmojiOption } from "@/components/EmojiPickerSheet";
import FeedCard from "@/components/FeedCard";
import ReactionUserSheet from "@/components/ReactionUserSheet";
import { commonHeaderOptions } from "@/styles/common";
import { supabase } from "@/utils/supabase";
import BottomSheet from "@gorhom/bottom-sheet";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
  updated_at: string;
  question_text?: string;
  answer_reactions?: any[];
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

  // emoji_id 기준으로 count 집계
  // emojis.value에는 실제 이미지 url이 담겨 있음
  const countMap: Record<number, { emoji_image_url: string; count: number }> =
    {};
  answerReactions.forEach((r: any) => {
    const eid = r.emoji_id;
    if (!countMap[eid]) {
      countMap[eid] = {
        emoji_image_url: r.emojis?.value ?? "",
        count: 0,
      };
    }
    countMap[eid].count += 1;
  });

  const all: Reaction[] = Object.entries(countMap).map(([eid, val]) => ({
    reaction_id: eid,
    emoji_url: val.emoji_image_url,
    count: val.count,
  }));

  const displayedReactions = all.slice(0, 3);
  const hasMoreReactions = all.length > 3;

  return { displayedReactions, hasMoreReactions };
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
  // 내 프로필 ID 로드 (feed.tsx 참고)
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
          style={{ paddingHorizontal: 8 }}
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

  const renderItem = ({ item, index }: { item: Answer; index: number }) => {
    const questionNumber = index + 1;

    // ✅ renderItem 안에서 리액션 계산
    const { displayedReactions, hasMoreReactions } = buildDisplayedReactions(
      item.answer_reactions ?? [],
    );

    return (
      <FeedCard
        data={{
          id: item.answer_id,
          imageUrl: item.photo_url,
          nickname: nickname,
          createdAt: formatTime(item.updated_at),
          ownerProfileId: Number(profileId),
        }}
        reactions={displayedReactions.map((r) => ({
          emojiId: r.reaction_id,
          emoji: r.emoji_url,
          emojiName: "", // If available, add name
          count: r.count,
        }))}
        answerReactionsRaw={item.answer_reactions}
        onPressNickname={() => {}}
        onPressAddReaction={() => {
          setSelectedAnswerId(item.answer_id);
          emojiSheetRef.current?.expand();
        }}
        onLongPressReaction={() => {
          setSelectedAnswerId(item.answer_id);
          const raw = item.answer_reactions ?? [];
          console.log("answer_reactions raw:", raw);
          const emojiMap = {};
          raw.forEach((r) => {
            // Defensive check: skip if emoji_id is missing
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
          console.log("emojiMap result:", emojiMap);
          const tabs = [
            { key: "all", label: "전체", count: raw.length },
            ...Object.entries(emojiMap).map(([id, { label, count }]) => ({
              key: id,
              label,
              count,
            })),
          ];
          // 사용자 닉네임을 feed.tsx처럼 profiles:reactor_profile_id에서 가져오도록 수정
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
    );
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: "white" }} />;
  }

  return (
    <>
      <FlatList
        ref={flatListRef}
        data={answers}
        keyExtractor={(item) => item.answer_id}
        renderItem={renderItem}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: 550,
          offset: 550 * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise((resolve) => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            });
          });
        }}
        contentContainerStyle={{ backgroundColor: "#fff", gap: 30 }}
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
            const { error } = await supabase.from("answer_reactions").insert({
              answer_id: selectedAnswerId,
              reactor_profile_id: myProfileId,
              emoji_id: emoji.emojiId,
            });
            if (error) {
              console.error("insert 오류:", error);
            }
          } catch (e) {
            console.error("supabase 오류:", e);
          }
          emojiSheetRef.current?.close();
          // 저장 후 리액션 새로고침 (feed.tsx처럼)
          // answers state를 새로고침하거나, 별도 fetch 함수 구현 가능
          // 여기서는 간단히 fetchData() 호출
          // (실제 feed.tsx는 fetchReactions 호출)
          // 아래 코드 참고
          // fetchData();
        }}
        onClose={() => {
          emojiSheetRef.current?.close();
        }}
      />
      {/* 리액션 유저 목록 BottomSheet */}
      <ReactionUserSheet
        ref={reactionUserSheetRef}
        onClose={() => {
          reactionUserSheetRef.current?.close();
        }}
        tabs={reactionSheetTabs}
        selectedTab={reactionSheetSelectedTab}
        onSelectTab={setReactionSheetSelectedTab}
        users={reactionSheetUsers}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
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
