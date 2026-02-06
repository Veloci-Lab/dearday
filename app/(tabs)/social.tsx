import Toggle from "@/components/Toggle";
import { supabase } from "@/utils/supabase";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import FriendsScreen from "./screens/FriendsScreen";

/* ====== 상수 ====== */
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// 앱 출시일 (어제 날짜)
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
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
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
  );
}

/* ====== 날짜 스크롤러 ====== */
interface DayScrollerProps {
  days: Date[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}

function DayScroller({ days, selectedDate, onSelectDate }: DayScrollerProps) {
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

  return (
    <FlatList
      ref={flatListRef}
      data={days}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dayScrollerContent}
      keyExtractor={(item) => toDateString(item)}
      getItemLayout={(_, index) => ({
        length: 69,
        offset: (69 + 7) * index,
        index,
      })}
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
  const [questionMap, setQuestionMap] = useState<Record<string, DailyQuestion>>(
    {},
  );
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("social");
  const [showFriends, setShowFriends] = useState(false);

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

  const currentQuestion =
    questionMap[toDateString(selectedDate)]?.question_text?.replace(
      /\\n/g,
      "\n",
    ) || "";

  const TAB_BAR_HEIGHT = 72;
  const TAB_BAR_BOTTOM_OFFSET = Math.max(insets.bottom, 8) + 10;
  const paddingBottom = TAB_BAR_BOTTOM_OFFSET + TAB_BAR_HEIGHT;

  // 헤더 높이
  const HEADER_HEIGHT = insets.top + 18 + 22 + 18;

  // 헤더 배경색: 스크롤에 따라 투명 → 흰색
  const headerBackgroundColor = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: ["rgba(255,255,255,0)", "rgba(255,255,255,1)"],
    extrapolate: "clamp",
  });

  if (showFriends) {
    return <FriendsScreen onBack={() => setShowFriends(false)} />;
  }

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
      >
        {/* 그래디언트 배경: 스크롤 콘텐츠 안에서 absolute, 화면 높이만큼 */}
        <Image
          source={SocialGradient}
          style={styles.backgroundImage}
          resizeMode="cover"
        />

        {/* 헤더 높이만큼 여백 */}
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
        />

        <QuestionDisplay
          question={currentQuestion}
          isLoading={isLoadingQuestion}
        />

        <View style={styles.toggleContainer}>
          <Toggle
            options={SOCIAL_TOGGLE_OPTIONS}
            activeKey={activeTab}
            onChangeKey={(key) => setActiveTab(key as TabType)}
          />
        </View>

        {/* TODO: 사진 그리드 (토글에서 21px 아래, 양옆 11px) */}
      </Animated.ScrollView>

      {/* 헤더: 상단 고정 오버레이, 스크롤에 따라 투명 → 흰색 */}
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
            onPress={() => setShowFriends(true)}
          >
            <PersonIcon hasNotification={false} />
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

  /* 배경 이미지: 그래디언트 영역 내부 absolute */
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    width: "100%",
  },

  /* 헤더 (상단 고정 오버레이) */
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

  /* 월 네비게이션 */
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

  /* 날짜 스크롤러 */
  dayScrollerContent: {
    paddingHorizontal: 13,
    gap: 7,
    marginTop: 12,
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

  /* 질문 */
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

  /* 소셜/친구 토글 */
  toggleContainer: {
    alignItems: "center",
    marginTop: 38,
  },
});
