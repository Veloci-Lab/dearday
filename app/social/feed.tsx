import FeedCard, { FeedCardData } from "@/components/FeedCard";
import { supabase } from "@/utils/supabase";
import { BlurView } from "expo-blur";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";

/* ====== 타입 ====== */
interface DailyQuestion {
  question_date: string;
  question_text: string;
  source: string | null;
}

interface AnswerWithProfile {
  answer_id: number;
  owner_profile_id: number;
  photo_url: string;
  created_at: string;
  profiles: {
    nickname: string;
  };
}

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

/* ====== 피드 화면 ====== */
export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    date: string;
    initialPhotoId: string;
    questionText: string;
  }>();

  const [question, setQuestion] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [feedCards, setFeedCards] = useState<FeedCardData[]>([]);

  useEffect(() => {
    // params에서 질문 텍스트가 있으면 사용
    if (params.questionText) {
      setQuestion(
        decodeURIComponent(params.questionText).replace(/\\n/g, "\n"),
      );
    }
    if (params.date) {
      setDate(params.date);
    }
  }, [params.questionText, params.date]);

  // params에서 질문이 없으면 서버에서 가져오기
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

  // 사진 피드 가져오기
  useEffect(() => {
    const fetchFeedPhotos = async () => {
      if (!params.date) return;

      try {
        const { data, error } = await supabase
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

        if (!error && data) {
          const cards: FeedCardData[] = data.map((item: any) => ({
            id: item.answer_id,
            imageUrl: item.photo_url,
            nickname: item.profiles?.nickname || "익명",
            createdAt: formatTimeAgo(item.created_at),
          }));
          setFeedCards(cards);
        }
      } catch (error) {
        console.error("피드 사진 로드 오류:", error);
      }
    };

    fetchFeedPhotos();
  }, [params.date]);

  // 헤더 높이
  const HEADER_HEIGHT = insets.top + 18 + 22 + 18;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* 헤더 */}
      <View
        style={[
          styles.headerOverlay,
          {
            paddingTop: insets.top + 18,
          },
        ]}
      >
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

      {/* 피드 콘텐츠 영역 - 헤더 아래부터 시작, 질문 pill 뒤로 스크롤됨 */}
      <ScrollView
        style={[styles.scrollView, { marginTop: HEADER_HEIGHT }]}
        contentContainerStyle={[styles.feedContainer, { paddingTop: 81 }]}
        showsVerticalScrollIndicator={false}
      >
        {feedCards.map((card) => (
          <FeedCard key={card.id} data={card} />
        ))}
      </ScrollView>

      {/* 질문 영역 - 헤더 아래 81px 공간에서 가운데 정렬, 스크롤 위에 고정 */}
      <View style={[styles.questionArea, { top: HEADER_HEIGHT }]}>
        {date && question && <QuestionPill date={date} question={question} />}
      </View>
    </View>
  );
}

/* ====== 스타일 ====== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  /* 헤더 */
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

  /* 질문 영역 */
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

  /* 스크롤 및 피드 영역 */
  scrollView: {
    flex: 1,
  },
  feedContainer: {
    paddingBottom: 40,
    gap: 20,
  },
});
