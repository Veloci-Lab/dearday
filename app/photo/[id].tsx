// app/photo/[id].tsx
import { HomePhoto } from "@/components/PhotoGallery";
import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView as RNScrollView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const EditIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 18.6667H19.5"
      stroke="#929292"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M15.75 4.91685C16.0815 4.58532 16.5312 4.39908 17 4.39908C17.2321 4.39908 17.462 4.4448 17.6765 4.53364C17.891 4.62248 18.0858 4.75269 18.25 4.91685C18.4142 5.081 18.5444 5.27587 18.6332 5.49035C18.722 5.70483 18.7678 5.9347 18.7678 6.16685C18.7678 6.39899 18.722 6.62887 18.6332 6.84334C18.5444 7.05782 18.4142 7.25269 18.25 7.41685L7.83333 17.8335L4.5 18.6668L5.33333 15.3335L15.75 4.91685Z"
      stroke="#929292"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrashIcon = () => (
  <Svg width="30" height="30" viewBox="0 0 30 30" fill="none">
    <Path
      d="M6 9H8H24"
      stroke="#929292"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M22 9V23C22 23.5304 21.7893 24.0391 21.4142 24.4142C21.0391 24.7893 20.5304 25 20 25H10C9.46957 25 8.96086 24.7893 8.58579 24.4142C8.21071 24.0391 8 23.5304 8 23V9M11 9V7C11 6.46957 11.2107 5.96086 11.5858 5.58579C11.9609 5.21071 12.4696 5 13 5H17C17.5304 5 18.0391 5.21071 18.4142 5.58579C18.7893 5.96086 19 6.46957 19 7V9"
      stroke="#929292"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M13 14V20"
      stroke="#929292"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M17 14V20"
      stroke="#929292"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BackIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.3157 18.0232C15.6911 18.3903 15.6909 18.9943 15.3154 19.3612C14.9518 19.7164 14.3712 19.7163 14.0078 19.361L7.37084 12.8734C7.25332 12.7592 7.16005 12.6234 7.09641 12.4738C7.03276 12.3243 7 12.1639 7 12.0019C7 11.8398 7.03276 11.6794 7.09641 11.5299C7.16005 11.3803 7.25332 11.2445 7.37084 11.1303L14.0078 4.63928C14.3712 4.28393 14.9518 4.28391 15.3152 4.63923C15.6902 5.00594 15.6902 5.60936 15.3152 5.9761L9.15597 12L15.3157 18.0232Z"
      fill="#0D0D0D"
    />
  </Svg>
);

type FormattedDate = { top: string; bottom: string };

function formatKoreanDate(iso: string): FormattedDate {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return {
      top: iso,
      bottom: "",
    };
  }
  const weekdayNames = [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const weekday = weekdayNames[date.getDay()];

  return {
    top: `${y}년 ${m}월 ${d}일`,
    bottom: weekday,
  };
}

