import PhotoGrid, { PhotoGridItem } from "@/components/PhotoGrid";
import Toggle from "@/components/Toggle";
import { supabase } from "@/utils/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";

/* ====== 상수 ====== */
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SEEN_FRIENDS_KEY = "@seen_friend_ids";

const getAppLaunchDate = (): Date => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const APP_LAUNCH_DATE = getAppLaunchDate();

/* ====== 타입 ====== */
interface DailyQuestion {
  question_date: string;
  question_text: string;
  source: string | null;
}

/* ====== 유틸리티 ====== */
const toDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getDaysInMonth = (year: number, month: number): Date[] => {
  const days: Date[] = [];
  const count = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= count; i++) {
    days.push(new Date(year, month, i));
  }
  return days;
};

/* ====== SVG 아이콘 ====== */
const ChevronLeft = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18L9 12L15 6"
      stroke="#0D0D0D"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronRight = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 6L15 12L9 18"
      stroke="#0D0D0D"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
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

/* ====== 자물쇠 아이콘 ====== */
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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const DDLogo_URL = `${SUPABASE_URL}/storage/v1/object/public/emoji/blur.png`;
const DDSurprised_URL = `${SUPABASE_URL}/storage/v1/object/public/emoji/surprise.png`;
const DDSleep_URL = `${SUPABASE_URL}/storage/v1/object/public/emoji/sleep.png`;

/* ====== 피드 끝 표시 ====== */
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

/* ====== 친구 없음 표시 ====== */
function EmptyFriends() {
  return (
    <View style={styles.emptyFriendsContainer}>
      <Text style={styles.emptyFriendsText}>아직 친구가 없어요.</Text>
      <Image
        source={{ uri: DDSleep_URL }}
        style={styles.emptyFriendsImage}
        transition={200}
        cachePolicy="disk"
      />
    </View>
  );
}

/* ====== 잠금 오버레이 ====== */
function LockedOverlay() {
  return (
    <View style={styles.lockedContainer}>
      <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(255,255,255,0)", "#FFFFFF"]}
        locations={[0, 0.8641]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.logoContainer}>
        <Image
          source={{ uri: DDLogo_URL }}
          style={styles.logo}
          transition={200}
          cachePolicy="disk"
        />
      </View>
      <View style={styles.lockedContent}>
        <LockIcon />
        <Text style={styles.lockedText}>
          오늘의 사진을 올려서 잠금해제하세요!
        </Text>
      </View>
    </View>
  );
}

/* ====== 월 네비게이션 ====== */
interface MonthNavProps {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  canGoNext: boolean;
}

function MonthNav({ year, month, onPrev, onNext, canGoNext }: MonthNavProps) {
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <View style={styles.monthNavContainer}>
      <Pressable style={styles.monthNavArrow} onPress={onPrev}>
        <ChevronLeft />
      </Pressable>
      <View style={styles.monthNavPill}>
        <Text style={styles.monthNavText}>
          {MONTH_NAMES[month]} {year}
        </Text>
      </View>
      <Pressable
        style={[styles.monthNavArrow, !canGoNext && { opacity: 0.3 }]}
        onPress={onNext}
        disabled={!canGoNext}
      >
        <ChevronRight />
      </Pressable>
    </View>
  );
}

/* ====== 날짜 아이템 ====== */
interface DayItemProps {
  date: Date;
  isSelected: boolean;
  isDisabled: boolean;
  onPress: () => void;
}

function DayItem({ date, isSelected, isDisabled, onPress }: DayItemProps) {
  const dayNum = date.getDate();
  const dayLabel = DAYS_OF_WEEK[date.getDay()];

  return (
    <View style={styles.dayItemWrapper}>
      <Pressable
        style={[
          styles.dayItem,
          isSelected && styles.dayItemSelected,
          isDisabled && styles.dayItemDisabled,
        ]}
        onPress={onPress}
        disabled={isDisabled}
      >
        <Text
          style={[
            styles.dayNumber,
            isSelected && styles.dayNumberSelected,
            isDisabled && styles.dayNumberDisabled,
          ]}
        >
          {String(dayNum).padStart(2, "0")}
        </Text>
        <Text
          style={[
            styles.dayLabel,
            isSelected && styles.dayLabelSelected,
            isDisabled && styles.dayLabelDisabled,
          ]}
        >
          {dayLabel}
        </Text>
      </Pressable>
    </View>
  );
}

