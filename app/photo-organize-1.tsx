import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const CARD_WIDTH = SCREEN_WIDTH * 0.6;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.45;

// 임시 카테고리 데이터
const ALL_CATEGORIES = [
  { name: 'package', icon: '📦', emoji: '📦' },
  { name: 'daily', icon: '☀️', emoji: '☀️' },
  { name: 'productivity', icon: '📊', emoji: '📊' },
  { name: 'food', icon: '🍔', emoji: '🍔' },
  { name: 'friends', icon: '👥', emoji: '👥' },
  { name: 'travel', icon: '✈️', emoji: '✈️' },
  { name: 'Gestalogy', icon: '🎨', emoji: '🎨' },
  { name: 'test', icon: '🎨', emoji: '🎨' },
];

type ClassifiedPhoto = {
  photo: string;
  category: string | null;
  note?: string;
};

export default function PhotoOrganize1Screen() {
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [categoryPage, setCategoryPage] = useState(0);
  const [classified, setClassified] = useState<ClassifiedPhoto[]>([]);
  const [note, setNote] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [hoveredCategory, setHoveredCategory] = useState<{ side: 'left' | 'right' | null; index: number } | null>(null);

  // 현재 페이지의 카테고리 (좌 3개, 우 3개)
  const leftCategories = ALL_CATEGORIES.slice(categoryPage * 6, categoryPage * 6 + 3);
  const rightCategories = ALL_CATEGORIES.slice(categoryPage * 6 + 3, categoryPage * 6 + 6);

  // 각 카테고리별 사진 개수
  const getCategoryCount = (categoryName: string) => {
    return classified.filter((c) => c.category === categoryName).length;
  };

  // 갤러리에서 사진 선택
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('사진 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      const uris = result.assets.map((asset) => asset.uri);
      setPhotos([...photos, ...uris]);
    }
  };

  // 분류 완료
  const handleClassify = (category: string | null) => {
    if (currentIndex >= photos.length) return;

    // 삭제인 경우: photos 배열에서 제거
    if (category === null) {
      const newPhotos = photos.filter((_, idx) => idx !== currentIndex);
      setPhotos(newPhotos);
      setFeedbackText('🗑️ 삭제됨');
      setTimeout(() => setFeedbackText(''), 1000);
      setNote('');
      // currentIndex는 유지 (다음 사진이 현재 인덱스로 이동)
      return;
    }

    // 카테고리 분류인 경우
    const newClassified = [
      ...classified,
      { photo: photos[currentIndex], category, note: note.trim() || undefined },
    ];
    setClassified(newClassified);

    // 피드백 표시
    const cat = ALL_CATEGORIES.find(c => c.name === category);
    setFeedbackText(`${cat?.emoji || '📁'} ${category}`);
    setTimeout(() => setFeedbackText(''), 1000);

    setCurrentIndex(currentIndex + 1);
    setNote(''); // 노트 초기화
  };

  // Undo (되돌리기)
  const handleUndo = () => {
    if (classified.length > 0) {
      const lastClassified = classified[classified.length - 1];

      // 마지막 분류를 취소
      setClassified(classified.slice(0, -1));
      setCurrentIndex(currentIndex - 1);

      // 노트 복원 (옵션)
      if (lastClassified.note) {
        setNote(lastClassified.note);
      }
    }
  };

  // 완료
  const handleComplete = () => {
    console.log('=== 사진 분류 완료 ===');
    console.log('총 분류된 사진 수:', classified.length);
    console.log('');

    // 각 사진별로 상세 정보 출력
    classified.forEach((item, index) => {
      console.log(`[사진 ${index + 1}]`);
      console.log('  사진:', item.photo);
      console.log('  카테고리:', item.category || '없음');
      console.log('  노트:', item.note || '없음');
      console.log('');
    });

    // 카테고리별 통계
    const categoryStats: { [key: string]: number } = {};
    classified.forEach((item) => {
      if (item.category) {
        categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
      }
    });
    console.log('카테고리별 통계:', categoryStats);

    alert(`${classified.length}장의 사진을 분류했습니다!`);
    // router.back();
  };

  // 카테고리 페이지 변경
  const totalPages = Math.ceil(ALL_CATEGORIES.length / 6);
  const canGoPrev = categoryPage > 0;
  const canGoNext = categoryPage < totalPages - 1;

  // 사진 선택 전
  if (photos.length === 0) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.emptyContent}>
            <Feather name="image" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>사진을 선택해주세요</Text>
            <Text style={styles.emptySubtitle}>갤러리에서 정리할 사진들을 가져옵니다</Text>

            <Pressable style={styles.emptyButton} onPress={pickImages}>
              <Feather name="folder" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>갤러리에서 선택</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        {/* 상단 헤더 */}
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            {/* 카테고리 페이지 변경 버튼 */}
            <View style={styles.categoryPageButtons}>
              {ALL_CATEGORIES.length > 6 && (
                <>
                  <Pressable
                    onPress={() => setCategoryPage(categoryPage - 1)}
                    disabled={!canGoPrev}
                    style={[styles.pageButton, !canGoPrev && styles.pageButtonDisabled]}
                  >
                    <Feather name="chevron-left" size={20} color={canGoPrev ? "#fff" : "#4A4A4C"} />
                  </Pressable>
                  <Pressable
                    onPress={() => setCategoryPage(categoryPage + 1)}
                    disabled={!canGoNext}
                    style={[styles.pageButton, !canGoNext && styles.pageButtonDisabled]}
                  >
                    <Feather name="chevron-right" size={20} color={canGoNext ? "#fff" : "#4A4A4C"} />
                  </Pressable>
                </>
              )}
            </View>

            <Pressable style={styles.addPhotoButton} onPress={pickImages}>
              <Feather name="upload" size={16} color="#fff" />
              <Text style={styles.addPhotoText}>사진 추가</Text>
            </Pressable>

            <Pressable onPress={handleComplete}>
              <Text style={styles.completeText}>완료</Text>
            </Pressable>
          </View>

          {/* 썸네일 리스트 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbnailScroll}
            contentContainerStyle={styles.thumbnailContent}
          >
            {photos.map((photo, idx) => (
              <View key={idx} style={styles.thumbnailWrapper}>
                <Image source={{ uri: photo }} style={styles.thumbnail} />
                {idx < currentIndex && (
                  <View style={styles.thumbnailCheck}>
                    <Feather name="check" size={12} color="#fff" />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* 메인 콘텐츠 */}
        <View style={styles.mainContent}>
        {/* 왼쪽 카테고리 */}
        <View style={styles.leftCategories}>
          {leftCategories.map((cat, idx) => {
            const isHovered = hoveredCategory?.side === 'left' && hoveredCategory?.index === idx;
            return (
              <View
                key={`left-${idx}`}
                style={[
                  styles.categoryStrip,
                  isHovered && styles.categoryStripHovered
                ]}
              >
                <Text style={styles.categoryCountVertical}>
                  {getCategoryCount(cat.name)}/{photos.length}
                </Text>
                <Text style={styles.categoryNameVertical}>{cat.name}</Text>
                <View style={[
                  styles.categoryEmojiContainer,
                  isHovered && styles.categoryEmojiContainerHovered
                ]}>
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* 중앙 카드 영역 */}
        <View style={styles.cardArea}>
          {/* 진행도 */}
          {!(classified.length === photos.length && photos.length > 0) && (
            <View style={styles.progressBadge}>
              <Text style={styles.progressText}>
                {Math.min(currentIndex + 1, photos.length)}/{photos.length}
              </Text>
            </View>
          )}

          <View style={styles.cardSection}>
            {/* 뒤로가기 버튼 (카드 위 왼쪽) */}
            {classified.length > 0 && (
              <Pressable style={styles.backButton} onPress={handleUndo}>
                <Feather name="arrow-left" size={24} color="#fff" />
              </Pressable>
            )}

            {/* 모든 사진 분류 완료 */}
            {classified.length === photos.length && photos.length > 0 ? (
              <View style={styles.completionCard}>
                <Feather name="check-circle" size={64} color="#5B8DEF" />
                <Text style={styles.completionTitle}>정리완료!</Text>
                <Text style={styles.completionSubtitle}>
                  {photos.length}장의 사진을 분류했습니다
                </Text>
              </View>
            ) : (
              <>
                {/* 카드 스택 */}
                <View style={styles.cardContainer}>
                  {photos.slice(currentIndex, currentIndex + 2).reverse().map((photo, idx, arr) => (
                    <SwipeCard
                      key={`${currentIndex + idx}-${photo}`}
                      photo={photo}
                      isTop={arr.length === 1 ? idx === 0 : idx === 1}
                      leftCategories={leftCategories}
                      rightCategories={rightCategories}
                      onClassify={handleClassify}
                      onHoverCategory={setHoveredCategory}
                    />
                  ))}
                </View>

                {/* 노트 입력 (카드 바로 아래) */}
                <View style={styles.noteInputContainer}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="노트를 입력해주세요"
                    placeholderTextColor="#8E8E93"
                    value={note}
                    onChangeText={setNote}
                  />
                </View>
              </>
            )}
          </View>

          {/* 분류 피드백 */}
          {feedbackText && (
            <View style={styles.feedbackBadge}>
              <Text style={styles.feedbackText}>{feedbackText}</Text>
            </View>
          )}
        </View>

        {/* 오른쪽 카테고리 */}
        <View style={styles.rightCategories}>
          {rightCategories.map((cat, idx) => {
            const isHovered = hoveredCategory?.side === 'right' && hoveredCategory?.index === idx;
            return (
              <View
                key={`right-${idx}`}
                style={[
                  styles.categoryStrip,
                  isHovered && styles.categoryStripHovered
                ]}
              >
                <Text style={styles.categoryCountVertical}>
                  {getCategoryCount(cat.name)}/{photos.length}
                </Text>
                <Text style={styles.categoryNameVertical}>{cat.name}</Text>
                <View style={[
                  styles.categoryEmojiContainer,
                  isHovered && styles.categoryEmojiContainerHovered
                ]}>
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

        {/* 하단 쓰레기통 영역 */}
        <View style={styles.trashZone}>
          <View style={styles.trashCircle}>
            <Feather name="trash-2" size={24} color="#8E8E93" />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// Tinder 스타일 스와이프 카드
function SwipeCard({
  photo,
  isTop,
  leftCategories,
  rightCategories,
  onClassify,
  onHoverCategory,
}: {
  photo: string;
  isTop: boolean;
  leftCategories: Array<{ name: string; icon: string; emoji: string }>;
  rightCategories: Array<{ name: string; icon: string; emoji: string }>;
  onClassify: (category: string | null) => void;
  onHoverCategory: (hover: { side: 'left' | 'right' | null; index: number } | null) => void;
}) {
  const pan = useRef(new Animated.ValueXY()).current;

  // 최신 콜백을 참조하기 위한 ref
  const callbacksRef = useRef({ leftCategories, rightCategories, onClassify, onHoverCategory });
  callbacksRef.current = { leftCategories, rightCategories, onClassify, onHoverCategory };

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });

  // Y 위치로 카테고리 인덱스를 결정하는 함수 (카테고리 개수에 따라 동적)
  const getCategoryIndex = (categoryCount: number, moveY: number) => {
    if (categoryCount === 0) return -1;
    if (categoryCount === 1) return 0;

    // 카테고리 영역 높이 계산 (상단 8, 하단 70 제외)
    const categoryAreaHeight = SCREEN_HEIGHT - 8 - 70;
    const sectionHeight = categoryAreaHeight / categoryCount;

    // moveY에서 상단 오프셋 제거
    const relativeY = moveY - 8;
    const index = Math.floor(relativeY / sectionHeight);

    // 범위 제한
    return Math.max(0, Math.min(categoryCount - 1, index));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
        listener: (event, gestureState) => {
          const CATEGORY_ZONE_WIDTH = 80;
          const isInLeftZone = gestureState.moveX < CATEGORY_ZONE_WIDTH;
          const isInRightZone = gestureState.moveX > SCREEN_WIDTH - CATEGORY_ZONE_WIDTH;

          if (isInLeftZone) {
            const categoryIndex = getCategoryIndex(callbacksRef.current.leftCategories.length, gestureState.moveY);
            callbacksRef.current.onHoverCategory({ side: 'left', index: categoryIndex });
          } else if (isInRightZone) {
            const categoryIndex = getCategoryIndex(callbacksRef.current.rightCategories.length, gestureState.moveY);
            callbacksRef.current.onHoverCategory({ side: 'right', index: categoryIndex });
          } else {
            callbacksRef.current.onHoverCategory(null);
          }
        },
      }),
      onPanResponderRelease: (_, gesture) => {
        const CATEGORY_ZONE_WIDTH = 80; // 카테고리 영역 너비
        const MIN_DRAG_DISTANCE = 10; // 최소 드래그 거리 (탭 방지)

        // hover 상태 초기화
        callbacksRef.current.onHoverCategory(null);

        // 탭인지 드래그인지 확인 (이동 거리가 최소값 이하면 무시)
        const totalDistance = Math.sqrt(gesture.dx * gesture.dx + gesture.dy * gesture.dy);
        if (totalDistance < MIN_DRAG_DISTANCE) {
          // 탭으로 간주, 원위치
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 4,
            useNativeDriver: true,
          }).start();
          return;
        }

        // 카드가 카테고리 영역에 놓였는지 확인
        const isInLeftZone = gesture.moveX < CATEGORY_ZONE_WIDTH;
        const isInRightZone = gesture.moveX > SCREEN_WIDTH - CATEGORY_ZONE_WIDTH;

        // 왼쪽 카테고리 영역에 드롭
        if (isInLeftZone) {
          const categoryIndex = getCategoryIndex(callbacksRef.current.leftCategories.length, gesture.moveY);
          Animated.spring(pan, {
            toValue: { x: -SCREEN_WIDTH - 100, y: gesture.dy },
            useNativeDriver: true,
          }).start(() => {
            const category = callbacksRef.current.leftCategories[categoryIndex];
            if (category) {
              callbacksRef.current.onClassify(category.name);
            }
            pan.setValue({ x: 0, y: 0 });
          });
        }
        // 오른쪽 카테고리 영역에 드롭
        else if (isInRightZone) {
          const categoryIndex = getCategoryIndex(callbacksRef.current.rightCategories.length, gesture.moveY);
          Animated.spring(pan, {
            toValue: { x: SCREEN_WIDTH + 100, y: gesture.dy },
            useNativeDriver: true,
          }).start(() => {
            const category = callbacksRef.current.rightCategories[categoryIndex];
            if (category) {
              callbacksRef.current.onClassify(category.name);
            }
            pan.setValue({ x: 0, y: 0 });
          });
        }
        // 좌우 스와이프 (빠른 스와이프)
        else if (gesture.dx > SWIPE_THRESHOLD) {
          const categoryIndex = getCategoryIndex(callbacksRef.current.rightCategories.length, gesture.moveY);
          Animated.spring(pan, {
            toValue: { x: SCREEN_WIDTH + 100, y: gesture.dy },
            useNativeDriver: true,
          }).start(() => {
            const category = callbacksRef.current.rightCategories[categoryIndex];
            if (category) {
              callbacksRef.current.onClassify(category.name);
            }
            pan.setValue({ x: 0, y: 0 });
          });
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          const categoryIndex = getCategoryIndex(callbacksRef.current.leftCategories.length, gesture.moveY);
          Animated.spring(pan, {
            toValue: { x: -SCREEN_WIDTH - 100, y: gesture.dy },
            useNativeDriver: true,
          }).start(() => {
            const category = callbacksRef.current.leftCategories[categoryIndex];
            if (category) {
              callbacksRef.current.onClassify(category.name);
            }
            pan.setValue({ x: 0, y: 0 });
          });
        }
        // 아래로 스와이프 (쓰레기통)
        else if (gesture.dy > SWIPE_THRESHOLD) {
          Animated.spring(pan, {
            toValue: { x: gesture.dx, y: SCREEN_HEIGHT + 100 },
            useNativeDriver: true,
          }).start(() => {
            callbacksRef.current.onClassify(null);
            pan.setValue({ x: 0, y: 0 });
          });
        }
        // 원위치
        else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 4,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const cardStyle = isTop
    ? {
        transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
      }
    : { opacity: 0.5, transform: [{ scale: 0.92 }] };

  return (
    <Animated.View
      style={[styles.card, cardStyle]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      <Image source={{ uri: photo }} style={styles.cardImage} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },

  // Empty state
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 24,
    color: '#fff',
    marginTop: 16,
  },
  emptySubtitle: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#5B8DEF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
  },
  emptyButtonText: {
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 16,
    color: '#fff',
  },

  // Header
  headerContainer: {
    paddingTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  categoryPageButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 80,
  },
  pageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  pageButtonDisabled: {
    opacity: 0.3,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  addPhotoText: {
    fontFamily: 'Pretendard-Medium',
    fontSize: 14,
    color: '#fff',
  },
  completeText: {
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 16,
    color: '#5B8DEF',
  },

  // Thumbnails
  thumbnailScroll: {
    marginTop: 4,
  },
  thumbnailContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
  },
  thumbnailCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#5B8DEF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Main content
  mainContent: {
    flex: 1,
    position: 'relative',
    paddingVertical: 8,
  },

  // Categories
  leftCategories: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 70,
    flexDirection: 'column',
    gap: 8,
    paddingLeft: 8,
    justifyContent: 'space-evenly',
    zIndex: 1,
  },
  rightCategories: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 70,
    flexDirection: 'column',
    gap: 8,
    paddingRight: 8,
    justifyContent: 'space-evenly',
    zIndex: 1,
  },
  categoryStrip: {
    width: 64,
    flex: 1,
    backgroundColor: '#000',
    paddingVertical: 20,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryStripHovered: {
    borderColor: '#5B8DEF',
    backgroundColor: '#1a1a1a',
  },
  categoryCountVertical: {
    fontFamily: 'Pretendard-Medium',
    fontSize: 10,
    color: '#8E8E93',
    writingDirection: 'ltr',
    transform: [{ rotate: '0deg' }],
  },
  categoryNameVertical: {
    fontFamily: 'Pretendard-Medium',
    fontSize: 11,
    color: '#fff',
    writingDirection: 'ltr',
    transform: [{ rotate: '-90deg' }],
    width: 120,
    textAlign: 'center',
  },
  categoryEmojiContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmojiContainerHovered: {
    backgroundColor: '#5B8DEF',
  },
  categoryEmoji: {
    fontSize: 24,
  },

  // Card area
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(44, 44, 46, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    zIndex: 10,
  },
  progressText: {
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  cardSection: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Card
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    resizeMode: 'cover',
  },
  completionCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  completionTitle: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 28,
    color: '#fff',
  },
  completionSubtitle: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 16,
    color: '#8E8E93',
  },

  // Note input
  noteInputContainer: {
    width: CARD_WIDTH,
    marginTop: 16,
  },
  noteInput: {
    fontFamily: 'Pretendard-Regular',
    backgroundColor: '#2C2C2E',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 14,
    textAlign: 'center',
  },

  // Trash zone
  trashZone: {
    height: 70,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 5,
  },
  trashCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Feedback
  feedbackBadge: {
    position: 'absolute',
    top: 80,
    backgroundColor: 'rgba(91, 141, 239, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    zIndex: 100,
  },
  feedbackText: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 18,
    color: '#fff',
  },
});