export default function PhotoDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profileId } = useAuthStore();

  const [photo, setPhoto] = useState<HomePhoto | null>(null);
  const [siblings, setSiblings] = useState<HomePhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // 편집 모드 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editedMemo, setEditedMemo] = useState("");
  const [originalMemo, setOriginalMemo] = useState("");
  const [saving, setSaving] = useState(false);

  // 경고 모달 상태
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const [showToast, setShowToast] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const memoInputRef = useRef<View>(null);
  const [memoLayoutY, setMemoLayoutY] = useState(0);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Supabase에서 사진 정보 불러오기
  useEffect(() => {
    async function fetchPhoto() {
      if (!id || !profileId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data: photoData, error: photoError } = await supabase
          .from("photos")
          .select(
            `
            id,
            category_id,
            image_url,
            memo,
            created_at,
            categories (name)
          `,
          )
          .eq("id", id)
          .single();

        if (photoError) throw photoError;

        const currentPhoto: HomePhoto = {
          id: photoData.id,
          categoryId: photoData.category_id,
          category: (photoData.categories as any)?.name,
          imageUrl: photoData.image_url,
          memo: photoData.memo,
          isRecorded: !!photoData.memo,
          createdAt: photoData.created_at,
        };

        setPhoto(currentPhoto);
        setEditedMemo(photoData.memo || "");
        setOriginalMemo(photoData.memo || "");

        if (photoData.category_id) {
          const { data: siblingsData, error: siblingsError } = await supabase
            .from("photos")
            .select(
              `
              id,
              category_id,
              image_url,
              memo,
              created_at,
              categories (name)
            `,
            )
            .eq("profile_id", profileId)
            .eq("category_id", photoData.category_id)
            .neq("id", id)
            .order("created_at", { ascending: false })
            .limit(10);

          if (!siblingsError && siblingsData) {
            const mappedSiblings: HomePhoto[] = siblingsData.map(
              (item: any) => ({
                id: item.id,
                categoryId: item.category_id,
                category: item.categories?.name,
                imageUrl: item.image_url,
                memo: item.memo,
                isRecorded: !!item.memo,
                createdAt: item.created_at,
              }),
            );
            setSiblings(mappedSiblings);
          }
        }
      } catch (err) {
        console.error("Error fetching photo:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPhoto();
  }, [id, profileId]);

  // 편집 모드 시작
  const handleStartEditing = () => {
    setIsEditing(true);
    setEditedMemo(photo?.memo || "");
    setOriginalMemo(photo?.memo || "");
  };

  // 편집 모드 종료 (변경사항 버림)
  const handleStopEditing = () => {
    setIsEditing(false);
    setEditedMemo(originalMemo); // 원래 값으로 복원
  };

  // 뒤로가기 처리 - 편집 중이고 변경사항 있으면 모달
  const handleBackPress = () => {
    if (isEditing && editedMemo !== originalMemo) {
      setShowDiscardModal(true);
    } else if (isEditing) {
      // 편집 중이지만 변경사항 없으면 그냥 뒤로가기
      setIsEditing(false);
      router.back();
    } else {
      router.back();
    }
  };

  // 변경사항 버리고 나가기
  const handleDiscardChanges = () => {
    setShowDiscardModal(false);
    setIsEditing(false);
    setEditedMemo(originalMemo);
    router.back(); // 모달에서 버리기 누르면 뒤로가기
  };

  const handleMemoFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: memoLayoutY - 150, // 사진 일부가 보이도록 여유 있게
        animated: true,
      });
    }, 300); // 키보드 애니메이션 후 스크롤
  };

  const handleSave = async () => {
    if (!photo) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from("photos")
        .update({ memo: editedMemo || null })
        .eq("id", photo.id);

      if (error) throw error;

      // 로컬 상태 업데이트
      setPhoto({
        ...photo,
        memo: editedMemo || undefined,
        isRecorded: !!editedMemo,
      });
      setOriginalMemo(editedMemo);
      setIsEditing(false);

      // 토스트 표시
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 1000);
    } catch (err) {
      console.error("Error saving memo:", err);
      Alert.alert("저장 실패", "메모 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!photo) return;

    try {
      setDeleting(true);

      const { error } = await supabase
        .from("photos")
        .delete()
        .eq("id", photo.id);

      if (error) throw error;

      setShowDeleteModal(false);
      router.back(); // 삭제 후 뒤로가기
    } catch (err) {
      console.error("Error deleting photo:", err);
      Alert.alert("삭제 실패", "사진 삭제에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setDeleting(false);
    }
  };

  // 로딩 중
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5B8DEF" />
        </View>
      </SafeAreaView>
    );
  }

  // 사진을 찾을 수 없음
  if (!photo) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text>사진을 찾을 수 없습니다.</Text>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButtonTextOnly}
          >
            <Text style={{ color: "#5B8DEF" }}>뒤로가기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const dateParts = formatKoreanDate(photo.createdAt);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} // 필요시 조정
      >
        <View style={{ flex: 1 }}>
          {/* 헤더 */}
          <View style={styles.header}>
            {/* 왼쪽 영역 - 고정 너비 */}
            <View style={{ width: 60, alignItems: "flex-start" }}>
              <Pressable
                style={{ width: 24, height: 24 }}
                onPress={handleBackPress}
                hitSlop={10}
              >
                <BackIcon />
              </Pressable>
            </View>

            {/* 가운데 카테고리 - 절대 위치로 항상 중앙 */}
            <View style={styles.categoryChipContainer}>
              <View style={styles.categoryChip}>
                <View style={styles.categoryDot} />
                <Text
                  style={{
                    fontFamily: "Pretendard-Bold",
                    fontSize: 17,
                    color: "#0D0D0D",
                    lineHeight: 20,
                    letterSpacing: -0.3,
                  }}
                >
                  {photo.category ?? "미분류"}
                </Text>
              </View>
            </View>

            {/* 오른쪽 영역 - 고정 너비 */}
            <View style={{ width: 60, alignItems: "flex-end" }}>
              {isEditing ? (
                <Pressable
                  style={{
                    paddingHorizontal: 15,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: "#5B8DEF",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text
                      style={{
                        fontFamily: "Pretendard-Bold",
                        fontSize: 15,
                        color: "#FEFEFE",
                      }}
                    >
                      완료
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1, marginHorizontal: 13 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 19 }}
          >
            <View
              style={{
                flexDirection: "row",
                marginVertical: 15,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Pressable
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: "#F2F2F2",
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={isEditing ? handleStopEditing : handleStartEditing}
              >
                <EditIcon />
              </Pressable>

              {dateParts && (
                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      height: 40,
                      paddingHorizontal: 15,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor: "#F2F2F2",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Pretendard-SemiBold",
                        fontSize: 14,
                        color: "#0D0D0D",
                      }}
                    >
                      {dateParts.top}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Pretendard-Regular",
                        fontSize: 10,
                        color: "#0D0D0D",
                      }}
                    >
                      {dateParts.bottom}
                    </Text>
                  </View>
                </View>
              )}

              <Pressable
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: "#F2F2F2",
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={() => setShowDeleteModal(true)}
              >
                <TrashIcon />
              </Pressable>
            </View>

            <View style={{ gap: 10 }}>
              <View style={{ borderRadius: 16, overflow: "hidden" }}>
                <Image
                  source={{ uri: photo.imageUrl }}
                  style={styles.mainImage}
                  contentFit="cover"
                />
              </View>

              {/* 메모 영역 - 편집 모드에 따라 다르게 표시 */}
              <View onLayout={(e) => setMemoLayoutY(e.nativeEvent.layout.y)}>
                {isEditing ? (
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 11,
                      borderRadius: 16,
                      backgroundColor: "#F2F2F2",
                    }}
                  >
                    <TextInput
                      style={{
                        fontFamily: "Pretendard-Regular",
                        fontSize: 13,
                        color: "#000000",
                        lineHeight: 20,
                        letterSpacing: -0.3,
                        textAlignVertical: "top",
                      }}
                      value={editedMemo}
                      onChangeText={setEditedMemo}
                      placeholder="메모를 입력하세요..."
                      multiline
                      autoFocus
                      onFocus={handleMemoFocus} // 포커스 시 스크롤
                      scrollEnabled={false} // TextInput 자체 스크롤 비활성화
                    />
                  </View>
                ) : photo.memo ? (
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 11,
                      borderRadius: 16,
                      backgroundColor: "#F2F2F2",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Pretendard-Regular",
                        fontSize: 13,
                        color: "#000000",
                        lineHeight: 20,
                        letterSpacing: -0.3,
                      }}
                    >
                      {photo.memo}
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={handleStartEditing}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 11,
                      borderRadius: 10,
                      backgroundColor: "#F2F2F2",
                      borderWidth: 1,
                      borderColor: "#E0E0E0",
                      borderStyle: "dashed",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Pretendard-Regular",
                        fontSize: 13,
                        color: "#999",
                        textAlign: "center",
                      }}
                    >
                      메모를 추가하려면 탭하세요
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* 하단 썸네일 리스트 */}
            {siblings.length > 0 && !isEditing && (
              <View style={styles.bottomSection}>
                <RNScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "center", // 가운데 정렬
                  }}
                >
                  {siblings.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() =>
                        router.replace({
                          pathname: "/photo/[id]",
                          params: { id: p.id },
                        })
                      }
                      style={styles.thumbWrapper}
                    >
                      <Image
                        source={{ uri: p.imageUrl }}
                        style={styles.thumb}
                        contentFit="cover"
                      />
                    </Pressable>
                  ))}
                </RNScrollView>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* 저장 완료 토스트 */}
      {showToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toast}>
            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <Path
                d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.584C12.7674 22.1954 10.5573 22.122 8.53447 21.3747C6.51168 20.6274 4.78465 19.2462 3.61096 17.4372C2.43727 15.6281 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13643 4.39828 5.49718C5.79935 3.85793 7.69279 2.71549 9.79619 2.24025C11.8996 1.76502 14.1003 1.98245 16.07 2.86011"
                stroke="#84AAF2"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M22 4L12 14.01L9 11.01"
                stroke="#84AAF2"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.toastText}>변경사항이 반영되었어요</Text>
          </View>
        </View>
      )}

      {/* 변경사항 버리기 경고 모달 */}
      <Modal
        visible={showDiscardModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDiscardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>정말 뒤로가시겠어요?</Text>
            <Text style={styles.modalMessage}>수정사항이 반영되지 않아요</Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowDiscardModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonDiscard]}
                onPress={handleDiscardChanges}
              >
                <Text style={styles.modalButtonDiscardText}>뒤로가기</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>정말 삭제하시겠어요??</Text>
            <Text style={styles.modalMessage}>
              삭제된 사진은 복구할 수 없어요
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonDiscard]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonDiscardText}>삭제</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomColor: "#F0F1F4",
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: "relative", // 추가
  },
  categoryChipContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none", // 터치 이벤트가 뒤로 전달되도록
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    pointerEvents: "auto", // 카테고리 자체는 터치 가능하게
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1DB96B",
    marginRight: 6,
  },
  mainImage: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  bottomSection: {
    marginTop: 30,
  },
  thumbWrapper: {
    width: 50,
    height: 50,
    borderRadius: 5,
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonTextOnly: {
    marginTop: 12,
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 320,
  },
  modalTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 17,
    color: "#0D0D0D",
    marginTop: 4,
    marginBottom: 6,
  },
  modalMessage: {
    fontFamily: "Pretendard-Regular",
    fontSize: 15,
    color: "#626262",
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    width: 134,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#929292",
  },
  modalButtonCancelText: {
    fontFamily: "Pretendard-Bold",
    fontSize: 15,
    color: "#929292",
  },
  modalButtonDiscard: {
    backgroundColor: "#E75234",
  },
  modalButtonDiscardText: {
    fontFamily: "Pretendard-Bold",
    fontSize: 15,
    color: "#fff",
  },
  // 토스트 스타일
  toastContainer: {
    position: "absolute",
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000BF",
    paddingLeft: 10,
    paddingRight: 15,
    paddingVertical: 8,
    borderRadius: 30,
    gap: 8,
  },
  toastText: {
    fontFamily: "Pretendard-Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});
