import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import PhotoPickerModal from "./Photopickermodal";

const { width } = Dimensions.get("window");
const CATEGORY_COLUMN_COUNT = 3;
const CATEGORY_SIZE = (width - 48 - 16) / CATEGORY_COLUMN_COUNT;
const SELECTED_PHOTO_SIZE = 56;

// ============================================================
// 타입 정의
// ============================================================
interface Category {
  id: string;
  name: string;
  display_order: number;
}

interface Photo {
  id: string;
  image_url: string;
  category_id: string;
}

// ============================================================
// 테스트용 profile_id (나중에 authStore로 교체)
// ============================================================
const TEST_PROFILE_ID = 102;

// ============================================================
// 메인 스크린 컴포넌트
// ============================================================
export default function MakingDeardayScreen() {
  const navigation = useNavigation();
  const isLoadedRef = useRef(false);

  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 모달 관련 state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryPhotos, setCategoryPhotos] = useState<Photo[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  // ============================================================
  // 데이터 로드 (한 번만 실행)
  // ============================================================
  useEffect(() => {
    if (isLoadedRef.current) return;
    isLoadedRef.current = true;

    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id, name, display_order")
          .eq("profile_id", TEST_PROFILE_ID)
          .order("display_order", { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error("Error loading categories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  // ============================================================
  // 핸들러
  // ============================================================
  const handleCategoryPress = async (category: Category) => {
    setSelectedCategory(category);
    setIsModalVisible(true);
    setIsLoadingPhotos(true);

    try {
      const { data, error } = await supabase
        .from("photos")
        .select("id, image_url, category_id")
        .eq("profile_id", TEST_PROFILE_ID)
        .eq("category_id", category.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCategoryPhotos(data || []);
    } catch (error) {
      console.error("Error loading photos:", error);
      setCategoryPhotos([]);
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  const handleTogglePhoto = (photoId: string) => {
    const photo = categoryPhotos.find((p) => p.id === photoId);

    if (selectedPhotoIds.includes(photoId)) {
      // 선택 해제
      setSelectedPhotoIds((prev) => prev.filter((id) => id !== photoId));
      setSelectedPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } else {
      // 선택
      setSelectedPhotoIds((prev) => [...prev, photoId]);
      if (photo) {
        setSelectedPhotos((prev) => [...prev, photo]);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedCategory(null);
    setCategoryPhotos([]);
  };

  const handleRemovePhoto = (photoId: string) => {
    setSelectedPhotoIds((prev) => prev.filter((id) => id !== photoId));
    setSelectedPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleNext = () => {
    if (selectedPhotoIds.length === 0) return;
    console.log("Selected photos:", selectedPhotoIds);
    // TODO: 다음 화면으로 이동
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  // ============================================================
  // 렌더링
  // ============================================================
  const hasSelectedPhotos = selectedPhotos.length > 0;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>making dearday</Text>
        <TouchableOpacity
          style={[styles.nextButton, !hasSelectedPhotos && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!hasSelectedPhotos}
        >
          <Text style={styles.nextButtonText}>다음</Text>
        </TouchableOpacity>
      </View>

      {/* 선택된 사진들 */}
      {hasSelectedPhotos && (
        <View style={styles.selectedPhotosSection}>
          <FlatList
            data={selectedPhotos}
            renderItem={({ item }) => (
              <View style={styles.selectedPhotoWrapper}>
                <Image source={{ uri: item.image_url }} style={styles.selectedPhotoImage} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => handleRemovePhoto(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            )}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedPhotosList}
          />
        </View>
      )}

      {/* 구분선 */}
      <View style={styles.divider} />

      {/* 안내 문구 */}
      <Text style={styles.sectionTitle}>사진을 선택해주세요</Text>

      {/* 카테고리 그리드 */}
      <FlatList
        data={categories}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.categoryItem}
            onPress={() => handleCategoryPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.categoryIconContainer}>
              {/* TODO: 카테고리별 아이콘 */}
            </View>
            <Text style={styles.categoryName} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        numColumns={CATEGORY_COLUMN_COUNT}
        contentContainerStyle={styles.categoryGrid}
        showsVerticalScrollIndicator={false}
      />

      {/* 사진 선택 모달 */}
      <PhotoPickerModal
        visible={isModalVisible}
        category={selectedCategory}
        photos={categoryPhotos}
        selectedPhotoIds={selectedPhotoIds}
        onTogglePhoto={handleTogglePhoto}
        onClose={handleCloseModal}
        isLoading={isLoadingPhotos}
      />
    </View>
  );
}

// ============================================================
// 스타일
// ============================================================
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 16,
    color: "#333",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
  },
  nextButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  nextButtonDisabled: {
    backgroundColor: "#C7D2FE",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  selectedPhotosSection: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  selectedPhotosList: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  selectedPhotoWrapper: {
    position: "relative",
    marginRight: 8,
  },
  selectedPhotoImage: {
    width: SELECTED_PHOTO_SIZE,
    height: SELECTED_PHOTO_SIZE,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  removePhotoButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    color: "#6B7280",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  categoryGrid: {
    paddingHorizontal: 16,
  },
  categoryItem: {
    width: CATEGORY_SIZE,
    marginRight: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  categoryIconContainer: {
    width: CATEGORY_SIZE - 8,
    height: CATEGORY_SIZE - 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryName: {
    marginTop: 8,
    fontSize: 13,
    color: "#333",
    textAlign: "center",
  },
});