import ArrowIcon from "@/components/icons/ArrowIcon";
import EditIcon from "@/components/icons/EditIcon";
import Toggle from "@/components/Toggle";
import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HORIZONTAL_PADDING = 13;
const PAGE_SIZE = 15;

interface Answer {
  answer_id: string;
  question_date: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

interface Profile {
  avatar_url: string | null;
  nickname: string;
  intro: string;
}
type FeedItem = {
  id: string;
  imageUrl: string;
  dateISO: string;
  place: string;
};

type GridItem = {
  type: string;
  items: FeedItem[];
};

type QuestionItem = {
  answer: Answer;
  question: any;
};

type ListItem = GridItem | QuestionItem;

/* ---------------- utils ---------------- */

const generateRandomRatios = (count: number) => {
  const ratios = [0.8, 1, 1.3, 1.6];
  return Array.from(
    { length: count },
    () => ratios[Math.floor(Math.random() * ratios.length)],
  );
};

// ✅ 통일된 날짜 포맷 (점 사이 공백 있게)
function formatDate(dateString: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}. ${mm}. ${dd}.`;
}

/* ---------------- 패턴 컴포넌트 ---------------- */
const Square3Row = ({
  items,
  width,
  gap = 6,
  onPressItem,
}: {
  items: FeedItem[];
  width: number;
  gap?: number;
  onPressItem?: (item: FeedItem) => void;
}) => {
  if (items.length < 3) return null;
  const squareWidth = (width - gap * 2) / 3;
  return (
    <View style={{ flexDirection: "row", gap, marginBottom: gap }}>
      {items.map((item) => (
        <Tile
          key={item.id}
          it={item}
          width={squareWidth}
          height={squareWidth}
          radius={8}
          onPressItem={onPressItem}
        />
      ))}
    </View>
  );
};

const L3Left2 = ({
  items,
  width,
  gap = 6,
  onPressItem,
}: {
  items: FeedItem[];
  width: number;
  gap?: number;
  onPressItem?: (item: FeedItem) => void;
}) => {
  if (items.length < 3) return null;
  const leftWidth = (width - gap * 2) / 3;
  const rightWidth = width - leftWidth - gap;
  return (
    <View style={{ flexDirection: "row", gap, marginBottom: gap }}>
      <View style={{ width: leftWidth, justifyContent: "space-between", gap }}>
        <Tile
          it={items[0]}
          width={leftWidth}
          height={leftWidth}
          radius={6}
          onPressItem={onPressItem}
        />
        <Tile
          it={items[1]}
          width={leftWidth}
          height={leftWidth}
          radius={6}
          onPressItem={onPressItem}
        />
      </View>
      <Tile
        it={items[2]}
        width={rightWidth}
        height={rightWidth}
        radius={8}
        onPressItem={onPressItem}
      />
    </View>
  );
};

const L3Right2 = ({
  items,
  width,
  gap = 6,
  onPressItem,
}: {
  items: FeedItem[];
  width: number;
  gap?: number;
  onPressItem?: (item: FeedItem) => void;
}) => {
  if (items.length < 3) return null;
  const rightWidth = (width - gap * 2) / 3;
  const leftWidth = width - rightWidth - gap;
  return (
    <View style={{ flexDirection: "row", gap, marginBottom: gap }}>
      <Tile
        it={items[0]}
        width={leftWidth}
        height={leftWidth}
        radius={8}
        onPressItem={onPressItem}
      />
      <View style={{ width: rightWidth, justifyContent: "space-between", gap }}>
        <Tile
          it={items[1]}
          width={rightWidth}
          height={rightWidth}
          radius={6}
          onPressItem={onPressItem}
        />
        <Tile
          it={items[2]}
          width={rightWidth}
          height={rightWidth}
          radius={6}
          onPressItem={onPressItem}
        />
      </View>
    </View>
  );
};

const buildRandomBlocks = (
  items: FeedItem[],
): { type: string; items: FeedItem[] }[] => {
  const blocks: { type: string; items: FeedItem[] }[] = [];
  for (let i = 0; i < items.length; i += 3) {
    const slice = items.slice(i, i + 3);
    while (slice.length < 3) {
      slice.push({ id: `__ph__${i}`, imageUrl: "", dateISO: "", place: "" });
    }
    const rand = Math.random();
    let type: "Square3" | "L3Left2" | "L3Right2" = "Square3";
    if (rand < 0.33) type = "Square3";
    else if (rand < 0.66) type = "L3Left2";
    else type = "L3Right2";
    blocks.push({ type, items: slice });
  }
  return blocks;
};

const Tile = ({
  it,
  width,
  height,
  radius,
  onPressItem,
}: {
  it: FeedItem;
  width: number;
  height: number;
  radius: number;
  onPressItem?: (item: FeedItem) => void;
}) => {
  if (!it || it.id === "__ph__") return <View style={{ width, height }} />;
  return (
    <Pressable
      onPress={() => onPressItem?.(it)}
      style={{ width, height, borderRadius: radius, overflow: "hidden" }}
    >
      <Image
        source={{ uri: it.imageUrl }}
        style={{ width: "100%", height: "100%", borderRadius: radius }}
      />
    </Pressable>
  );
};

const MyPage = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profileId } = useAuthStore();

  const [answers, setAnswers] = useState<Answer[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [layoutRatios, setLayoutRatios] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [questionsData, setQuestionsData] = useState<QuestionItem[]>([]);
  const [activeTab, setActiveTab] = useState<"grid" | "question">("grid");

  const cacheKey = `my_feed_${profileId}`;
  const profileCacheKey = `profile_${profileId}`;

  const feedItems: FeedItem[] = answers.map((a) => ({
    id: a.answer_id,
    imageUrl: a.photo_url,
    dateISO: a.question_date,
    place: a.caption ?? "",
  }));

  const blocks = answers.length > 0 ? buildRandomBlocks(feedItems) : [];

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  /* ---------------- data ---------------- */

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, nickname, intro")
      .eq("profile_id", profileId)
      .single();
    if (data) {
      setProfile(data);
      await AsyncStorage.setItem(profileCacheKey, JSON.stringify(data));
    }
  };

  const fetchAnswers = async (pageNum: number, append = false) => {
    if (loading) return;
    setLoading(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data } = await supabase
      .from("answers")
      .select("answer_id, question_date, photo_url, caption, created_at")
      .eq("owner_profile_id", profileId)
      .order("question_date", { ascending: false })
      .range(from, to);
    const newAnswers = data || [];
    const merged = append ? [...answers, ...newAnswers] : newAnswers;
    setAnswers(merged);
    setLayoutRatios(generateRandomRatios(merged.length));
    setHasMore(newAnswers.length === PAGE_SIZE);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(merged));
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (profileId) fetchProfile();
    }, [profileId]),
  );

  useEffect(() => {
    if (profileId) fetchAnswers(0);
  }, [profileId]);

  // ✅ N+1 제거: join으로 한 번에 가져오기
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("answers")
        .select("*, daily_questions:question_date(question_text)")
        .eq("owner_profile_id", profileId)
        .not("photo_url", "is", null)
        .is("deleted_at", null)
        .order("question_date", { ascending: false });

      const combined: QuestionItem[] = (data || []).map((a: any) => {
        const dq = a.daily_questions;
        const questionText = Array.isArray(dq)
          ? (dq[0]?.question_text ?? "")
          : (dq?.question_text ?? "");
        return {
          answer: a,
          question: { question_text: questionText },
        };
      });

      setQuestionsData(combined);
      setLoading(false);
    };
    if (profileId) fetchQuestions();
  }, [profileId]);

  /* ---------------- handlers ---------------- */

  const [patternSeed, setPatternSeed] = useState(0);
  const handleRefresh = async () => {
    setPatternSeed(Math.random());
    setRefreshing(true);
    setPage(0);
    setLayoutRatios(generateRandomRatios(answers.length));
    await fetchAnswers(0);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const next = page + 1;
      setPage(next);
      fetchAnswers(next, true);
    }
  };

  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const REMOTE_DD_LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/emoji/default.png`;
  const REMOTE_DD_SURPRISE_URL = `${SUPABASE_URL}/storage/v1/object/public/emoji/surprize.png`;
  const REMOTE_DD_WINK_URL = `${SUPABASE_URL}/storage/v1/object/public/emoji/wink.png`;