/* ====== 날짜 스크롤러 ====== */
interface DayScrollerProps {
  days: Date[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoNext: boolean;
}

function DayScroller({
  days,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  canGoNext,
}: DayScrollerProps) {
  const flatListRef = useRef<FlatList>(null);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    const idx = days.findIndex((d) => isSameDay(d, selectedDate));
    if (idx >= 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: idx,
          animated: true,
          viewPosition: 0.5,
        });
      }, 100);
    }
  }, [selectedDate, days]);

  const isDayDisabled = (date: Date): boolean => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized < APP_LAUNCH_DATE || normalized > today;
  };

  const handleScrollEndDrag = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const offsetX = contentOffset.x;
    const maxOffsetX = contentSize.width - layoutMeasurement.width;
    const THRESHOLD = 50;

    if (offsetX < -THRESHOLD) {
      onPrevMonth();
      return;
    }
    if (offsetX > maxOffsetX + THRESHOLD && canGoNext) {
      onNextMonth();
      return;
    }
  };

  return (
    <FlatList
      ref={flatListRef}
      data={days}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dayScrollerContent}
      style={styles.dayScrollerList}
      keyExtractor={(item) => toDateString(item)}
      getItemLayout={(_, index) => ({
        length: 69,
        offset: (69 + 7) * index,
        index,
      })}
      onScrollEndDrag={handleScrollEndDrag}
      scrollEventThrottle={16}
      onScrollToIndexFailed={(info) => {
        flatListRef.current?.scrollToOffset({
          offset: info.averageItemLength * info.index,
          animated: true,
        });
      }}
      renderItem={({ item }) => (
        <DayItem
          date={item}
          isSelected={isSameDay(item, selectedDate)}
          isDisabled={isDayDisabled(item)}
          onPress={() => onSelectDate(item)}
        />
      )}
    />
  );
}

/* ====== 질문 섹션 ====== */
interface QuestionDisplayProps {
  question: string;
  isLoading: boolean;
}

