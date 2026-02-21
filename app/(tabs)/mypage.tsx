import ArrowIcon from '@/components/icons/ArrowIcon';
import EditIcon from '@/components/icons/EditIcon';
import { commonHeaderOptions } from '@/styles/common';
import { useAuthStore } from "@/utils/authStore";
import { supabase } from '@/utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
  return Array.from({ length: count }, () =>
    ratios[Math.floor(Math.random() * ratios.length)]
  );
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
    <View style={{ flexDirection: 'row', gap, marginBottom: gap }}>
      {items.map((item) => (
        <Tile key={item.id} it={item} width={squareWidth} height={squareWidth} radius={8} onPressItem={onPressItem} />
      ))}
    </View>
  );
};

/* ---------------- 패턴 컴포넌트 ---------------- */

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

  const smallSquare = leftWidth; // 작은 블록은 정사각형
  const largeSquare = rightWidth; // 큰 블록도 정사각형

  return (
    <View style={{ flexDirection: 'row', gap, marginBottom: gap }}>
      <View style={{ width: leftWidth, justifyContent: 'space-between', gap }}>
        <Tile it={items[0]} width={smallSquare} height={smallSquare} radius={6} onPressItem={onPressItem} />
        <Tile it={items[1]} width={smallSquare} height={smallSquare} radius={6} onPressItem={onPressItem} />
      </View>
      <Tile it={items[2]} width={largeSquare} height={largeSquare} radius={8} onPressItem={onPressItem} />
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

  const smallSquare = rightWidth;
  const largeSquare = leftWidth;

  return (
    <View style={{ flexDirection: 'row', gap, marginBottom: gap }}>
      <Tile it={items[0]} width={largeSquare} height={largeSquare} radius={8} onPressItem={onPressItem} />
      <View style={{ width: rightWidth, justifyContent: 'space-between', gap }}>
        <Tile it={items[1]} width={smallSquare} height={smallSquare} radius={6} onPressItem={onPressItem} />
        <Tile it={items[2]} width={smallSquare} height={smallSquare} radius={6} onPressItem={onPressItem} />
      </View>
    </View>
  );
};


/* ---------------- 랜덤 빌드 ---------------- */
const buildRandomBlocks = (items: FeedItem[]): { type: string; items: FeedItem[] }[] => {
  const blocks: { type: string; items: FeedItem[] }[] = [];
  for (let i = 0; i < items.length; i += 3) {
    const slice = items.slice(i, i + 3);
    while (slice.length < 3) {
      slice.push({ id: `__ph__${i}`, imageUrl: '', dateISO: '', place: '' });
    }
    // 랜덤으로 3가지 패턴 선택
    const rand = Math.random();
    let type: 'Square3' | 'L3Left2' | 'L3Right2' = 'Square3';
    if (rand < 0.33) type = 'Square3';
    else if (rand < 0.66) type = 'L3Left2';
    else type = 'L3Right2';

    blocks.push({ type, items: slice });
  }
  return blocks;
};