  /* ---------------- render parts ---------------- */
  const ListEmptyView = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>아직 사진이 없어요.</Text>
      <Image source={{ uri: REMOTE_DD_LOGO_URL }} style={styles.emptyImage} />
    </View>
  );

  const ListFooter = () => {
    if (loading) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator />
        </View>
      );
    }
    if (activeTab === "question") {
      return (
        <View style={styles.endContainer}>
          <Text style={styles.endText}>끝까지 오실 줄은 몰랐어요!</Text>
          <Image
            source={{ uri: REMOTE_DD_SURPRISE_URL }}
            style={{ width: 120, height: 120, marginTop: 16 }}
          />
        </View>
      );
    }
    return (
      <View style={styles.endContainer}>
        <Text style={styles.endText}>더 올리면 더 내릴 수 있어요!</Text>
        <Image
          source={{ uri: REMOTE_DD_WINK_URL }}
          style={{ width: 120, height: 120, marginTop: 16 }}
        />
      </View>
    );
  };

  // ✅ 통일된 QuestionTile
  const QuestionTile = ({
    index,
    answer,
    question,
  }: {
    index: number;
    answer: Answer;
    question: any;
  }) => (
    <Pressable
      style={styles.questionItem}
      onPress={() =>
        router.push({
          pathname: "/myfeed/answerViewer",
          params: { profileId, initialAnswerId: answer.answer_id },
        })
      }
    >
      {/* ✅ 썸네일 40x40 */}
      <View style={styles.questionThumbWrapper}>
        <Image
          source={{ uri: answer.photo_url }}
          style={styles.questionThumb}
        />
      </View>

      {/* 텍스트 영역 */}
      <View style={styles.questionTextWrapper}>
        {/* ✅ 질문 한 줄 + ... 처리 */}
        <Text
          style={styles.questionListText}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          <Text style={styles.questionNumber}>Q{index + 1}. </Text>
          {question?.question_text ?? ""}
        </Text>
        {/* ✅ 날짜 포맷 통일 */}
        <Text style={styles.questionDate}>
          {formatDate(answer.question_date)}
        </Text>
      </View>

      {/* ✅ 화살표 왼쪽 14 간격 */}
      <View style={{ marginLeft: 14 }}>
        <ArrowIcon width={13.333} height={20} />
      </View>
    </Pressable>
  );

  const currentListData = activeTab === "grid" ? blocks : questionsData;
  const HEADER_HEIGHT = insets.top + 18 + 22 + 18;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.headerOverlay,
          { paddingTop: insets.top + 18, paddingBottom: 18 },
        ]}
      >
        <View style={styles.headerContent}>
          {/* <View style={styles.headerSpacer} /> */}
          <Text style={styles.headerTitle}>나의 피드</Text>
        </View>
      </View>
      <View style={{ height: HEADER_HEIGHT }} />
      <FlatList<ListItem>
        data={currentListData as ListItem[]}
        keyExtractor={(item, index) => {
          if (activeTab === "grid") return `block-${index}`;
          const q = item as QuestionItem;
          return q.answer.answer_id;
        }}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={currentListData.length > 0 ? <ListFooter /> : null}
        ListEmptyComponent={<ListEmptyView />}
        contentContainerStyle={{
          paddingBottom: 12,
          paddingHorizontal: HORIZONTAL_PADDING,
        }}
        ListHeaderComponent={
          <>
            <View style={styles.profileWrapper}>
              <View style={styles.profileSection}>
                <View style={styles.profileContent}>
                  {profile?.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={styles.profilePlaceholder} />
                  )}
                  <View
                    style={{
                      justifyContent: profile?.intro ? "flex-start" : "center",
                    }}
                  >
                    <Text style={styles.profileName}>{profile?.nickname}</Text>
                    {profile?.intro && (
                      <Text style={styles.profileBio}>{profile.intro}</Text>
                    )}
                  </View>
                </View>
                <Pressable
                  onPress={() => router.push("/myfeed/profileSetting")}
                  style={styles.editButton}
                >
                  <EditIcon width={20} height={20} />
                </Pressable>
              </View>
            </View>
            <View style={styles.tabsWrapper}>
              <Toggle
                options={[
                  { key: "grid", label: "그리드" },
                  { key: "question", label: "질문" },
                ]}
                activeKey={activeTab}
                onChangeKey={(key) => setActiveTab(key as "grid" | "question")}
              />
            </View>
          </>
        }
        renderItem={({ item, index }) => {
          if (activeTab === "grid") {
            const gridItem = item as GridItem;
            const width =
              Dimensions.get("window").width - HORIZONTAL_PADDING * 2;
            const handleGridPress = (it: FeedItem) => {
              router.push({
                pathname: "/myfeed/answerViewer",
                params: { profileId, initialAnswerId: it.id },
              });
            };
            switch (gridItem.type) {
              case "Square3":
                return (
                  <Square3Row
                    items={gridItem.items}
                    width={width}
                    onPressItem={handleGridPress}
                  />
                );
              case "L3Left2":
                return (
                  <L3Left2
                    items={gridItem.items}
                    width={width}
                    onPressItem={handleGridPress}
                  />
                );
              case "L3Right2":
                return (
                  <L3Right2
                    items={gridItem.items}
                    width={width}
                    onPressItem={handleGridPress}
                  />
                );
              default:
                return null;
            }
          }
          const qItem = item as QuestionItem;
          return (
            <QuestionTile
              index={index}
              answer={qItem.answer}
              question={qItem.question}
            />
          );
        }}
        onEndReached={activeTab === "question" ? handleLoadMore : undefined}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
};

