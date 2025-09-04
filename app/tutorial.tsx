import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// 튜토리얼 데이터
const TUTORIAL_DATA = [
  {
    id: 1,
    title: "Dearday를 \n소개해드릴게요.",
    subtitle: null,
    image: require("@/assets/images/tutorial/Frame1.png"), 
    highlightText: null,
  },
  {
    id: 2,
    title: "기록하고 싶은 순간이 찾아왔나요? 📸",
    subtitle: "알림을 터치하거나 카메라 버튼을 눌러보세요.\n    ",
    image: require("@/assets/images/tutorial/Frame2.png"), 
    highlightText: null,
  },
  {
    id: 3,
    title: "순간의 생생한 감정을 놓치지 마세요! 💭",
    subtitle: "나중에 기억하기 쉽도록, \n사진을 찍을 때의 이야기를 자유롭게 적어주세요",
    image: require("@/assets/images/tutorial/Frame3.png"),
    highlightText: null,
  },
  {
    id: 4,
    title: "오늘의 베스트 컷을 골라보세요! ✨",
    subtitle: "언제든 수정 가능해요.\n    ",
    image: require("@/assets/images/tutorial/Frame4.png"),
    highlightText: null,
  },
  {
    id: 5,
    title: "같은 기록, 다른 매력! 🎨",
    subtitle: "두 기록 스타일을 자유롭게 바꿔보세요.\n마음에 든다면 이미지로 저장까지 !",
    image: require("@/assets/images/tutorial/Frame5.png"),
    highlightText: null,
  },
  {
    id: 6,
    title: "소중한 순간들이 여기 모였어요 💎",
    subtitle: "월간 탭을 눌러서 지난 추억들을 둘러보세요.\n    ",
    image: require("@/assets/images/tutorial/Frame6.png"),
    highlightText: null,
  },
  {
    id: 7,
    title: "미완성 추억들이 기다리고 있어요 ⏳",
    subtitle: "아직 정리되지 않은 사진들이 여기 모여있어요.\n언제든 완성해보세요 !",
    image: require("@/assets/images/tutorial/Frame7.png"),
    highlightText: null,
  },
];


export default function TutorialScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { top, bottom } = useSafeAreaInsets();

  const handleNext = () => {
    if (currentIndex < TUTORIAL_DATA.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({ x: width * nextIndex, animated: true });
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollViewRef.current?.scrollTo({ x: width * prevIndex, animated: true });
    }
  };

  const handleBackButtonPress = () => {
    if (currentIndex > 0) {
      handlePrevious();
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    if (from === "mypage") {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffset / width);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < TUTORIAL_DATA.length) {
      setCurrentIndex(newIndex);
    }
  };

  const isLastPage = currentIndex === TUTORIAL_DATA.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { top: top }]}>
        <Pressable onPress={handleBackButtonPress} hitSlop={10} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color="#000" />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {TUTORIAL_DATA.map((item, index) => (
          <View key={item.id} style={styles.page}>
            <View style={styles.textWrapper}>
              <Text style={[
                  styles.title, 
                  index === 0 && styles.largeTitle, 
                  index === 0 && styles.centeredText
              ]}>
                {item.title}
              </Text>
              {item.subtitle && <Text style={[styles.subtitle, index === 0 && styles.centeredText]}>{item.subtitle}</Text>}
            </View>
            
            <View style={styles.imageContainer}>
              <Image source={item.image} style={styles.image} resizeMode="contain" />
            </View>

            <View /> 
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottom || 20 }]}>
        <View style={styles.pagination}>
          {TUTORIAL_DATA.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
          <Text style={styles.nextButtonText}>
            {isLastPage ? "시작하기" : "다음"}
          </Text>
        </TouchableOpacity>
        
        {/* {!isLastPage && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>건너뛰기</Text>
          </TouchableOpacity>
        )} */}

        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>건너뛰기</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 44,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  page: {
    width: width,
    flex: 1,
    paddingTop: 80, 
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  textWrapper: {
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: "Pretendard-Bold",
    fontSize: 20,
    lineHeight: 32,
    color: "#0F172A",
  },
  largeTitle: {
    fontSize: 28,
    lineHeight: 38,
  },
  subtitle: {
    fontFamily: "Pretendard-Regular",
    fontSize: 15,
    lineHeight: 22,
    color: "#929292",
    marginTop: 12,
  },
  centeredText: {
    textAlign: 'center',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    marginVertical: 20,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  footer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
  },
  activeDot: {
    backgroundColor: "#5B8DEF",
    width: 24,
  },
  inactiveDot: {
    backgroundColor: "#E2E8F0",
  },
  nextButton: {
    backgroundColor: "#5B8DEF",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    fontFamily: "Pretendard-Bold",
    fontSize: 16,
    color: "#fff",
  },
  skipButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  skipButtonText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 14,
    color: "#929292",
  },
});