function QuestionDisplay({ question, isLoading }: QuestionDisplayProps) {
  return (
    <View style={styles.questionContainer}>
      <Text style={styles.questionText}>
        {isLoading ? "질문을 불러오는 중..." : question}
      </Text>
    </View>
  );
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/* ====== 소셜/친구 탭 타입 ====== */
type TabType = "social" | "friend";

const SOCIAL_TOGGLE_OPTIONS = [
  { key: "social", label: "소셜" },
  { key: "friend", label: "친구" },
];

/* ====== 소셜 화면 ====== */
export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const SocialGradient = require("@/assets/images/backgrounds/social_gradient.png");
  const scrollY = useRef(new Animated.Value(0)).current;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [questionMap, setQuestionMap] = useState<Record<string, DailyQuestion>>({});
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("social");
  const [shuffledSocialPhotos, setShuffledSocialPhotos] = useState<PhotoGridItem[]>([]);
  const [shuffledFriendPhotos, setShuffledFriendPhotos] = useState<PhotoGridItem[]>([]);
  const [myProfileId, setMyProfileId] = useState<number | null>(null);
  const [hasUploadedForDate, setHasUploadedForDate] = useState(false);
  const [hasFriendNotification, setHasFriendNotification] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ friendProfileIds를 ref로 관리 → 변경돼도 사진 fetch useEffect 재트리거 안 함
  const friendProfileIdsRef = useRef<number[]>([]);

  // 새로고침: 현재 데이터를 다시 셔플
  const handleRefresh = async () => {
    setRefreshing(true);
    // 현재 날짜 사진을 새로 fetch해서 셔플 (ref 최신값 사용)
    await fetchPhotosForDate(selectedDate);
    await refreshFriendIds(false); // 사진 재fetch 없이 친구 목록/알림만 갱신
    setRefreshing(false);
  };

  // 친구 알림 확인 함수
  const checkFriendNotification = async (profileId: number) => {
    try {
      const { data: pendingRequests } = await supabase
        .from("follows")
        .select("follower_profile_id")
        .eq("followee_profile_id", profileId)
        .eq("status", "pending");

      if ((pendingRequests?.length ?? 0) > 0) {
        setHasFriendNotification(true);
        return;
      }

      const { data: asFollowee } = await supabase
        .from("follows")
        .select("follower_profile_id")
        .eq("followee_profile_id", profileId)
        .eq("status", "accepted");

      if (asFollowee && asFollowee.length > 0) {
        let seenFriendIds: Set<number> = new Set();
        try {
          const stored = await AsyncStorage.getItem(SEEN_FRIENDS_KEY);
          if (stored) {
            seenFriendIds = new Set(JSON.parse(stored));
          }
        } catch (e) {
          console.error("AsyncStorage 읽기 오류:", e);
        }

        const hasNewFriend = asFollowee.some(
          (r: any) => !seenFriendIds.has(r.follower_profile_id),
        );

        if (hasNewFriend) {
          setHasFriendNotification(true);
          return;
        }
      }

      setHasFriendNotification(false);
    } catch (error) {
      console.error("친구 알림 확인 오류:", error);
    }
  };

  // ✅ 사진 fetch 함수 분리 (ref에서 friendProfileIds 읽음)
  // currentProfileId: state 타이밍 문제 방지용 (최초 로드 시 직접 전달)
  const fetchPhotosForDate = async (date: Date, currentProfileId?: number | null) => {
    const dateStr = toDateString(date);
    const profileId = currentProfileId !== undefined ? currentProfileId : myProfileId;

    try {
      const { data: allPhotos, error } = await supabase
        .from("answers")
        .select(
          `
          answer_id,
          owner_profile_id,
          photo_url,
          profiles:owner_profile_id (is_public)
        `,
        )
        .eq("question_date", dateStr)
        .not("photo_url", "is", null)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (!error && allPhotos) {
        const mapped: PhotoGridItem[] = allPhotos.map((item: any) => ({
          id: item.answer_id,
          image_url: item.photo_url,
          user_id: String(item.owner_profile_id),
          is_public: item.profiles?.is_public ?? false,
        }));

        // 소셜: 공개 계정만 셔플
        const publicPhotos = mapped.filter((p) => p.is_public === true);
        setShuffledSocialPhotos(shuffleArray(publicPhotos));

        // 친구: ref에서 최신 친구 ID 읽기 → useEffect 의존성 불필요
        const currentFriendIds = friendProfileIdsRef.current;
        if (currentFriendIds.length > 0) {
          const friendSet = new Set(currentFriendIds.map(String));
          const friendFiltered = mapped.filter(
            (p) => p.user_id && friendSet.has(p.user_id),
          );
          setShuffledFriendPhotos(shuffleArray(friendFiltered));
        } else {
          setShuffledFriendPhotos([]);
        }

        // 내 업로드 여부 확인 (직접 전달받은 profileId 우선 사용)
        if (profileId) {
          const myPhoto = allPhotos.find(
            (item: any) => item.owner_profile_id === profileId,
          );
          setHasUploadedForDate(!!myPhoto);
        }
      }
    } catch (error) {
      console.error("사진 로드 오류:", error);
    }
  };

  // 내 프로필 + 친구 목록 최초 로드
  useEffect(() => {
    const loadMyProfileAndFriends = async () => {
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

        const profileId = profileData.profile_id;
        setMyProfileId(profileId);

        const { data: asFollower } = await supabase
          .from("follows")
          .select("followee_profile_id")
          .eq("follower_profile_id", profileId)
          .eq("status", "accepted");

        const { data: asFollowee } = await supabase
          .from("follows")
          .select("follower_profile_id")
          .eq("followee_profile_id", profileId)
          .eq("status", "accepted");

        const friendIds = new Set<number>();
        asFollower?.forEach((r: any) => friendIds.add(r.followee_profile_id));
        asFollowee?.forEach((r: any) => friendIds.add(r.follower_profile_id));

        // ✅ ref에 저장 후 즉시 사진 fetch (친구 ID + profileId 모두 준비된 상태로)
        friendProfileIdsRef.current = [...friendIds];

        await fetchPhotosForDate(today, profileId);
        await checkFriendNotification(profileId);
      } catch (error) {
        console.error("프로필/친구 로드 오류:", error);
      }
    };

    loadMyProfileAndFriends();
  }, []);

  // 날짜 변경 시 사진 fetch (최초 로드는 위 useEffect에서 처리)
  useEffect(() => {
    if (myProfileId === null) return; // 프로필 로드 전엔 스킵 (위에서 처리)
    fetchPhotosForDate(selectedDate);
  }, [selectedDate]);

  const daysInMonth = useMemo(
    () => getDaysInMonth(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  const canGoNext =
    currentYear < today.getFullYear() ||
    (currentYear === today.getFullYear() && currentMonth < today.getMonth());

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key as TabType);
  };

  useEffect(() => {
    fetchQuestion(selectedDate);
  }, [selectedDate]);

  const fetchQuestion = async (date: Date) => {
    const dateStr = toDateString(date);
    if (questionMap[dateStr]) return;

    setIsLoadingQuestion(true);
    try {
      const { data, error } = await supabase
        .from("daily_questions")
        .select("*")
        .eq("question_date", dateStr)
        .single();

      if (!error && data) {
        setQuestionMap((prev) => ({ ...prev, [dateStr]: data }));
      } else {
        setQuestionMap((prev) => ({
          ...prev,
          [dateStr]: {
            question_date: dateStr,
            question_text: "오늘 하루는 어땠나요?",
            source: null,
          },
        }));
      }
    } catch (error) {
      console.error("질문 로드 오류:", error);
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  // ✅ refreshFriendIds: fetchPhotos 여부를 파라미터로 제어
  const refreshFriendIds = async (refetchPhotos = true) => {
    if (!myProfileId) return;
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

      const newIds = [...friendIds];

      // 실제로 친구 목록이 바뀐 경우에만 ref 업데이트 + 사진 재fetch
      const prevIds = friendProfileIdsRef.current;
      const changed =
        newIds.length !== prevIds.length ||
        newIds.some((id) => !prevIds.includes(id));

      if (changed) {
        friendProfileIdsRef.current = newIds;
        if (refetchPhotos) {
          await fetchPhotosForDate(selectedDate);
        }
      }

      await checkFriendNotification(myProfileId);
    } catch (error) {
      console.error("친구 목록 새로고침 오류:", error);
    }
  };

  // ✅ useFocusEffect: 알림만 확인, 친구 목록 변경 시에만 사진 재fetch
  useFocusEffect(
    useCallback(() => {
      if (myProfileId) {
        refreshFriendIds(true); // 친구 목록 바뀐 경우에만 내부에서 재fetch
      }
    }, [myProfileId]),
  );

  const currentPhotos =
    activeTab === "social" ? shuffledSocialPhotos : shuffledFriendPhotos;

  const currentQuestion =
    questionMap[toDateString(selectedDate)]?.question_text?.replace(
      /\\n/g,
      "\n",
    ) || "";

  const TAB_BAR_HEIGHT = 72;
  const TAB_BAR_BOTTOM_OFFSET = Math.max(insets.bottom, 8) + 10;
  const paddingBottom = TAB_BAR_BOTTOM_OFFSET + TAB_BAR_HEIGHT;

  const HEADER_HEIGHT = insets.top + 18 + 22 + 18;

  const headerBackgroundColor = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: ["rgba(255,255,255,0)", "rgba(255,255,255,1)"],
    extrapolate: "clamp",
  });

  const handlePhotoPress = (photo: PhotoGridItem) => {
    const dateStr = toDateString(selectedDate);
    const questionText = questionMap[dateStr]?.question_text || "";
    router.push({
      pathname: "/social/feed",
      params: {
        date: dateStr,
        initialPhotoId: photo.id,
        questionText: encodeURIComponent(questionText),
        mode: activeTab,
      },
    });
  };

  const showEndOfFeed = currentPhotos.length >= 12;

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Image
          source={SocialGradient}
          style={styles.backgroundImage}
          resizeMode="cover"
          transition={200}
          cachePolicy="disk"
        />

        <View style={{ height: HEADER_HEIGHT }} />

        <MonthNav
          year={currentYear}
          month={currentMonth}
          onPrev={handlePrevMonth}
          onNext={handleNextMonth}
          canGoNext={canGoNext}
        />

        <DayScroller
          days={daysInMonth}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          canGoNext={canGoNext}
        />

        <QuestionDisplay
          question={currentQuestion}
          isLoading={isLoadingQuestion}
        />

        {!hasUploadedForDate ? (
          <View style={styles.lockedSection}>
            <View style={styles.toggleContainer}>
              <Toggle
                options={SOCIAL_TOGGLE_OPTIONS}
                activeKey={activeTab}
                onChangeKey={handleTabChange}
              />
            </View>
            <View style={styles.photoGridContainer}>
              <PhotoGrid
                photos={currentPhotos}
                onPressPhoto={handlePhotoPress}
              />
            </View>
            <LockedOverlay />
          </View>
        ) : currentPhotos.length > 0 ? (
          <>
            <View style={styles.toggleContainer}>
              <Toggle
                options={SOCIAL_TOGGLE_OPTIONS}
                activeKey={activeTab}
                onChangeKey={handleTabChange}
              />
            </View>
            <View style={styles.photoGridContainer}>
              <PhotoGrid
                photos={currentPhotos}
                onPressPhoto={handlePhotoPress}
              />
            </View>
            {showEndOfFeed && <EndOfFeed />}
          </>
        ) : activeTab === "friend" ? (
          <>
            <View style={styles.toggleContainer}>
              <Toggle
                options={SOCIAL_TOGGLE_OPTIONS}
                activeKey={activeTab}
                onChangeKey={handleTabChange}
              />
            </View>
            <EmptyFriends />
          </>
        ) : (
          <>
            <View style={styles.toggleContainer}>
              <Toggle
                options={SOCIAL_TOGGLE_OPTIONS}
                activeKey={activeTab}
                onChangeKey={handleTabChange}
              />
            </View>
            <View style={styles.photoGridContainer}>
              <PhotoGrid
                photos={currentPhotos}
                onPressPhoto={handlePhotoPress}
              />
            </View>
          </>
        )}
      </Animated.ScrollView>

      <Animated.View
        style={[
          styles.headerOverlay,
          {
            paddingTop: insets.top + 18,
            backgroundColor: headerBackgroundColor,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>소셜</Text>
          <Pressable
            style={styles.headerIconWrapper}
            onPress={() => router.push("/social/friends")}
          >
            <PersonIcon hasNotification={hasFriendNotification} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

/* ====== 스타일 ====== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    width: "100%",
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
  },
  headerContent: {
    width: 342,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSpacer: {
    width: 24,
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
  monthNavContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 13,
    marginTop: 18,
  },
  monthNavArrow: {
    width: 40,
    height: 40,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(254, 254, 254, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  monthNavPill: {
    height: 40,
    paddingHorizontal: 15,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    borderRadius: 20,
    backgroundColor: "rgba(254, 254, 254, 0.5)",
  },
  monthNavText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.48,
    color: "#0D0D0D",
  },
  dayScrollerList: {
    height: 93,
    marginTop: 12,
  },
  dayScrollerContent: {
    paddingHorizontal: 13,
    gap: 7,
    alignItems: "center",
  },
  dayItemWrapper: {
    width: 69,
    height: 93,
    justifyContent: "center",
    alignItems: "center",
  },
  dayItem: {
    width: 69,
    height: 77,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 11,
    borderRadius: 15,
    backgroundColor: "rgba(254, 254, 254, 0.5)",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  dayItemSelected: {
    height: 93,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#84AAF2",
    backgroundColor: "#E4EEFF",
  },
  dayItemDisabled: {
    opacity: 0.5,
  },
  dayNumber: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 22,
    lineHeight: 28,
    color: "#0D0D0D",
  },
  dayNumberSelected: {
    color: "#5B8DEF",
  },
  dayNumberDisabled: {
    color: "#0D0D0D",
  },
  dayLabel: {
    fontFamily: "Pretendard",
    fontSize: 13,
    lineHeight: 18,
    color: "#626262",
  },
  dayLabelSelected: {
    color: "#5B8DEF",
  },
  dayLabelDisabled: {
    color: "#626262",
  },
  questionContainer: {
    paddingHorizontal: 32,
    marginTop: 47,
    alignItems: "center",
  },
  questionText: {
    fontFamily: "HakgyoansimBadasseugi-L",
    fontSize: 24,
    fontWeight: "300",
    letterSpacing: -1.2,
    color: "#0D0D0D",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0.5,
  },
  toggleContainer: {
    alignItems: "center",
    marginTop: 38,
    zIndex: 2,
  },
  photoGridContainer: {
    marginTop: 21,
  },
  lockedSection: {
    position: "relative",
    minHeight: 439,
    overflow: "hidden",
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
  lockedContent: {
    alignItems: "center",
    gap: 8,
  },
  lockedText: {
    fontFamily: "Pretendard",
    fontSize: 17,
    fontWeight: "400",
    lineHeight: 20,
    letterSpacing: -0.51,
    color: "#0D0D0D",
    textAlign: "center",
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 130,
    height: 130,
  },
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
  endOfFeedImage: {
    width: 118,
    height: 118,
  },
  emptyFriendsContainer: {
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 80,
    gap: 26,
  },
  emptyFriendsText: {
    fontFamily: "Pretendard",
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 20,
    letterSpacing: -0.51,
    color: "#626262",
    textAlign: "center",
  },
  emptyFriendsImage: {
    width: 118,
    height: 118,
  },
});