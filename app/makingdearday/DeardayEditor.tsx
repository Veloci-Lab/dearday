import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { SafeAreaView } from "react-native-safe-area-context";
import ConfirmModal from "./modals/ConfirmModal";
import ContentNameModal from "./modals/ContentNameModal";

const { width } = Dimensions.get("window");
const SELECTED_PHOTO_SIZE = 56;

// TODO: authStore로 교체
const TEST_PROFILE_ID = 102;

interface Photo {
  id: string;
  image_url: string;
  category_id: string;
}

export default function DeardayEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [thumbnailPhotoId, setThumbnailPhotoId] = useState<string | null>(null);
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (params.photos) {
      try {
        const parsedPhotos = JSON.parse(params.photos as string);
        setPhotos(parsedPhotos);
        if (parsedPhotos.length > 0) {
          setThumbnailPhotoId(parsedPhotos[0].id);
        }
      } catch (error) {
        console.error("Error parsing photos:", error);
      }
    }
  }, [params.photos]);

  const handlePhotoPress = (index: number) => {
    setCurrentPhotoIndex(index);
  };

  const handleSetThumbnail = () => {
    const currentPhoto = photos[currentPhotoIndex];
    if (currentPhoto) {
      setThumbnailPhotoId(currentPhoto.id);
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    const newPhotos = photos.filter((p) => p.id !== photoId);
    setPhotos(newPhotos);

    setMemos((prev) => {
      const newMemos = { ...prev };
      delete newMemos[photoId];
      return newMemos;
    });

    if (currentPhotoIndex >= newPhotos.length) {
      setCurrentPhotoIndex(Math.max(0, newPhotos.length - 1));
    }

    if (thumbnailPhotoId === photoId) {
      if (newPhotos.length > 0) {
        setThumbnailPhotoId(newPhotos[0].id);
      } else {
        setThumbnailPhotoId(null);
      }
    }
  };

  const handleMemoChange = (text: string) => {
    const currentPhoto = photos[currentPhotoIndex];
    if (currentPhoto) {
      setMemos((prev) => ({
        ...prev,
        [currentPhoto.id]: text,
      }));
    }
  };

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    router.replace("/(tabs)/record");
  };

  const handleDismissCancelModal = () => {
    setShowCancelModal(false);
  };

  const handleNext = () => {
    setShowNameModal(true);
  };

  const handleNameModalCancel = () => {
    setShowNameModal(false);
  };

  // 콘텐츠 생성 및 저장
  const handleCreateContent = async (contentName: string) => {
    setShowNameModal(false);
    setIsSaving(true);

    try {
      // 1. contents 테이블에 INSERT
      const { data: contentData, error: contentError } = await supabase
        .from("contents")
        .insert({
          profile_id: TEST_PROFILE_ID,
          name: contentName,
          thumbnail_photo_id: thumbnailPhotoId,
        })
        .select("id")
        .single();

      if (contentError) throw contentError;

      const contentId = contentData.id;

      // 2. content_photos 테이블에 INSERT (여러 개)
      const contentPhotosData = photos.map((photo, index) => ({
        content_id: contentId,
        photo_id: photo.id,
        memo: memos[photo.id] || null,
        display_order: index,
      }));

      const { error: photosError } = await supabase
        .from("content_photos")
        .insert(contentPhotosData);

      if (photosError) throw photosError;

      console.log("Content created:", contentId);

      // 3. ContentDetailScreen으로 이동
      router.replace({
        pathname: "/content-detail",
        params: { contentId },
      });
    } catch (error) {
      console.error("Error creating content:", error);
      // TODO: 에러 처리 (Toast 등)
    } finally {
      setIsSaving(false);
    }
  };

  const today = new Date();
  const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  const dayName = dayNames[today.getDay()];

  const currentPhoto = photos[currentPhotoIndex];
  const isCurrentPhotoThumbnail = currentPhoto?.id === thumbnailPhotoId;
  const currentMemo = currentPhoto ? memos[currentPhoto.id] || "" : "";

  if (isSaving) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top"]}>
        <ActivityIndicator size="large" color="#5B8DEF" />
        <Text style={styles.loadingText}>저장 중...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>making dearday</Text>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>다음</Text>
          </TouchableOpacity>
        </View>

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
                  onPress={() => handleRemovePhoto(item.id)}
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
          <View style={styles.dateSection}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>{formattedDate}</Text>
              <Text style={styles.dayText}>{dayName}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.thumbnailIconButton,
                isCurrentPhotoThumbnail && styles.thumbnailIconButtonActive,
              ]}
              onPress={handleSetThumbnail}
            >
              <Ionicons
                name="image-outline"
                size={20}
                color={isCurrentPhotoThumbnail ? "#fff" : "#999"}
              />
            </TouchableOpacity>
          </View>

          {currentPhoto && (
            <View style={styles.mainImageContainer}>
              <Image
                source={{ uri: currentPhoto.image_url }}
                style={styles.mainImage}
                resizeMode="cover"
              />
            </View>
          )}

          <View style={styles.memoContainer}>
            <TextInput
              style={styles.memoInput}
              placeholder="안녕하세요. 노트테이킹중입니다."
              placeholderTextColor="#999"
              value={currentMemo}
              onChangeText={handleMemoChange}
              multiline
            />
          </View>
        </ScrollView>

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

        <ContentNameModal
          visible={showNameModal}
          onCancel={handleNameModalCancel}
          onConfirm={handleCreateContent}
        />
      </KeyboardAvoidingView>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  keyboardAvoidingView: {
    flex: 1,
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
  nextButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  thumbnailSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  thumbnailList: {
    paddingHorizontal: 16,
    paddingTop: 6,
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
  scrollContent: {
    flex: 1,
  },
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
  thumbnailIconButton: {
    position: "absolute",
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailIconButtonActive: {
    backgroundColor: "#5B8DEF",
  },
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
  memoContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  memoInput: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 11,
    minHeight: 44,
  },
});