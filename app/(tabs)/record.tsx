import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ConfirmModal from "../makingdearday/modals/ConfirmModal";

// TODO: authStore로 교체
// const TEST_MODE = true;
// const TEST_PROFILE_ID = 102;
const profileId = useAuthStore((state) => state.profileId);
const router = useRouter();

type ContentItem = {
  id: string;
  name: string;
  created_at: string;
  thumbnail_photo_id: string | null;
  thumbnail_url: string | null;
  photo_count: number;
};

type GroupedContents = {
  [monthKey: string]: ContentItem[];
};

export default function RecordScreen() {
  // const router = useRouter();
  // const storeProfileId = useAuthStore((state) => state.profileId);
  // const profileId = TEST_MODE ? TEST_PROFILE_ID : storeProfileId;
  const router = useRouter();
  const profileId = useAuthStore((state) => state.profileId);

  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { width: screenWidth } = Dimensions.get("window");

  // 그리드 계산 (3열)
  const HORIZONTAL_PADDING = 13;
  const GAP = 8;
  const COLUMNS = 3;
  const itemWidth = (screenWidth - HORIZONTAL_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  // 화면 포커스될 때마다 데이터 다시 로드
  useFocusEffect(
    useCallback(() => {
      fetchContents();
    }, [])
  );

  const fetchContents = async () => {
    setLoading(true);
    try {
      // 1. contents 가져오기
      const { data: contentsData, error: contentsError } = await supabase
        .from("contents")
        .select("id, name, created_at, thumbnail_photo_id")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

      if (contentsError) throw contentsError;

      if (!contentsData || contentsData.length === 0) {
        setContents([]);
        setLoading(false);
        return;
      }

      // 2. 각 content의 photo_count 가져오기
      const contentIds = contentsData.map((c) => c.id);
      const { data: photoCountData, error: countError } = await supabase
        .from("content_photos")
        .select("content_id")
        .in("content_id", contentIds);

      if (countError) throw countError;

      // content_id별 카운트
      const countMap: Record<string, number> = {};
      photoCountData?.forEach((item) => {
        countMap[item.content_id] = (countMap[item.content_id] || 0) + 1;
      });

      // 3. thumbnail_photo_id로 image_url 가져오기
      const thumbnailIds = contentsData
        .map((c) => c.thumbnail_photo_id)
        .filter((id): id is string => id !== null);

      let thumbnailMap: Record<string, string> = {};
      if (thumbnailIds.length > 0) {
        const { data: photosData, error: photosError } = await supabase
          .from("photos")
          .select("id, image_url")
          .in("id", thumbnailIds);

        if (photosError) throw photosError;

        photosData?.forEach((photo) => {
          thumbnailMap[photo.id] = photo.image_url;
        });
      }

      // 4. 합치기
      const mergedContents: ContentItem[] = contentsData.map((content) => ({
        id: content.id,
        name: content.name,
        created_at: content.created_at,
        thumbnail_photo_id: content.thumbnail_photo_id,
        thumbnail_url: content.thumbnail_photo_id
          ? thumbnailMap[content.thumbnail_photo_id] || null
          : null,
        photo_count: countMap[content.id] || 0,
      }));

      setContents(mergedContents);
    } catch (error) {
      console.error("Error fetching contents:", error);
    } finally {
      setLoading(false);
    }
  };

  // 월별 그룹화
  const groupContentsByMonth = (): GroupedContents => {
    const grouped: GroupedContents = {};

    contents.forEach((content) => {
      const date = new Date(content.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(content);
    });

    return grouped;
  };

  // 월 이름 변환
  const getMonthName = (monthKey: string): string => {
    const [year, month] = monthKey.split("-");
    return `${parseInt(month)}월`;
  };

  const handleBack = () => {
    router.push("/(tabs)");
  };

  const handleToggleEditMode = () => {
    if (isEditMode) {
      setSelectedIds(new Set());
    }
    setIsEditMode(!isEditMode);
  };

  const handleSelectContent = (contentId: string) => {
    if (!isEditMode) {
      // 상세 페이지로 이동
      router.push({
        pathname: "/content-detail",
        params: { contentId },
      });
      return;
    }

    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contentId)) {
        newSet.delete(contentId);
      } else {
        newSet.add(contentId);
      }
      return newSet;
    });
  };

  const handleDeletePress = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedIds(new Set());
    setIsEditMode(false);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);

    try {
      // content_photos 먼저 삭제
      const { error: photosError } = await supabase
        .from("content_photos")
        .delete()
        .in("content_id", Array.from(selectedIds));

      if (photosError) throw photosError;

      // contents 삭제
      const { error: contentsError } = await supabase
        .from("contents")
        .delete()
        .in("id", Array.from(selectedIds));

      if (contentsError) throw contentsError;

      // 로컬 상태 업데이트
      setContents((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      setIsEditMode(false);
    } catch (error) {
      console.error("Error deleting contents:", error);
    }
  };

  const groupedContents = groupContentsByMonth();
  const sortedMonths = Object.keys(groupedContents).sort().reverse();

  // 로딩 화면 (썸네일 클릭할 때처럼)
  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "my dearday",
            headerTitleAlign: "center",
            headerLeft: () => (
              <TouchableOpacity onPress={handleBack} style={styles.headerLeftButton}>
                <Ionicons name="chevron-back" size={24} color="#333" />
              </TouchableOpacity>
            ),
            headerRight: () => <View style={styles.headerRightButton} />,
            headerStyle: { backgroundColor: "#fff" },
            headerTitleStyle: {
              fontSize: 18,
              fontWeight: "700",
              color: "#333",
            },
            headerShadowVisible: false,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B8DEF" />
        </View>
      </>
    );
  }

  return (
    <>
      {/* expo-router 헤더 */}
      <Stack.Screen
        options={{
          title: "my dearday",
          headerTitleAlign: "center",
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerLeftButton}>
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
          ),
          headerRight: () =>
            isEditMode ? (
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  selectedIds.size === 0 && styles.deleteButtonDisabled,
                ]}
                onPress={handleDeletePress}
                disabled={selectedIds.size === 0}
              >
                <Text style={styles.deleteButtonText}>삭제</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.headerRightButton}
                onPress={handleToggleEditMode}
              >
                <Text style={styles.editText}>편집</Text>
              </TouchableOpacity>
            ),
          headerStyle: {
            backgroundColor: "#fff",
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: "700",
            color: "#333",
          },
          headerShadowVisible: true,
        }}
      />

      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          {/* 월별 콘텐츠 그리드 */}
          {sortedMonths.map((monthKey) => (
            <View key={monthKey} style={styles.monthSection}>
              <View style={styles.monthBadge}>
                <Text style={styles.monthText}>{getMonthName(monthKey)}</Text>
              </View>
              <View style={styles.grid}>
                {groupedContents[monthKey].map((content) => {
                  const isSelected = selectedIds.has(content.id);
                  return (
                    <Pressable
                      key={content.id}
                      style={[
                        styles.contentCard,
                        { width: itemWidth },
                        isSelected && styles.contentCardSelected,
                      ]}
                      onPress={() => handleSelectContent(content.id)}
                    >
                      <View style={[styles.thumbnailContainer, { height: itemWidth }]}>
                        {content.thumbnail_url ? (
                          <Image
                            source={{ uri: content.thumbnail_url }}
                            style={styles.thumbnailImage}
                          />
                        ) : (
                          <View style={styles.noThumbnail}>
                            <Ionicons name="image-outline" size={24} color="#ccc" />
                          </View>
                        )}
                        {/* 사진 개수 뱃지 */}
                        {content.photo_count > 1 && (
                          <View style={styles.countBadge}>
                            <Text style={styles.countText}>+{content.photo_count - 1}</Text>
                          </View>
                        )}
                        {/* 편집 모드 체크박스 */}
                        {isEditMode && (
                          <View style={styles.checkboxContainer}>
                            <View
                              style={[
                                styles.checkbox,
                                isSelected && styles.checkboxSelected,
                              ]}
                            >
                              {isSelected && (
                                <Ionicons name="checkmark" size={14} color="#fff" />
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                      <Text style={styles.contentName} numberOfLines={1}>
                        {content.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {contents.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>아직 콘텐츠가 없습니다</Text>
              <Text style={styles.emptySubText}>
                + 버튼을 눌러 DearDay를 만들어보세요!
              </Text>
            </View>
          )}
        </ScrollView>

        {/* 삭제 확인 모달 */}
        <ConfirmModal
          visible={showDeleteModal}
          title="콘텐츠 삭제"
          message="선택한 콘텐츠를 삭제하시겠습니까?"
          cancelText="취소"
          confirmText="삭제하기"
          onCancel={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          confirmDestructive={true}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  headerLeftButton: {
    paddingLeft: 13,
    paddingVertical: 4,
  },
  headerRightButton: {
    paddingRight: 24,
    paddingVertical: 4,
  },
  editText: {
    fontSize: 16,
    color: "#333",
  },
  deleteButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 24,
  },
  deleteButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  monthSection: {
    marginTop: 20,
    paddingHorizontal: 13,
  },
  monthBadge: {
    alignSelf: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  monthText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  contentCard: {
    marginBottom: 8,
  },
  contentCardSelected: {
    opacity: 0.7,
  },
  thumbnailContainer: {
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  noThumbnail: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
  },
  countBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: "400",
    color: "#0D0D0D",
    lineHeight: 12,
    letterSpacing: -0.36,
  },
  checkboxContainer: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
  contentName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#333",
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
  },
});