/* ---------------- component ---------------- */
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
  const { profileId } = useAuthStore();

  const [answers, setAnswers] = useState<Answer[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [layoutRatios, setLayoutRatios] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [questionsData, setQuestionsData] = useState<{ answer: Answer; question: any }[]>([]);

  const [activeTab, setActiveTab] = useState<'grid' | 'question'>('grid');

  const isInitialMount = useRef(true);
  const cacheKey = `my_feed_${profileId}`;
  const profileCacheKey = `profile_${profileId}`;

  const feedItems: FeedItem[] = answers.map((a) => ({
    id: a.answer_id,
    imageUrl: a.photo_url,
    dateISO: a.question_date,
    place: a.caption ?? "",
  }));

  const blocks = answers.length > 0 ? buildRandomBlocks(feedItems) : [];

  /* ---------------- header ---------------- */

  useEffect(() => {
    navigation.setOptions({
      ...commonHeaderOptions,
      headerShown: true,
      headerShadowVisible: false,
      headerTitle: () => <Text style={styles.headerTitle}>나의 피드</Text>,
      headerLeft: () => null,
      headerRight: () => null,
    });
  }, [navigation]);

  /* ---------------- data ---------------- */

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url, nickname, intro')
      .eq('profile_id', profileId)
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
      .from('answers')
      .select('answer_id, question_date, photo_url, caption, created_at')
      .eq('owner_profile_id', profileId)
      .order('question_date', { ascending: false })
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

  // useEffect(() => {
  //   if (!profileId || !isInitialMount.current) return;
  //   isInitialMount.current = false;

  //   (async () => {
  //     const cached = await AsyncStorage.getItem(cacheKey);
  //     if (cached) setAnswers(JSON.parse(cached));
  //     await fetchProfile();
  //     await fetchAnswers(0);
  //   })();
  // }, [profileId]);
  useFocusEffect(
    useCallback(() => {
      if (profileId) {
        fetchProfile();
      }
    }, [profileId])
  );
  useEffect(() => {
    if (profileId) {
      fetchAnswers(0);  
    }
  }, [profileId]);


  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      // answers 가져오기
      const { data: answers } = await supabase
        .from('answers')
        .select('*')
        .eq('owner_profile_id', profileId)
        .order('question_date', { ascending: false });

      // 각 answer에 대한 question 가져오기
      const combined = await Promise.all(
        (answers || []).map(async (a) => {
          const { data: q } = await supabase
            .from('daily_questions')
            .select('*')
            .eq('question_date', a.question_date)
            .single();
          return { answer: a, question: q };
        })
      );

      setQuestionsData(combined);
      setLoading(false);
    };

    fetchQuestions();
  }, []);


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
  

  /* ---------------- render parts ---------------- */
  const ListEmptyView = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>아직 사진이 없어요.</Text>
      <Image
        source={require('@/assets/images/DD/ver_board.png')} // 적절한 이미지 경로로 수정하세요
        style={styles.emptyImage}
      />
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

    if (activeTab === 'question') {
      return (
        <View style={styles.endContainer}>
          <Text style={styles.endText}>끝까지 오실 줄은 몰랐어요!</Text>
          <Image
            source={require('@/assets/images/DD/ver_surprise.png')}
            style={{ width: 120, height: 120, marginTop: 16 }}
          />
        </View>
      );
    }

    return (
      <View style={styles.endContainer}>
        <Text style={styles.endText}>더 올리면 더 내릴 수 있어요!</Text>
        <Image
          source={require('@/assets/images/DD/ver_wink.png')}
          style={{ width: 120, height: 120, marginTop: 16 }}
        />
      </View>
    );
  };


  const QuestionTile = ({ index, answer, question }: { index: number; answer: Answer; question: any }) => (
    <View style={styles.questionItem}>
      <Image source={{ uri: answer.photo_url }} style={styles.questionThumb} />
      <View style={styles.questionTextWrapper}>
        <View style={styles.questionTopRow}>
          <View style={styles.questionRow}>
            <Text style={styles.questionNumber}>Q{index + 1}.</Text>
            <Text style={styles.questionContent}>{question?.question_text}</Text>
          </View>
          <Pressable
            onPress={() => {
              if (!profile) return;
              router.push({
                pathname: '/myfeed/answerViewer',
                params: {
                  profileId: profileId,
                  initialAnswerId: answer.answer_id,
                },
              });
            }}
          >
            <ArrowIcon width={13.333} height={20} style={{ marginRight: 12 }} />
          </Pressable>
        </View>
        <Text style={styles.questionDate}>
          {answer.question_date.replace(/-/g, '.')}
        </Text>
      </View>
    </View>
  );

  const currentListData = activeTab === "grid" ? blocks : questionsData;
  // ---------------- render ----------------
  return (
    <View style={styles.container}>
      <FlatList<ListItem>
        data={currentListData as ListItem[]}

        keyExtractor={(item, index) => {
          if (activeTab === "grid") {
            return `block-${index}`;
          } else {
            const q = item as QuestionItem;
            return q.answer.answer_id;
          }
        }}

        showsVerticalScrollIndicator={false}

        ListFooterComponent={
          currentListData.length > 0 ? <ListFooter /> : null
        }
        ListEmptyComponent={<ListEmptyView />}

        contentContainerStyle={{
          paddingBottom: 12,
          paddingHorizontal: HORIZONTAL_PADDING,
        }}

        ListHeaderComponent={
        <>
          {/* 프로필 (스크롤됨) */}
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
                  <Text style={styles.profileName}>
                    {profile?.nickname}
                  </Text>

                  {profile?.intro && (
                    <Text style={styles.profileBio}>
                      {profile.intro}
                    </Text>
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

          {/* 👇 Sticky 대상 */}
          <View style={styles.tabsWrapper}>
            <View style={styles.tabsContainer}>
              <Pressable
                style={[
                  styles.tabButton,
                  activeTab === "grid" && styles.activeTabButton,
                ]}
                onPress={() => setActiveTab("grid")}
              >
                <Text
                  style={
                    activeTab === "grid"
                      ? styles.activeTabLabel
                      : styles.tabLabel
                  }
                >
                  그리드
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.tabButton,
                  activeTab === "question" && styles.activeTabButton,
                ]}
                onPress={() => setActiveTab("question")}
              >
                <Text
                  style={
                    activeTab === "question"
                      ? styles.activeTabLabel
                      : styles.tabLabel
                  }
                >
                  질문
                </Text>
              </Pressable>
            </View>
          </View>
        </>
      }

        renderItem={({ item, index }) => {
          // 그리드 탭
          if (activeTab === "grid") {
            const gridItem = item as GridItem;
            const width = Dimensions.get("window").width - HORIZONTAL_PADDING*2;

            // 공통 이동 함수
            const handleGridPress = (it: FeedItem) => {
              router.push({
                pathname: '/myfeed/answerViewer',
                params: {
                  profileId: profileId,
                  initialAnswerId: it.id, // 클릭한 이미지의 answer_id
                },
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
                    
                  />
                );

              default:
                return null;
            }
          }

          // 질문 탭
          const qItem = item as QuestionItem;
          return (
            <QuestionTile
              index={index}
              answer={qItem.answer}
              question={qItem.question}
            />
          );
        }}

        onEndReached={
          activeTab === "question"
            ? handleLoadMore
            : undefined
        }

        onEndReachedThreshold={0.5}
      />
    </View>
  );
};

