import { EmojiAddIcon } from "@/components/icons/EmojiAddIcon";
import { commonHeaderOptions } from "@/styles/common";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

const { width } = Dimensions.get("window");

interface Reaction {
  reaction_id: string;
  emoji: string;
  count: number;
}

interface Answer {
  answer_id: string;
  photo_url: string;
  caption: string;
  question_date: string;
  updated_at: string; // 시간 표시용
  question_text?: string;
  answer_reaction?: Reaction[];
}

export default function AnswerViewerScreen() {
  const navigation = useNavigation();
  const { profileId, initialAnswerId } = useLocalSearchParams<{
    profileId: string;
    initialAnswerId: string;
  }>();

  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState<string>("사용자"); // 기본값
  const [isMyFeed, setIsMyFeed] = useState<boolean>(true);
  const [initialIndex, setInitialIndex] = useState(0);
  const flatListRef = useRef<FlatList<Answer>>(null);

  // 시간 포맷 함수 (ISO string -> HH시 mm분)
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours}시 ${minutes < 10 ? `0${minutes}` : minutes}분`;
  };

  // 1. 헤더 설정
  // 피드와 동일한 ArrowLeft 아이콘
  const ArrowLeft = () => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12.5659 19.4341C12.8783 19.7465 12.8783 20.2531 12.5659 20.5655C12.2535 20.8779 11.7469 20.8779 11.4345 20.5655L3.43451 12.5655C3.12209 12.2531 3.12209 11.7465 3.43451 11.4341L11.4345 3.43412C11.7469 3.1217 12.2535 3.1217 12.5659 3.43412C12.8783 3.74654 12.8783 4.25307 12.5659 4.56549L5.93157 11.1998L19.9998 11.1998C20.4416 11.1998 20.7998 11.558 20.7998 11.9998C20.7998 12.4416 20.4416 12.7998 19.9998 12.7998L5.93157 12.7998L12.5659 19.4341Z"
        fill="#0D0D0D"
      />
    </Svg>
  );

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

  // 2. 데이터(프로필 & 답변 리스트) 가져오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. 닉네임 가져오기 (컬럼명을 id로 시도해 보세요 만약 profile_id가 아니라면)
        const { data: profileData } = await supabase
          .from("profiles")
          .select("nickname")
          .eq("profile_id", profileId) // 혹은 "profile_id"
          .single();

        if (profileData) setNickname(profileData.nickname);

        // 내 피드 여부 판별
        const { data: myProfile } = await supabase.auth.getUser();
        if (myProfile?.user?.id) {
          // 내 프로필 id와 현재 피드의 profileId 비교
          const { data: myProfileRow } = await supabase
            .from("profiles")
            .select("profile_id")
            .eq("uid", myProfile.user.id)
            .single();
          if (
            myProfileRow &&
            String(myProfileRow.profile_id) === String(profileId)
          ) {
            setIsMyFeed(true);
          } else {
            setIsMyFeed(false);
          }
        }

        // 2. 답변 가져오기
        const { data, error } = await supabase
          .from("answers")
          .select(`*, answer_reactions (*)`)
          .eq("owner_profile_id", profileId)
          .is("deleted_at", null)
          .order("question_date", { ascending: false }); // DB 번호 기준으로 역순 정렬

        if (!error && data) {
          setAnswers(data);
          if (initialAnswerId) {
            const index = data.findIndex(
              (a) => String(a.answer_id) === String(initialAnswerId),
            );
            if (index >= 0) setInitialIndex(index);
          }
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    console.log("answers:", answers.length, "index:", initialIndex);
  }, [profileId, initialAnswerId]);

  // 3. 개별 피드 아이템 렌더링
  const renderItem = ({ item, index }: { item: Answer; index: number }) => {
    // 역순일 때 번호 계산 (예: 전체 10개 중 첫번째 아이템은 Q10)
    const questionNumber = index + 1;
    return (
      <View style={styles.feedItem}>
        {/* 질문 헤더 영역 */}
        <View style={styles.questionSection}>
          <Text style={styles.questionText}>
            <Text style={styles.questionNumber}>Q{questionNumber}. </Text>
            {item.question_text || "오늘 찍은 사진 중 가장 마음에 드는 사진은?"}
          </Text>
          <TouchableOpacity>
            <Ionicons name="ellipsis-vertical" size={18} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* 이미지 영역 */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.photo_url }} style={styles.photo} />
        </View>

        {/* 푸터 영역 (작성자 및 리액션) */}
        <View style={styles.footerSection}>
          <View>
            <Text style={styles.username}>{nickname}</Text>
            <Text style={styles.timeText}>{formatTime(item.updated_at)}</Text>
          </View>

          <View style={styles.reactionRow}>
            {item.answer_reaction && item.answer_reaction.length > 0
              ? item.answer_reaction.map((reaction) => (
                  <View key={reaction.reaction_id} style={styles.reactionBadge}>
                    <Text style={styles.reactionText}>
                      {reaction.emoji} {reaction.count}
                    </Text>
                  </View>
                ))
              : null}
            <TouchableOpacity style={styles.addEmojiBtn}>
              <EmojiAddIcon />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading || initialIndex === null) {
    return <View style={{ flex: 1, backgroundColor: "white" }} />;
  }

  return (
    <FlatList
      ref={flatListRef}
      data={answers}
      keyExtractor={(item) => item.answer_id}
      renderItem={renderItem} // 기존 renderItem 함수 사용
      initialScrollIndex={initialIndex}
      getItemLayout={(data, index) => ({
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
      contentContainerStyle={{ backgroundColor: "#fff" }}
    />
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold", // 폰트 파일이 없을 경우 대비
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
    fontWeight: 400,
    letterSpacing: -0.45,
    marginRight: 4,
  },
  questionText: {
    textOverflow: "ellipsis",
    fontFamily: "Pretendard-Regular",
    color: "#0D0D0D",
    fontSize: 17,
    fontStyle: "normal",
    fontWeight: 400,
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
    fontWeight: 600,
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
});
