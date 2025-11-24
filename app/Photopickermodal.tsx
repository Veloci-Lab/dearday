import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const PHOTO_COLUMN_COUNT = 5;
const PHOTO_SIZE = (width - 32) / PHOTO_COLUMN_COUNT;

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

export interface PhotoPickerModalProps {
  visible: boolean;
  category: Category | null;
  photos: Photo[];
  selectedPhotoIds: string[];
  onTogglePhoto: (photoId: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

// ============================================================
// 컴포넌트
// ============================================================
export default function PhotoPickerModal({
  visible,
  category,
  photos,
  selectedPhotoIds,
  onTogglePhoto,
  onClose,
  isLoading = false,
}: PhotoPickerModalProps) {
  // 그리드 채우기용 빈 셀 추가
  const getGridData = (): (Photo | null)[] => {
    const data: (Photo | null)[] = [...photos];
    
    const minCells = 35;
    while (data.length < minCells) {
      data.push(null);
    }
    
    const remainder = data.length % PHOTO_COLUMN_COUNT;
    if (remainder !== 0) {
      const emptyCount = PHOTO_COLUMN_COUNT - remainder;
      for (let i = 0; i < emptyCount; i++) {
        data.push(null);
      }
    }
    
    return data;
  };

  const renderItem = ({ item, index }: { item: Photo | null; index: number }) => {
    if (!item) {
      return (
        <View style={styles.photoCell}>
          <View style={styles.emptyCell}>
            <View style={styles.emptyDot} />
          </View>
        </View>
      );
    }

    const isSelected = selectedPhotoIds.includes(item.id);

    return (
      <TouchableOpacity
        style={styles.photoCell}
        onPress={() => onTogglePhoto(item.id)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.image_url }} style={styles.photoImage} />
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.categoryLabel}>
              <View style={styles.categoryDot} />
              <Text style={styles.categoryName}>{category?.name}</Text>
            </View>
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>완료</Text>
            </TouchableOpacity>
          </View>

          {/* 사진 그리드 */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : (
            <FlatList
              data={getGridData()}
              renderItem={renderItem}
              keyExtractor={(item, index) => item?.id || `empty-${index}`}
              numColumns={PHOTO_COLUMN_COUNT}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.grid}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// 스타일
// ============================================================
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  categoryLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryDot: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: "#E879F9",
    marginRight: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  doneButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  grid: {
    padding: 8,
  },
  loadingContainer: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  photoCell: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    padding: 4,
  },
  photoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#F0F0F0",
  },
  checkbox: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  emptyCell: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
  },
});