export default MyPage;

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    backgroundColor: "#FEFEFE",
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  headerContent: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { width: 24 },
  headerTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.51,
    color: "#0D0D0D",
    textAlign: "center",
  },
  profileWrapper: { paddingTop: 12, backgroundColor: "#fff" },
  profileSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#D8D8D833",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileContent: { flexDirection: "row", alignItems: "center" },
  profileImage: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  profilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: "#C2C2C2",
  },
  profileName: {
    fontFamily: "Pretendard-Bold",
    fontSize: 16,
    fontWeight: "600",
  },
  profileBio: {
    fontFamily: "Pretendard-Regular",
    fontSize: 14,
    color: "#929292",
  },
  editButton: { padding: 8 },
  tabsWrapper: { paddingVertical: 20, alignItems: "center" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 15,
    color: "#626262",
    fontWeight: "400",
    lineHeight: 20,
    marginBottom: 20,
    letterSpacing: -0.45,
  },
  emptyImage: { width: 118, height: 118 },
  footer: { paddingVertical: 20 },
  endContainer: {
    paddingVertical: 40,
    alignItems: "center",
    marginBottom: 130,
  },
  endText: {
    fontFamily: "Pretendard-Regular",
    marginTop: 12,
    color: "#626262",
    fontSize: 15,
    fontWeight: "400",
  },
  // ✅ 통일된 질문 탭 스타일
  questionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  questionThumbWrapper: {
    width: 40, // ✅ 40x40
    height: 40,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F2F2F2",
    flexShrink: 0,
    marginRight: 12,
  },
  questionThumb: { width: "100%", height: "100%" },
  questionTextWrapper: { flex: 1 },
  questionNumber: {
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
  questionDate: {
    fontFamily: "Pretendard-Regular",
    color: "#C3C3C3",
    fontSize: 13,
    fontWeight: "400",
    marginTop: 4,
  },
  row: { flexDirection: "row", gap: 5, marginBottom: 5 },
  gridItem: { flex: 2 },
  headerIconWrapper: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
});