export default MyPage;

/* ---------------- styles ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  headerTitle: {
    fontSize: 17,
    fontFamily: 'Pretendard-Bold',
    letterSpacing: -0.51,
  },
  profileWrapper: {
    paddingTop: 12,
    backgroundColor: '#fff',
  },
  profileSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F2F2F2',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  profileContent: { flexDirection: 'row', alignItems: 'center' },
  profileImage: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  profilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: "#C2C2C2",
  },
  profileName: { fontFamily: 'Pretendard-Bold', fontSize: 16, fontWeight: '600' },
  profileBio: { fontFamily: 'Pretendard-Regular', fontSize: 14, color: '#929292' },
  editButton: { padding: 8 },

  tabsWrapper: { paddingVertical: 20, alignItems: 'center' },
  tabsWrapperGrid: {
    backgroundColor: 'transparent',    
    pointerEvents: 'box-none', 
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F1F1',
    borderRadius: 20,
    padding: 2,
  },
  tabButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  activeTabButton: { backgroundColor: '#fff' },
  tabLabel: { fontFamily: 'Pretendard-SemiBold', color: '#929292' },
  activeTabLabel: { fontFamily: 'Pretendard-SemiBold', color: '#5B8DEF', fontWeight: '600' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 15,
    color: '#626262',
    fontWeight: 400,
    lineHeight: 20,
    marginBottom: 20,
    letterSpacing: -0.45,
  },
  emptyImage: {
    width: 118,
    height: 118,
  },
  footer: { paddingVertical: 20 },
  endContainer: { paddingVertical: 40, alignItems: 'center', marginBottom: 130 },
  endText: { fontFamily: 'Pretendard-Regular', marginTop: 12, color: '#626262', fontSize: 15, fontWeight: '400' },

  row: {
    flexDirection: 'row',
    gap: 5,           
    marginBottom: 5,
  },
  gridItem: {
    flex: 2,          
  },

  questionItem: {
    flexDirection: 'row',      
    paddingVertical: 10,
    paddingHorizontal: 3,
    alignItems: 'center',   
    gap: 14,                   
    borderRadius: 10,
  },
  questionThumb: {
    width: 40,
    height: 40,
    flexShrink: 0,
    gap: 14,      
    borderRadius: 10,           
  },
  questionTextWrapper: {
    flex: 1,                     
  },
  questionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',     
    justifyContent: 'space-between',                              
  },
  questionRow: {
    flexDirection: 'row',       
    alignItems: 'flex-start',
    flexWrap: 'wrap',     
    marginBottom: 2,     
    flexShrink: 1,
  },
  questionNumber: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 13,
    color: '#5B8DEF',
    fontStyle: 'normal',
    fontWeight: 400,
    letterSpacing: -0.39,
    marginRight: 4,
  },
  questionContent: {
    textOverflow: 'ellipsis',
    fontFamily: "HakgyoansimBadasseugi-L",
    color: '#0D0D0D',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: 400,
    letterSpacing: -0.39,
  },
  questionDate: {
    fontFamily: 'Pretendard-Regular',
    color: '#C3C3C3',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: 400,
  },
});