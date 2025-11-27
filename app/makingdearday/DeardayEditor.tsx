import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ConfirmModal from "./modals/ConfirmModal";

const { width } = Dimensions.get("window");
const SELECTED_PHOTO_SIZE = 56;

// ============================================================
// 타입 정의
// ============================================================
interface Photo {
  id: string;
  image_url: string;
  category_id: string;
}

// ============================================================
// 메인 컴포넌트
// ============================================================
export default function DeardayEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // 파라미터에서 사진 데이터 파싱
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [memo, setMemo] = useState("");
  
  // 취소 확인 모달
  const [showCancelModal, setShowCancelModal] = useState(false);

  // ============================================================
  // 초기화
  // ============================================================
  useEffect(() => {
    if (params.photos) {
      try {
        const parsedPhotos = JSON.parse(params.photos as string);
        setPhotos(parsedPhotos);
      } catch (error) {
        console.error("Error parsing photos:", error);
      }
    }
  }, [params.photos]);

  // ============================================================
  // 핸들러
  // ============================================================
  const handlePhotoPress = (index: number) => {
    setCurrentPhotoIndex(index);
  };

  // 취소 버튼
  const handleCancel = () => {
    setShowCancelModal(true);
  };

  // 모달 - "삭제하기"
  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    router.replace("/(tabs)/record");
  };

  // 모달 - "취소"
  const handleDismissCancelModal = () => {
    setShowCancelModal(false);
  };

  // 다음/완료 버튼
  const handleNext = () => {
    // TODO: 콘텐츠 저장 로직
    console.log("Save content:", {
      photos: photos.map(p => p.id),
      memo,
    });
    
    // 저장 후 record 화면으로
    router.replace("/(tabs)/record");
  };

  // ============================================================
  // 현재 날짜 포맷
  // ============================================================
  const today = new Date();
  const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  const dayName = dayNames[today.getDay()];

  // ============================================================
  // 현재 선택된 사진
  // ============================================================
  const currentPhoto = photos[currentPhotoIndex];

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>making dearday</Text>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>다음</Text>
        </TouchableOpacity>
      </View>

      {/* 선택된 사진들 (상단 썸네일) */}
      <View style={styles.thumbnailSection}>
        <FlatList
          data={photos}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.thumbnailWrapper,
                currentPhotoIndex === index && styles.thumbnailSelected,
              ]}
              onPress={() => handlePhotoPress(index)}
            >
              <Image source={{ uri: item.image_url }} style={styles.thumbnailImage} />
              <TouchableOpacity
                style={styles.removeThumbnailButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailList}
        />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 날짜 표시 */}
        <View style={styles.dateSection}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <Text style={styles.dayText}>{dayName}</Text>
          </View>
          <TouchableOpacity style={styles.addPhotoButton}>
            <Ionicons name="image-outline" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        {/* 메인 이미지 */}
        {currentPhoto && (
          <View style={styles.mainImageContainer}>
            <Image
              source={{ uri: currentPhoto.image_url }}
              style={styles.mainImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* 메모 입력 */}
        <View style={styles.memoContainer}>
          <TextInput
            style={styles.memoInput}
            placeholder="안녕하세요. 노트테이킹중입니다."
            placeholderTextColor="#999"
            value={memo}
            onChangeText={setMemo}
            multiline
          />
        </View>
      </ScrollView>

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
    </KeyboardAvoidingView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
  },
  nextButton: {
    backgroundColor: "#5B8DEF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // 썸네일 섹션
  thumbnailSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  thumbnailList: {
    paddingHorizontal: 16,
  },
  thumbnailWrapper: {
    position: "relative",
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbnailSelected: {
    borderColor: "#5B8DEF",
  },
  thumbnailImage: {
    width: SELECTED_PHOTO_SIZE,
    height: SELECTED_PHOTO_SIZE,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
  },
  removeThumbnailButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#fff",
    borderRadius: 9,
  },

  // 스크롤 컨텐츠
  scrollContent: {
    flex: 1,
  },

  // 날짜 섹션
  dateSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  dateBadge: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  dayText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  addPhotoButton: {
    position: "absolute",
    right: 16,
    padding: 8,
  },

  // 메인 이미지
  mainImageContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  mainImage: {
    width: "100%",
    height: width - 32,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },

  // 메모
  memoContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  memoInput: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    minHeight: 100,
  },
});