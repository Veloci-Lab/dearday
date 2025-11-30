import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { supabase } from '../utils/supabase';
import { useAuthStore } from '../utils/authStore';
import * as FileSystem from 'expo-file-system';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const CARD_WIDTH = SCREEN_WIDTH * 0.6;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.45;

// 업로드 헬퍼 함수
async function uriToBytes(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary =
    typeof atob !== 'undefined'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function uploadToStorage(
  bucket: string,
  objectPath: string,
  bytes: Uint8Array,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, bytes, {
      contentType,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

// 최소 분류 영역 높이 (카테고리 + 카드 영역)
const MIN_CLASSIFICATION_HEIGHT = 500;
// 하단 영역 높이를 화면 크기에 따라 동적 조정 (더 작게)
const BOTTOM_HEIGHT = Math.max(150, Math.min(200, SCREEN_HEIGHT - MIN_CLASSIFICATION_HEIGHT - 100));
const ARCH_WIDTH = SCREEN_WIDTH * 0.7; // 아치 폭을 70%로 축소

type Category = {
  id: string;
  name: string;
  display_order: number;
  emoji: string;
};

type ClassifiedPhoto = {
  photo: string;
  categoryId: string | null;
  categoryName: string | null;
  note?: string;
};

export default function PhotoOrganize1Screen() {
  const router = useRouter();
  const { profileId } = useAuthStore();
  const [photos, setPhotos] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [categoryPage, setCategoryPage] = useState(0);
  const [classified, setClassified] = useState<ClassifiedPhoto[]>([]);
  const [note, setNote] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [hoveredCategory, setHoveredCategory] = useState<{ side: 'left' | 'right' | null; index: number } | null>(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);
  const [isDraggingToTrash, setIsDraggingToTrash] = useState(false);

  // 카테고리 관련 state
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // 카테고리 가져오기
  useEffect(() => {
    if (profileId) {
      fetchCategories();
    }
  }, [profileId]);

  const fetchCategories = async () => {
    if (!profileId) {
      console.error('프로필 ID가 없습니다.');
      setIsLoadingCategories(false);
      return;
    }

    try {
      setIsLoadingCategories(true);

      // 필요한 필드만 가져오기 (display_order 순으로 정렬)
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, display_order')
        .eq('profile_id', profileId)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('카테고리 불러오기 실패:', error);
      } else if (data) {
        // 기본 이모지 설정
        const categoriesWithEmoji = data.map(cat => ({
          ...cat,
          emoji: '📁' // 기본 이모지
        }));
        setAllCategories(categoriesWithEmoji);
      }
    } catch (error) {
      console.error('카테고리 로드 중 오류:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // 현재 페이지의 카테고리 (좌우 번갈아가며 배치: 1-2, 3-4, 5-6)
  const pageStart = categoryPage * 6;
  const pageCategories = allCategories.slice(pageStart, pageStart + 6);
  const leftCategories = pageCategories.filter((_, idx) => idx % 2 === 0); // 0, 2, 4 → 1, 3, 5번째
  const rightCategories = pageCategories.filter((_, idx) => idx % 2 === 1); // 1, 3, 5 → 2, 4, 6번째

  // 각 카테고리별 사진 개수
  const getCategoryCount = (categoryName: string) => {
    return classified.filter((c) => c.categoryName === categoryName).length;
  };

  // 뒤로가기 처리
  const handleBack = () => {
    if (photos.length > 0) {
      Alert.alert(
        "취소하고 나가시겠어요?",
        "정리한 내용이 사라져요",
        [
          { text: "이어서하기", style: "cancel" },
          { text: "나가기", onPress: () => router.back(), style: "destructive" }
        ]
      );
    } else {
      router.back();
    }
  };

  // 갤러리에서 사진 선택 (최대 20개)
  const pickImages = async () => {
    // 이미 20개면 막기
    if (photos.length >= 20) {
      alert('최대 20장까지 업로드할 수 있습니다.');
      return;
    }

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
      const remainingSlots = 20 - photos.length;
      const newPhotos = uris.slice(0, remainingSlots);

      setPhotos([...photos, ...newPhotos]);

      // 초과된 사진이 있으면 알림
      if (uris.length > remainingSlots) {
        alert(`최대 20장까지 업로드할 수 있습니다. ${newPhotos.length}장이 추가되었습니다.`);
      }
    }
  };

  // 분류 완료
  const handleClassify = (categoryId: string | null, categoryName: string | null) => {
    if (currentIndex >= photos.length) return;

    // 삭제인 경우: photos 배열에서 제거
    if (categoryId === null) {
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
      { photo: photos[currentIndex], categoryId, categoryName, note: note.trim() || undefined },
    ];
    setClassified(newClassified);

    // 피드백 표시
    const cat = allCategories.find(c => c.id === categoryId);
    setFeedbackText(`${cat?.emoji || '📁'} ${categoryName}`);
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
  const handleComplete = async () => {
    if (isUploading) return;
    if (classified.length === 0) {
      alert('분류된 사진이 없습니다.');
      return;
    }

    try {
      setIsUploading(true);

      const BUCKET = 'photos-v2';

      // 모든 사진 업로드 및 DB 저장
      for (let i = 0; i < classified.length; i++) {
        const item = classified[i];

        // 1. Storage에 업로드 (original 폴더)
        const ts = Date.now() + i; // 고유한 타임스탬프
        const fileName = `photo_${profileId}_${ts}.jpg`;
        const filePath = `original/${fileName}`;

        const bytes = await uriToBytes(item.photo);
        const imageUrl = await uploadToStorage(BUCKET, filePath, bytes);

        // 2. DB에 저장
        const { error: insertError } = await supabase
          .from('photos')
          .insert({
            profile_id: profileId,
            category_id: item.categoryId,
            image_url: imageUrl,
            memo: item.note || null,
          });

        if (insertError) {
          console.error('DB 저장 실패:', insertError);
          throw insertError;
        }
      }

      alert(`${classified.length}장의 사진을 분류했습니다!`);
      router.back();
    } catch (error) {
      console.error('사진 저장 실패:', error);
      alert('사진 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsUploading(false);
    }
  };

  // 카테고리 페이지 변경
  const totalPages = Math.ceil(allCategories.length / 6);
  const showPagination = allCategories.length >= 7; // 7개 이상일 때만 페이지네이션 표시
  const canGoPrev = categoryPage > 0;
  const canGoNext = categoryPage < totalPages - 1;

  // 로딩 중일 때
  if (isLoadingCategories) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>카테고리를 불러오는 중...</Text>
      </View>
    );
  }

  // 카테고리가 없을 때
  if (allCategories.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>카테고리가 없습니다.</Text>
        <Text style={styles.emptySubtext}>카테고리를 먼저 추가해주세요.</Text>
        <Pressable style={styles.backToHomeButton} onPress={() => router.back()}>
          <Text style={styles.backToHomeText}>돌아가기</Text>
        </Pressable>
      </View>
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
            {/* 좌측: 뒤로가기 */}
            <Pressable onPress={handleBack}>
              <Feather name="chevron-left" size={24} color="#fff" />
            </Pressable>

            {/* 우측: 사진 추가 + 완료 */}
            <View style={styles.rightHeaderSection}>
              {photos.length > 0 && !isUploading && (
                <Pressable style={styles.addPhotoButton} onPress={pickImages}>
                  <Text style={styles.addPhotoText}>사진 추가</Text>
                </Pressable>
              )}
              <Pressable
                style={[
                  styles.completeButton,
                  (isUploading || classified.length === 0) && styles.completeButtonDisabled
                ]}
                onPress={handleComplete}
                disabled={isUploading || classified.length === 0}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.completeButtonText}>완료</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* 썸네일 리스트 - 항상 영역 확보 */}
          <View style={styles.thumbnailScroll}>
            {photos.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailContent}
              >
                {photos.map((photo, idx) => (
                  <Pressable
                    key={idx}
                    style={styles.thumbnailWrapper}
                    onPress={() => setEnlargedPhoto(photo)}
                  >
                    <Image source={{ uri: photo }} style={styles.thumbnail} />
                    {idx < currentIndex && (
                      <View style={styles.thumbnailCheck}>
                        <Feather name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.thumbnailPlaceholder} />
            )}
          </View>
        </View>

        {/* 메인 콘텐츠 */}
        <View style={styles.mainContent}>
        {/* 왼쪽 카테고리 */}
        <View style={styles.leftCategories}>
          {[0, 1, 2].map((idx) => {
            const cat = leftCategories[idx];
            if (!cat) {
              return <View key={`left-empty-${idx}`} style={{ flex: 1 }} />;
            }

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
          <View style={styles.cardSection}>
            {/* 사진이 없을 때: 업로드 버튼 */}
            {photos.length === 0 ? (
              <Pressable style={styles.uploadButton} onPress={pickImages}>
                <Feather name="upload" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>사진 업로드</Text>
              </Pressable>
            ) : (
              <>
                <View style={styles.cardGroupContainer}>
                  {/* 상단 헤더: 뒤로가기 + 진행도 - 항상 표시 */}
                  <View style={styles.cardHeaderRow}>
                    {/* 뒤로가기 버튼 (왼쪽) */}
                    <Pressable
                      style={[styles.backButton, classified.length === 0 && styles.backButtonDisabled]}
                      onPress={handleUndo}
                      disabled={classified.length === 0}
                    >
                      <Feather name="arrow-left" size={24} color="#F5978A" />
                    </Pressable>

                    {/* 진행도 (오른쪽) */}
                    <View style={styles.progressBadge}>
                      <Text style={styles.progressText}>
                        {Math.min(currentIndex + 1, photos.length)}/{photos.length}
                      </Text>
                    </View>
                  </View>

                  {/* 카드 스택 */}
                  <View style={styles.cardContainer} pointerEvents="box-none">
                    {/* 정리완료 카드 - 스택에 포함 (백그라운드) */}
                    {classified.length === photos.length && photos.length > 0 && (
                      <View style={styles.completionCard}>
                        <Feather name="check-circle" size={64} color="#5B8DEF" />
                        <Text style={styles.completionTitle}>정리완료!</Text>
                        <Text style={styles.completionSubtitle}>
                          {photos.length}장의 사진을 분류했습니다
                        </Text>
                      </View>
                    )}

                    {/* 사진 카드들 - 스택 효과 */}
                    {photos.slice(currentIndex, currentIndex + 3).reverse().map((photo, idx, arr) => {
                      const isTop = idx === arr.length - 1;
                      const stackIndex = arr.length - 1 - idx; // 0 = top, 1 = middle, 2 = bottom
                      return (
                        <SwipeCard
                          key={`${currentIndex + idx}-${photo}`}
                          photo={photo}
                          isTop={isTop}
                          stackIndex={stackIndex}
                          leftCategories={leftCategories}
                          rightCategories={rightCategories}
                          onClassify={handleClassify}
                          onHoverCategory={setHoveredCategory}
                          onTap={() => setEnlargedPhoto(photo)}
                          onDragToTrash={setIsDraggingToTrash}
                        />
                      );
                    })}
                  </View>

                  {/* 노트 입력 - 항상 공간 유지 */}
                  <View style={styles.noteInputContainer}>
                    <TextInput
                      style={styles.noteInput}
                      placeholder="노트를 입력해주세요"
                      placeholderTextColor="#8E8E93"
                      value={note}
                      onChangeText={setNote}
                      editable={currentIndex < photos.length}
                      pointerEvents={currentIndex < photos.length ? 'auto' : 'none'}
                    />
                  </View>
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
          {[0, 1, 2].map((idx) => {
            const cat = rightCategories[idx];
            if (!cat) {
              return <View key={`right-empty-${idx}`} style={{ flex: 1 }} />;
            }

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

        {/* 하단 영역: 대형 아치형 쓰레기통 */}
        <View style={styles.bottomZone}>
          {/* 대형 아치형 박스 */}
          <View style={[
            styles.trashArchBox,
            isDraggingToTrash && styles.trashArchBoxActive
          ]}>
            {/* 휴지통 아이콘 (아치 상단) */}
            <View style={[
              styles.trashCircle,
              isDraggingToTrash && styles.trashCircleActive
            ]}>
              <Feather
                name="trash-2"
                size={isDraggingToTrash ? 28 : 24}
                color={isDraggingToTrash ? "#FF4444" : "#8E8E93"}
              />
            </View>

            {/* 페이지 인디케이터 (아치 중앙) - 7개 이상일 때만 표시 */}
            {showPagination && totalPages > 1 && (
              <View style={styles.pageIndicator}>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.pageDot,
                      idx === categoryPage && styles.pageDotActive
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* 좌우 네비게이션 버튼 - 7개 이상일 때만 표시 */}
          {showPagination && (
            <>
              <Pressable
                onPress={() => setCategoryPage(Math.max(0, categoryPage - 1))}
                disabled={!canGoPrev || !!feedbackText}
                style={[styles.categoryNavButtonLeft, !canGoPrev && styles.categoryNavButtonDisabled]}
              >
                <Feather name="chevron-left" size={24} color={canGoPrev ? "#fff" : "#4A4A4C"} />
              </Pressable>

              <Pressable
                onPress={() => setCategoryPage(Math.min(totalPages - 1, categoryPage + 1))}
                disabled={!canGoNext || !!feedbackText}
                style={[styles.categoryNavButtonRight, !canGoNext && styles.categoryNavButtonDisabled]}
              >
                <Feather name="chevron-right" size={24} color={canGoNext ? "#fff" : "#4A4A4C"} />
              </Pressable>
            </>
          )}
        </View>

        {/* 사진 확대 모달 */}
        {enlargedPhoto && (
          <Pressable
            style={styles.enlargedPhotoModal}
            onPress={() => setEnlargedPhoto(null)}
          >
            <Image
              source={{ uri: enlargedPhoto }}
              style={styles.enlargedPhotoImage}
              resizeMode="contain"
            />
            <Pressable style={styles.closeEnlargedButton} onPress={() => setEnlargedPhoto(null)}>
              <Feather name="x" size={24} color="#fff" />
            </Pressable>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// Tinder 스타일 스와이프 카드
function SwipeCard({
  photo,
  isTop,
  stackIndex,
  leftCategories,
  rightCategories,
  onClassify,
  onHoverCategory,
  onTap,
  onDragToTrash,
}: {
  photo: string;
  isTop: boolean;
  stackIndex: number;
  leftCategories: Category[];
  rightCategories: Category[];
  onClassify: (categoryId: string | null, categoryName: string | null) => void;
  onHoverCategory: (hover: { side: 'left' | 'right' | null; index: number } | null) => void;
  onTap?: () => void;
  onDragToTrash?: (isDragging: boolean) => void;
}) {
  const pan = useRef(new Animated.ValueXY()).current;

  // 최신 콜백 및 isTop을 참조하기 위한 ref
  const callbacksRef = useRef({ leftCategories, rightCategories, onClassify, onHoverCategory, onTap, onDragToTrash, isTop });
  callbacksRef.current = { leftCategories, rightCategories, onClassify, onHoverCategory, onTap, onDragToTrash, isTop };

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });

  const opacity = pan.y.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0.6],
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
      onStartShouldSetPanResponder: () => callbacksRef.current.isTop,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
        listener: (event, gestureState) => {
          const CATEGORY_ZONE_WIDTH = 80;
          const TRASH_ZONE_THRESHOLD = 100; // 아래로 100px 이상 드래그 시 휴지통 영역

          const isInLeftZone = gestureState.moveX < CATEGORY_ZONE_WIDTH;
          const isInRightZone = gestureState.moveX > SCREEN_WIDTH - CATEGORY_ZONE_WIDTH;
          const isDraggingDown = gestureState.dy > TRASH_ZONE_THRESHOLD;

          // 휴지통으로 드래그 중인지 감지
          if (callbacksRef.current.onDragToTrash) {
            callbacksRef.current.onDragToTrash(isDraggingDown);
          }

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

        // hover 상태 및 휴지통 드래그 상태 초기화
        callbacksRef.current.onHoverCategory(null);
        if (callbacksRef.current.onDragToTrash) {
          callbacksRef.current.onDragToTrash(false);
        }

        // 탭인지 드래그인지 확인 (이동 거리가 최소값 이하면 탭으로 간주)
        const totalDistance = Math.sqrt(gesture.dx * gesture.dx + gesture.dy * gesture.dy);
        if (totalDistance < MIN_DRAG_DISTANCE) {
          // 탭으로 간주, 사진 확대 콜백 호출
          if (callbacksRef.current.onTap) {
            callbacksRef.current.onTap();
          }
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
          const category = callbacksRef.current.leftCategories[categoryIndex]; // 미리 캡처
          Animated.spring(pan, {
            toValue: { x: -SCREEN_WIDTH - 100, y: gesture.dy },
            useNativeDriver: true,
          }).start(() => {
            if (category) {
              callbacksRef.current.onClassify(category.id, category.name);
            }
            pan.setValue({ x: 0, y: 0 });
          });
        }
        // 오른쪽 카테고리 영역에 드롭
        else if (isInRightZone) {
          const categoryIndex = getCategoryIndex(callbacksRef.current.rightCategories.length, gesture.moveY);
          const category = callbacksRef.current.rightCategories[categoryIndex]; // 미리 캡처
          Animated.spring(pan, {
            toValue: { x: SCREEN_WIDTH + 100, y: gesture.dy },
            useNativeDriver: true,
          }).start(() => {
            if (category) {
              callbacksRef.current.onClassify(category.id, category.name);
            }
            pan.setValue({ x: 0, y: 0 });
          });
        }
        // 좌우 스와이프 (빠른 스와이프)
        else if (gesture.dx > SWIPE_THRESHOLD) {
          const categoryIndex = getCategoryIndex(callbacksRef.current.rightCategories.length, gesture.moveY);
          const category = callbacksRef.current.rightCategories[categoryIndex]; // 미리 캡처
          Animated.spring(pan, {
            toValue: { x: SCREEN_WIDTH + 100, y: gesture.dy },
            useNativeDriver: true,
          }).start(() => {
            if (category) {
              callbacksRef.current.onClassify(category.id, category.name);
            }
            pan.setValue({ x: 0, y: 0 });
          });
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          const categoryIndex = getCategoryIndex(callbacksRef.current.leftCategories.length, gesture.moveY);
          const category = callbacksRef.current.leftCategories[categoryIndex]; // 미리 캡처
          Animated.spring(pan, {
            toValue: { x: -SCREEN_WIDTH - 100, y: gesture.dy },
            useNativeDriver: true,
          }).start(() => {
            if (category) {
              callbacksRef.current.onClassify(category.id, category.name);
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
            callbacksRef.current.onClassify(null, null);
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
        opacity,
        transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
      }
    : {
        opacity: 1 - stackIndex * 0.2,
        transform: [
          { scale: 1 - stackIndex * 0.03 },
          { translateY: -stackIndex * 8 }
        ],
      };

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
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Pretendard-Medium',
    fontSize: 16,
    color: '#fff',
  },
  emptyText: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 18,
    color: '#fff',
  },
  emptySubtext: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 14,
    color: '#8E8E93',
  },
  backToHomeButton: {
    backgroundColor: '#5B8DEF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  backToHomeText: {
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 16,
    color: '#fff',
  },

  // Header
  headerContainer: {
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  rightHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addPhotoButton: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  addPhotoText: {
    fontFamily: 'Pretendard-Medium',
    fontSize: 14,
    color: '#fff',
  },
  completeButton: {
    backgroundColor: '#5B8DEF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#5B8DEF',
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: '#2C2C2E',
    borderColor: '#3C3C3E',
    opacity: 0.5,
  },
  completeButtonText: {
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 16,
    color: '#fff',
  },

  // Thumbnails
  thumbnailScroll: {
    marginTop: 4,
    height: 68, // 60 (thumbnail) + 8 (padding)
  },
  thumbnailContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 60,
    height: 60,
    marginRight: 8,
    overflow: 'hidden',
    borderRadius: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
  },
  thumbnailCheck: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#5B8DEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholder: {
    height: 60,
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
    left: -1,
    top: 8,
    bottom: BOTTOM_HEIGHT + 10,
    flexDirection: 'column',
    gap: 8,
    justifyContent: 'space-evenly',
    zIndex: 1,
  },
  rightCategories: {
    position: 'absolute',
    right: -1,
    top: 8,
    bottom: BOTTOM_HEIGHT + 10,
    flexDirection: 'column',
    gap: 8,
    justifyContent: 'space-evenly',
    zIndex: 1,
  },
  categoryStrip: {
    width: 70,
    flex: 1,
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  categoryStripHovered: {
    borderColor: '#5B8DEF',
    backgroundColor: '#1C1C1E',
    borderWidth: 2,
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
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
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
    position: 'absolute',
    top: 8,
    bottom: BOTTOM_HEIGHT + 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSection: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardGroupContainer: {
    alignItems: 'center',
  },
  cardHeaderRow: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonDisabled: {
    opacity: 0.3,
  },
  progressBadge: {
    backgroundColor: 'rgba(44, 44, 46, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressText: {
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 14,
    color: '#fff',
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  completionCard: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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

  // Upload button (when no photos)
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  uploadButtonText: {
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 16,
    color: '#fff',
  },

  // Note input
  noteInputContainer: {
    width: CARD_WIDTH,
    marginTop: 16,
    zIndex: 10,
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

  // Bottom zone
  bottomZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  categoryNavButtonLeft: {
    position: 'absolute',
    left: 30,
    bottom: BOTTOM_HEIGHT * 0.22,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3C3C3E',
  },
  categoryNavButtonRight: {
    position: 'absolute',
    right: 30,
    bottom: BOTTOM_HEIGHT * 0.22,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3C3C3E',
  },
  categoryNavButtonDisabled: {
    opacity: 0.3,
  },
  trashArchBox: {
    width: ARCH_WIDTH,
    height: BOTTOM_HEIGHT - 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderTopLeftRadius: ARCH_WIDTH * 0.5,
    borderTopRightRadius: ARCH_WIDTH * 0.5,
    borderWidth: 2,
    borderColor: '#2C2C2E',
    borderBottomWidth: 0,
    alignItems: 'center',
    paddingTop: 10,
  },
  trashArchBoxActive: {
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    borderColor: '#FF4444',
    borderWidth: 3,
  },
  trashCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: BOTTOM_HEIGHT * 0.15,
  },
  trashCircleActive: {
    backgroundColor: '#3C2C2C',
    transform: [{ scale: 1.15 }],
  },
  pageIndicator: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    bottom: BOTTOM_HEIGHT * 0.22 + 21, // 버튼 중심(25px)과 닷 중심(4px)을 맞춤
    alignItems: 'center',
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4A4A4C',
  },
  pageDotActive: {
    backgroundColor: '#5B8DEF',
    width: 8,
    height: 8,
    borderRadius: 4,
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

  // Enlarged photo modal
  enlargedPhotoModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enlargedPhotoImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  closeEnlargedButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
