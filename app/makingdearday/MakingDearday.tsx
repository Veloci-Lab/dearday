import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ConfirmModal from "./modals/ConfirmModal";
import PhotoPickerModal from "./modals/PhotoPickerModal";

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
  icon_number: number;
}

interface Photo {
  id: string;
  image_url: string;
  category_id: string;
}

const CATEGORY_ICONS = [
  require("@/assets/images/category_icons/category_icon_1.png"),
  require("@/assets/images/category_icons/category_icon_2.png"),
  require("@/assets/images/category_icons/category_icon_3.png"),
  require("@/assets/images/category_icons/category_icon_4.png"),
  require("@/assets/images/category_icons/category_icon_5.png"),
  require("@/assets/images/category_icons/category_icon_6.png"),
  require("@/assets/images/category_icons/category_icon_7.png"),
  require("@/assets/images/category_icons/category_icon_8.png"),
  require("@/assets/images/category_icons/category_icon_9.png"),
  require("@/assets/images/category_icons/category_icon_10.png"),
  require("@/assets/images/category_icons/category_icon_11.png"),
  require("@/assets/images/category_icons/category_icon_12.png"),
  require("@/assets/images/category_icons/category_icon_13.png"),
  require("@/assets/images/category_icons/category_icon_14.png"),
];

// ============================================================
// 테스트용 profile_id (나중에 authStore로 교체)
// ============================================================
// const TEST_PROFILE_ID = 102;

// ============================================================
// 메인 스크린 컴포넌트
// ============================================================
export default function MakingDeardayScreen() {
  const router = useRouter();
  const isLoadedRef = useRef(false);

  const profileId = useAuthStore((state) => state.profileId);

  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 사진 선택 모달
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [categoryPhotos, setCategoryPhotos] = useState<Photo[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  // 취소 확인 모달
  const [showCancelModal, setShowCancelModal] = useState(false);

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
          .select("id, name, display_order, icon_number")
          .eq("profile_id", profileId)
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
        .eq("profile_id", profileId)
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
      setSelectedPhotoIds((prev) => prev.filter((id) => id !== photoId));
      setSelectedPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } else {
      setSelectedPhotoIds((prev) => [...prev, photoId]);
      if (photo) {
        setSelectedPhotos((prev) => [...prev, photo]);
      }
    }
  };

  const handleClosePhotoModal = () => {
    setIsModalVisible(false);
    setSelectedCategory(null);
    setCategoryPhotos([]);
  };

  const handleRemovePhoto = (photoId: string) => {
    setSelectedPhotoIds((prev) => prev.filter((id) => id !== photoId));
    setSelectedPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  // 취소 버튼
  const handleCancel = () => {
    if (selectedPhotos.length > 0) {
      setShowCancelModal(true);
    } else {
      router.back();
    }
  };

  // 모달 - "삭제하기" 클릭
  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    router.replace("/(tabs)/record");
  };

  // 모달 - "취소" 클릭
  const handleDismissCancelModal = () => {
    setShowCancelModal(false);
  };

  // 다음 버튼
  const handleNext = () => {
    if (selectedPhotoIds.length === 0) return;

    router.push({
      pathname: "/dearday-editor",
      params: {
        photoIds: JSON.stringify(selectedPhotoIds),
        photos: JSON.stringify(selectedPhotos),
      },
    });
  };

  // ============================================================
  // 렌더링
  // ============================================================
  const hasSelectedPhotos = selectedPhotos.length > 0;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top"]}>
        <ActivityIndicator size="large" color="#5B8DEF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>making dearday</Text>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !hasSelectedPhotos && styles.nextButtonDisabled,
          ]}
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
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.selectedPhotoImage}
                />
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
              {CATEGORY_ICONS[item.icon_number] ? (
                <Image
                  source={CATEGORY_ICONS[item.icon_number]}
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
              ) : (
                <Ionicons name="folder-outline" size={24} color="#999" />
              )}
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
        onClose={handleClosePhotoModal}
        isLoading={isLoadingPhotos}
      />

      {/* 취소 확인 모달 */}
      <ConfirmModal
        visible={showCancelModal}
        title="정말 돌아가시겠습니까??"
        message="지금까지 만든 내용이 다 날라가요!"
        cancelText="취소"
        confirmText="삭제하기"
        onCancel={handleDismissCancelModal}
        onConfirm={handleConfirmCancel}
        confirmDestructive={true}
      />
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  headerButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 16,
    color: "#333",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  nextButton: {
    backgroundColor: "#5B8DEF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  nextButtonDisabled: {
    backgroundColor: "#B8D4FF",
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
