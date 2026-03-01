import ArrowIcon from "@/components/icons/ArrowIcon";
import EditIcon from "@/components/icons/EditIcon";
import Toggle from "@/components/Toggle";
import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
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

// 프로필 섹션 높이 (paddingTop:12 + marginTop:12 + padding:12*2 + image:50 + paddingBottom:12 정도)
const PROFILE_SECTION_HEIGHT = 110;
// 탭 영역 높이 (paddingVertical:20*2 + Toggle 높이 약 36)
const TAB_SECTION_HEIGHT = 76;

const MyPage = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profileId } = useAuthStore();

  const [answers, setAnswers] = useState<Answer[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [questionsData, setQuestionsData] = useState<QuestionItem[]>([]);
  const [activeTab, setActiveTab] = useState<"grid" | "question">("grid");
  const [blocks, setBlocks] = useState<GridItem[]>([]);

  // 스크롤 추적용 (그리드 탭에서만 사용)
  const scrollY = useRef(new Animated.Value(0)).current;
  // FlatList ref for scrollToTop
  const flatListRef = useRef<any>(null);
  // 프로필 섹션이 사라지는 threshold
  const profileThreshold = PROFILE_SECTION_HEIGHT;

  const cacheKey = `my_feed_${profileId}`;
  const profileCacheKey = `profile_${profileId}`;

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
      .not("photo_url", "is", null)
      .is("deleted_at", null)
      .order("question_date", { ascending: false })
      .range(from, to);
    const newAnswers = data || [];
    const merged = append ? [...answers, ...newAnswers] : newAnswers;
    setAnswers(merged);

    const newFeedItems = merged.map((a) => ({
      id: a.answer_id,
      imageUrl: a.photo_url,
      dateISO: a.question_date,
      place: a.caption ?? "",
    }));
    setBlocks(buildRandomBlocks(newFeedItems));
    setHasMore(newAnswers.length === PAGE_SIZE);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(merged));
    setLoading(false);
    setRefreshing(false);
  };

  const fetchQuestions = async () => {
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
  };

  useFocusEffect(
    useCallback(() => {
      if (profileId) {
        fetchProfile();
        setPage(0);
        fetchAnswers(0);
        fetchQuestions();
      }
    }, [profileId]),
  );

  /* ---------------- handlers ---------------- */

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(0);
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
  const REMOTE_DD_SURPRISE_URL = `${SUPABASE_URL}/storage/v1/object/public/emoji/surprise.png`;
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
      <View style={styles.questionThumbWrapper}>
        <Image
          source={{ uri: answer.photo_url }}
          style={styles.questionThumb}
        />
      </View>
      <View style={styles.questionTextWrapper}>
        <Text
          style={styles.questionListText}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          <Text style={styles.questionNumber}>Q{index + 1}. </Text>
          {question?.question_text ?? ""}
        </Text>
        <Text style={styles.questionDate}>
          {formatDate(answer.question_date)}
        </Text>
      </View>
      <View style={{ marginLeft: 14 }}>
        <ArrowIcon width={13.333} height={20} />
      </View>
    </Pressable>
  );

  const HEADER_HEIGHT = insets.top + 18 + 22 + 18;

  // 그리드 탭에서 스크롤 시 탭이 헤더 아래 고정되는 위치
  // 탭 sticky top = 헤더 높이
  const stickyTabTop = HEADER_HEIGHT;

  // 그리드 탭에서 프로필 opacity/translate 애니메이션
  const profileOpacity = scrollY.interpolate({
    inputRange: [0, profileThreshold * 0.6, profileThreshold],
    outputRange: [1, 0.3, 0],
    extrapolate: "clamp",
  });
  const profileTranslateY = scrollY.interpolate({
    inputRange: [0, profileThreshold],
    outputRange: [0, -20],
    extrapolate: "clamp",
  });

  // 헤더 하단에 탭이 고정되어야 하는 시점 (그리드 탭 전용)
  // 탭이 헤더에 붙어야 하는 scrollY 값 = 프로필 높이
  // 우리는 absolute positioned sticky tab bar를 사용
  const stickyTabOpacity = scrollY.interpolate({
    inputRange: [profileThreshold * 0.8, profileThreshold],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const currentListData = activeTab === "grid" ? blocks : questionsData;

  // 탭 변경 시 scrollY 리셋 + 최상단 이동
  const handleTabChange = (key: string) => {
    setActiveTab(key as "grid" | "question");
    scrollY.setValue(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  return (
    <View style={styles.container}>
      {/* 고정 헤더 */}
      <View
        style={[
          styles.headerOverlay,
          { paddingTop: insets.top + 18, paddingBottom: 18 },
        ]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>나의 피드</Text>
        </View>
      </View>

      {/* 그리드 탭에서만: 스크롤 후 탭 고정 영역 */}
      {activeTab === "grid" && (
        <Animated.View
          style={[
            styles.stickyTabBar,
            {
              top: stickyTabTop,
              opacity: stickyTabOpacity,
            },
          ]}
          pointerEvents={
            // 투명할 때 터치 막기
            undefined
          }
        >
          <Toggle
            options={[
              { key: "grid", label: "그리드" },
              { key: "question", label: "질문" },
            ]}
            activeKey={activeTab}
            onChangeKey={handleTabChange}
          />
        </Animated.View>
      )}

      <View style={{ height: HEADER_HEIGHT }} />

      <Animated.FlatList<ListItem>
        ref={flatListRef}
        data={currentListData as ListItem[]}
        keyExtractor={(item, index) => {
          if (activeTab === "grid") return `block-${index}`;
          const q = item as QuestionItem;
          return q.answer.answer_id;
        }}
        showsVerticalScrollIndicator={false}
        onScroll={
          activeTab === "grid"
            ? Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: true },
              )
            : undefined
        }
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListFooterComponent={currentListData.length > 0 ? <ListFooter /> : null}
        ListEmptyComponent={<ListEmptyView />}
        contentContainerStyle={{
          paddingBottom: 12,
          paddingHorizontal: HORIZONTAL_PADDING,
        }}
        ListHeaderComponent={
          <>
            {/* 프로필: 그리드 탭에서는 스크롤 시 사라짐 */}
            {activeTab === "grid" ? (
              <Animated.View
                style={{
                  opacity: profileOpacity,
                  transform: [{ translateY: profileTranslateY }],
                }}
              >
                <ProfileSection
                  profile={profile}
                  onEditPress={() => router.push("/myfeed/profileSetting")}
                />
              </Animated.View>
            ) : (
              <ProfileSection
                profile={profile}
                onEditPress={() => router.push("/myfeed/profileSetting")}
              />
            )}

            {/* 탭 버튼: 그리드 탭에서는 스크롤 시 사라짐 (sticky tab bar가 대신 보임) */}
            {activeTab === "grid" ? (
              <Animated.View
                style={[styles.tabsWrapper, { opacity: profileOpacity }]}
              >
                <Toggle
                  options={[
                    { key: "grid", label: "그리드" },
                    { key: "question", label: "질문" },
                  ]}
                  activeKey={activeTab}
                  onChangeKey={handleTabChange}
                />
              </Animated.View>
            ) : (
              <View style={styles.tabsWrapper}>
                <Toggle
                  options={[
                    { key: "grid", label: "그리드" },
                    { key: "question", label: "질문" },
                  ]}
                  activeKey={activeTab}
                  onChangeKey={handleTabChange}
                />
              </View>
            )}
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

/* ---------------- ProfileSection 분리 ---------------- */
const ProfileSection = ({
  profile,
  onEditPress,
}: {
  profile: Profile | null;
  onEditPress: () => void;
}) => {
  const router = useRouter();
  return (
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
        <Pressable onPress={onEditPress} style={styles.editButton}>
          <EditIcon width={20} height={20} />
        </Pressable>
      </View>
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
  headerTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.51,
    color: "#0D0D0D",
    textAlign: "center",
  },
  // 스크롤 후 헤더 아래 고정되는 탭 바 (그리드 탭 전용)
  stickyTabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9,
    backgroundColor: "transparent",
    alignItems: "center",
    paddingVertical: 10,
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
  questionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  questionThumbWrapper: {
    width: 40,
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
