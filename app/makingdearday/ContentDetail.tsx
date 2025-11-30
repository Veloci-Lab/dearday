import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";

const { width, height } = Dimensions.get("window");
const GRID_GAP = 4;
const GRID_PADDING = 13;
const HEADER_HEIGHT = 56;
const TAB_HEIGHT = 52;
const SAFE_AREA_TOP = 44;
const BOTTOM_AREA = 100;

// ViewShot 내부 그리드 크기 (패딩 제외)
const GRID_WIDTH = width - GRID_PADDING * 4; // 화면 패딩 + viewShot 패딩
const AVAILABLE_HEIGHT = height - SAFE_AREA_TOP - HEADER_HEIGHT - TAB_HEIGHT - BOTTOM_AREA;

// TODO: authStore로 교체
// const TEST_PROFILE_ID = 102;
// const profileId = useAuthStore((state) => state.profileId);

interface ContentPhotoData {
  id: string;
  photo_id: string;
  memo: string | null;
  display_order: number;
  image_url: string;
}

interface ContentData {
  id: string;
  name: string;
  thumbnail_photo_id: string | null;
  created_at: string;
  content_photos: ContentPhotoData[];
}

export default function ContentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const contentId = params.contentId as string;
  const viewShotRef = useRef<ViewShot>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const [content, setContent] = useState<ContentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"dearday" | "blog">("dearday");
  const [showToast, setShowToast] = useState(false);
  

  useEffect(() => {
    if (contentId) {
      loadContent();
    }
  }, [contentId]);

  const loadContent = async () => {
    try {
      const { data: contentData, error: contentError } = await supabase
        .from("contents")
        .select("id, name, thumbnail_photo_id, created_at")
        .eq("id", contentId)
        .single();

      if (contentError) throw contentError;

      const { data: contentPhotosData, error: photosError } = await supabase
        .from("content_photos")
        .select("id, photo_id, memo, display_order")
        .eq("content_id", contentId)
        .order("display_order", { ascending: true });

      if (photosError) throw photosError;

      const photoIds = contentPhotosData.map((cp: any) => cp.photo_id);

      const { data: photosData, error: photosUrlError } = await supabase
        .from("photos")
        .select("id, image_url")
        .in("id", photoIds);

      if (photosUrlError) throw photosUrlError;

      const photoUrlMap = new Map(
        photosData.map((p: any) => [p.id, p.image_url])
      );

      const mergedPhotos: ContentPhotoData[] = contentPhotosData.map((cp: any) => ({
        id: cp.id,
        photo_id: cp.photo_id,
        memo: cp.memo,
        display_order: cp.display_order,
        image_url: photoUrlMap.get(cp.photo_id) || "",
      }));

      setContent({
        ...contentData,
        content_photos: mergedPhotos,
      });
    } catch (error) {
      console.error("Error loading content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.replace("/(tabs)/record");
  };

  const handleToggleEditMode = () => {
    if (isEditMode) {
      setSelectedPhotoIds(new Set());
    }
    setIsEditMode(!isEditMode);
  };

  const handlePhotoSelect = (photoId: string) => {
    if (!isEditMode) return;

    setSelectedPhotoIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedPhotoIds.size === 0) return;

    try {
      const { error } = await supabase
        .from("content_photos")
        .delete()
        .in("id", Array.from(selectedPhotoIds));

      if (error) throw error;

      setContent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          content_photos: prev.content_photos.filter(
            (p) => !selectedPhotoIds.has(p.id)
          ),
        };
      });

      setSelectedPhotoIds(new Set());
      setIsEditMode(false);
    } catch (error) {
      console.error("Error deleting photos:", error);
    }
  };

  // Toast 표시
  const showToastMessage = () => {
    setShowToast(true);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowToast(false));
  };

  // 공유 (갤러리 저장)
  const handleShare = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
        return;
      }

      const uri = await viewShotRef.current?.capture?.();
      if (!uri) {
        Alert.alert("오류", "이미지 캡처에 실패했습니다.");
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      showToastMessage();
    } catch (error) {
      console.error("Error saving to gallery:", error);
      Alert.alert("오류", "저장에 실패했습니다.");
    }
  };

  // 썸네일 사진과 나머지 사진 분리
  const getThumbnailAndOthers = () => {
    if (!content?.content_photos) return { thumbnail: null, others: [] };
    
    const thumbnailPhotoId = content.thumbnail_photo_id;
    const photos = content.content_photos;
    
    const thumbnailIndex = photos.findIndex(p => p.photo_id === thumbnailPhotoId);
    
    if (thumbnailIndex === -1) {
      return { thumbnail: photos[0], others: photos.slice(1) };
    }
    
    const thumbnail = photos[thumbnailIndex];
    const others = photos.filter((_, idx) => idx !== thumbnailIndex);
    
    return { thumbnail, others };
  };

  // 그리드 레이아웃 렌더링 (썸네일 기준)
  const renderPhotoGrid = () => {
    if (!content?.content_photos) return null;

    const { thumbnail, others } = getThumbnailAndOthers();
    const count = content.content_photos.length;

    if (count === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>사진이 없습니다.</Text>
        </View>
      );
    }

    if (!thumbnail) return null;

    // 1장: 전체 화면
    if (count === 1) {
      return (
        <View style={styles.gridContainer}>
          {renderPhotoItem(thumbnail, GRID_WIDTH, GRID_WIDTH)}
        </View>
      );
    }

    // 2장: 썸네일 65% + 나머지 35% (세로 분할)
    if (count === 2) {
      const thumbWidth = GRID_WIDTH * 0.65 - GRID_GAP / 2;
      const otherWidth = GRID_WIDTH * 0.35 - GRID_GAP / 2;
      const itemHeight = GRID_WIDTH * 0.8;

      return (
        <View style={[styles.gridContainer, styles.gridRow]}>
          {renderPhotoItem(thumbnail, thumbWidth, itemHeight)}
          <View style={{ marginLeft: GRID_GAP }}>
            {renderPhotoItem(others[0], otherWidth, itemHeight)}
          </View>
        </View>
      );
    }

    // 3장: 썸네일 크게 왼쪽 + 나머지 2개 오른쪽 세로
    if (count === 3) {
      const thumbWidth = GRID_WIDTH * 0.6 - GRID_GAP / 2;
      const otherWidth = GRID_WIDTH * 0.4 - GRID_GAP / 2;
      const thumbHeight = GRID_WIDTH * 0.8;
      const otherHeight = (thumbHeight - GRID_GAP) / 2;

      return (
        <View style={[styles.gridContainer, styles.gridRow]}>
          {renderPhotoItem(thumbnail, thumbWidth, thumbHeight)}
          <View style={{ marginLeft: GRID_GAP }}>
            {renderPhotoItem(others[0], otherWidth, otherHeight)}
            <View style={{ marginTop: GRID_GAP }}>
              {renderPhotoItem(others[1], otherWidth, otherHeight)}
            </View>
          </View>
        </View>
      );
    }

    // 4장: 썸네일 크게 + 아래 3개
    if (count === 4) {
      const thumbHeight = GRID_WIDTH * 0.6;
      const otherWidth = (GRID_WIDTH - GRID_GAP * 2) / 3;
      const otherHeight = GRID_WIDTH * 0.35;

      return (
        <View style={styles.gridContainer}>
          {renderPhotoItem(thumbnail, GRID_WIDTH, thumbHeight)}
          <View style={[styles.gridRow, { marginTop: GRID_GAP }]}>
            {others.map((photo, index) => (
              <View key={photo.id} style={{ marginLeft: index > 0 ? GRID_GAP : 0 }}>
                {renderPhotoItem(photo, otherWidth, otherHeight)}
              </View>
            ))}
          </View>
        </View>
      );
    }

    // 5장: 썸네일 크게 왼쪽 + 오른쪽 2개 + 아래 2개
    if (count === 5) {
      const thumbWidth = GRID_WIDTH * 0.6 - GRID_GAP / 2;
      const sideWidth = GRID_WIDTH * 0.4 - GRID_GAP / 2;
      const thumbHeight = GRID_WIDTH * 0.6;
      const sideHeight = (thumbHeight - GRID_GAP) / 2;
      const bottomWidth = (GRID_WIDTH - GRID_GAP) / 2;
      const bottomHeight = GRID_WIDTH * 0.35;

      return (
        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            {renderPhotoItem(thumbnail, thumbWidth, thumbHeight)}
            <View style={{ marginLeft: GRID_GAP }}>
              {renderPhotoItem(others[0], sideWidth, sideHeight)}
              <View style={{ marginTop: GRID_GAP }}>
                {renderPhotoItem(others[1], sideWidth, sideHeight)}
              </View>
            </View>
          </View>
          <View style={[styles.gridRow, { marginTop: GRID_GAP }]}>
            {renderPhotoItem(others[2], bottomWidth, bottomHeight)}
            <View style={{ marginLeft: GRID_GAP }}>
              {renderPhotoItem(others[3], bottomWidth, bottomHeight)}
            </View>
          </View>
        </View>
      );
    }

    // 6장 이상: 썸네일 + 나머지 배치
    const thumbWidth = GRID_WIDTH * 0.6 - GRID_GAP / 2;
    const sideWidth = GRID_WIDTH * 0.4 - GRID_GAP / 2;
    const thumbHeight = GRID_WIDTH * 0.5;
    const sideHeight = (thumbHeight - GRID_GAP) / 2;
    
    const remainingPhotos = others.slice(2);
    const rows: ContentPhotoData[][] = [];
    for (let i = 0; i < remainingPhotos.length; i += 3) {
      rows.push(remainingPhotos.slice(i, i + 3));
    }

    return (
      <View style={styles.gridContainer}>
        <View style={styles.gridRow}>
          {renderPhotoItem(thumbnail, thumbWidth, thumbHeight)}
          <View style={{ marginLeft: GRID_GAP }}>
            {others[0] && renderPhotoItem(others[0], sideWidth, sideHeight)}
            {others[1] && (
              <View style={{ marginTop: GRID_GAP }}>
                {renderPhotoItem(others[1], sideWidth, sideHeight)}
              </View>
            )}
          </View>
        </View>
        
        {rows.map((row, rowIndex) => {
          const itemCount = row.length;
          const itemWidth = (GRID_WIDTH - GRID_GAP * (itemCount - 1)) / itemCount;
          const itemHeight = itemWidth * 0.8;

          return (
            <View
              key={rowIndex}
              style={[styles.gridRow, { marginTop: GRID_GAP }]}
            >
              {row.map((photo, index) => (
                <View key={photo.id} style={{ marginLeft: index > 0 ? GRID_GAP : 0 }}>
                  {renderPhotoItem(photo, itemWidth, itemHeight)}
                </View>
              ))}
            </View>
          );
        })}
      </View>
    );
  };

  // 개별 사진 아이템 렌더링
  const renderPhotoItem = (
    photo: ContentPhotoData,
    itemWidth: number,
    itemHeight: number
  ) => {
    const isSelected = selectedPhotoIds.has(photo.id);

    return (
      <TouchableOpacity
        activeOpacity={isEditMode ? 0.8 : 1}
        onPress={() => handlePhotoSelect(photo.id)}
        style={[
          { width: itemWidth, height: itemHeight },
          isSelected && styles.selectedPhoto,
        ]}
      >
        <Image
          source={{ uri: photo.image_url }}
          style={{
            width: itemWidth,
            height: itemHeight,
            borderRadius: 8,
          }}
          resizeMode="cover"
        />
        {isEditMode && (
          <View style={styles.checkboxContainer}>
            <View
              style={[
                styles.checkbox,
                isSelected && styles.checkboxSelected,
              ]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top"]}>
        <ActivityIndicator size="large" color="#5B8DEF" />
      </SafeAreaView>
    );
  }

  if (!content) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top"]}>
        <Text style={styles.errorText}>콘텐츠를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{content.name}</Text>
        {isEditMode ? (
          <TouchableOpacity
            style={[
              styles.deleteButton,
              selectedPhotoIds.size === 0 && styles.deleteButtonDisabled,
            ]}
            onPress={handleDeleteSelected}
            disabled={selectedPhotoIds.size === 0}
          >
            <Text style={styles.deleteButtonText}>삭제</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleToggleEditMode}
          >
            <Text style={styles.selectText}>선택</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 탭 - 세그먼트 컨트롤 */}
      <View style={styles.tabContainer}>
        <View style={styles.segmentControl}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeTab === "dearday" && styles.segmentButtonActive,
            ]}
            onPress={() => setActiveTab("dearday")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "dearday" && styles.segmentTextActive,
              ]}
            >
              디어데이
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeTab === "blog" && styles.segmentButtonActive,
            ]}
            onPress={() => setActiveTab("blog")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "blog" && styles.segmentTextActive,
              ]}
            >
              블로그
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 사진 그리드 */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <ViewShot
          ref={viewShotRef}
          options={{ 
            format: "jpg", 
            quality: 1,
          }}
          style={styles.viewShot}
        >
          {renderPhotoGrid()}
        </ViewShot>
      </ScrollView>

      {/* 하단 공유 버튼 */}
      {!isEditMode && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="paper-plane" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* 편집 모드 취소 버튼 */}
      {isEditMode && (
        <TouchableOpacity
          style={styles.cancelEditButton}
          onPress={handleToggleEditMode}
        >
          <Text style={styles.cancelEditText}>취소</Text>
        </TouchableOpacity>
      )}

      {/* Toast 메시지 */}
      {showToast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.toastText}>갤러리에 저장되었습니다</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: AVAILABLE_HEIGHT,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: HEADER_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  selectText: {
    fontSize: 16,
    color: "#333",
  },
  deleteButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  deleteButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  tabContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  segmentControl: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    padding: 2,
    height: 30,
  },
  segmentButton: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#fff",
  },
  segmentText: {
    fontSize: 14,
    color: "#999",
  },
  segmentTextActive: {
    color: "#5B8DEF",
    fontWeight: "600",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: GRID_PADDING,
  },
  viewShot: {
    backgroundColor: "#fff",
    padding: GRID_PADDING,
  },
  gridContainer: {
    width: GRID_WIDTH,
  },
  gridRow: {
    flexDirection: "row",
  },
  selectedPhoto: {
    opacity: 0.7,
  },
  checkboxContainer: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#5B8DEF",
    borderColor: "#5B8DEF",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 40,
    right: 20,
  },
  shareButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#5B8DEF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cancelEditButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelEditText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  toast: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});