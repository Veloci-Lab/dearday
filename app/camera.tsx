import { useAuthStore } from "@/utils/authStore";
import { getLocalDateString } from "@/utils/date";
import { supabase } from "@/utils/supabase";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import {
  CameraMode,
  CameraType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import * as FileSystem from "expo-file-system";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import * as Location from "expo-location"; // ← 위치
import * as MediaLibrary from "expo-media-library";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Button,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function App() {
  const { profileId } = useAuthStore();
  const { notification_id } = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const ref = useRef<CameraView>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [mode, setMode] = useState<CameraMode>("picture");
  const [facing, setFacing] = useState<CameraType>("back");
  const [recording, setRecording] = useState(false);
  const insets = useSafeAreaInsets();
  const [isUploading, setIsUploading] = useState(false);
  const [showQuickMemo, setShowQuickMemo] = useState(false);
  // 업로드 후 퀵메모에 필요
  const [memoryEntryId, setMemoryEntryId] = useState<number | null>(null);
  const [placeName, setPlaceName] = useState("");
  const [text, setText] = useState("");
  const [locating, setLocating] = useState(false);

  function pickNicePlace(geo?: Location.LocationGeocodedAddress | null) {
    if (!geo) return "";
    const parts = [geo.city ?? geo.subregion, geo.district, geo.name ?? geo.street].filter(Boolean);
    return parts.join(" ");
  }

  async function fillCurrentLocation() {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocating(false);
        Alert.alert("권한 필요", "설정에서 위치 접근을 허용해주세요.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geos = await Location.reverseGeocodeAsync(pos.coords);
      const pretty = pickNicePlace(geos[0]);
      if (pretty) setPlaceName(pretty);
    } catch (e) {
      console.warn("현재 위치 채우기 실패:", e);
    } finally {
      setLocating(false);
    }
  }

  useEffect(() => {
    if (permission?.status === "undetermined") {
      requestPermission();
    }
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        requestPermission();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [permission]);

  if (!permission) return null;

  // === 케이스 분기(헤더 옵션에만 사용) ===
  const isDenied = permission.status === "denied";
  const isRequesting = !permission.granted && !isDenied; // 권한 요청중/undetermined
  const showStackHeader = isDenied || isRequesting;

  // ---------------------------
  // 갤러리 저장 헬퍼 (앨범 만들지 않음)
  // ---------------------------
  const saveToGallery = async (localUri: string) => {
    try {
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        if (canAskAgain) {
          Alert.alert("권한 필요", "갤러리에 저장하려면 사진/미디어 권한을 허용해주세요.");
        }
        return;
      }
      await MediaLibrary.saveToLibraryAsync(localUri);
    } catch (e) {
      console.warn("갤러리 저장 실패:", e);
    }
  };

  const takePicture = async () => {
    const photo = await ref.current?.takePictureAsync();
    if (!photo?.uri) return;
    setUri(photo.uri);
    // 촬영 직후 갤러리에 자동 저장
    saveToGallery(photo.uri);
  };

  const recordVideo = async () => {
    if (recording) {
      setRecording(false);
      ref.current?.stopRecording();
      return;
    }
    setRecording(true);
    const video = await ref.current?.recordAsync();
    setRecording(false);
    if (video?.uri) {
      // 녹화 완료 후 갤러리에 자동 저장
      saveToGallery(video.uri);
      console.log({ video });
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "picture" ? "video" : "picture"));
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  const handleConfirmPhoto = async () => {
    if (isUploading) return; // 중복 클릭 방지
    setIsUploading(true);

    try {
      if (!profileId || !uri) throw new Error("필수 정보 누락 (profileId 또는 uri)");

      const today = getLocalDateString();

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const fileName = `photo_${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from("photos")
        .upload(fileName, bytes, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(fileName);
      const imageUrl = urlData?.publicUrl;
      if (!imageUrl) throw new Error("Public URL 생성 실패");

      let memory_id: string;
      const { data: existingMemory, error: memoryQueryErr } = await supabase
        .from("memories")
        .select("memory_id")
        .eq("profile_id", profileId)
        .eq("date", today)
        .single();

      if (memoryQueryErr && memoryQueryErr.code !== "PGRST116") {
        throw memoryQueryErr;
      }

      if (existingMemory) {
        memory_id = existingMemory.memory_id;
      } else {
        const { data: newMemory, error: insertErr } = await supabase
          .from("memories")
          .insert({ profile_id: profileId, date: today })
          .select("memory_id")
          .single();
        if (insertErr) throw insertErr;
        memory_id = newMemory.memory_id;
      }

      const { data: existingEntries } = await supabase
        .from("memory_entries")
        .select("entry_index")
        .eq("memory_id", memory_id);

      const entryIndex =
        existingEntries && existingEntries.length > 0
          ? Math.max(...existingEntries.map((e) => e.entry_index)) + 1
          : 0;

      const insertData = {
        memory_id,
        ...(notification_id && { notification_id }),
        entry_index: entryIndex,
        image_url: imageUrl,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const { data, error: entryErr } = await supabase
        .from("memory_entries")
        .insert(insertData)
        .select("memory_entry_id")
        .single();

      if (entryErr) throw entryErr;

      console.log("사진 업로드 및 DB 저장 완료");

      // ⬇️ 추가
      setMemoryEntryId(data.memory_entry_id);
      setShowQuickMemo(true);

      // 모달 열릴 때 위치 자동 채우기(한 번)
      setPlaceName(""); // 초기화(원하면 유지)
      setText("");
      fillCurrentLocation();

      setShowQuickMemo(true);

      // router.replace({
      //   pathname: "/quick-memo",
      //   params: {
      //     memory_entry_id: data.memory_entry_id,
      //   },
      // });
    } catch (err) {
      console.error("❌ handleConfirmPhoto 오류:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const renderPicture = () => {
    return (
      <View style={{ flex: 1, width: "100%", backgroundColor: "#000" }}>
        {/* 촬영된 이미지: 뒤에 꽉 채우기 (contain) */}
        <Image source={{ uri }} contentFit="contain" style={StyleSheet.absoluteFill} />

        {/* 상단 X (카메라뷰와 동일) */}
        {!showQuickMemo && ( // ← 모달이 보일 때는 안 보이게
          <View style={[styles.topBar, { paddingTop: insets.top }]}>
            <Pressable
              onPress={() => {
                router.back();
              }}
              hitSlop={12}
              android_ripple={{ color: "rgba(255,255,255,0.2)", radius: 28 }}
              style={({ pressed }) => [styles.backBtn, pressed && styles.iconPressed]}
            >
              <Feather name="x" size={22} color="#fff" />
            </Pressable>
          </View>
        )}

        {/* 상/하 마스크 (카메라뷰와 동일) */}
        <View style={styles.topMask} />
        <View style={styles.bottomMask} />

        {/* 하단 버튼 영역만 다름 */}
        <View style={[styles.previewBtnWrap, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={handleConfirmPhoto}
            disabled={isUploading}
            style={[
              styles.primaryBtn,
              isUploading && { opacity: 0.7 } // 비활성화 시 살짝 흐리게
            ]}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
            ) : (
              <Text style={styles.primaryBtnText}>오! 이거 좋은데?</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setUri(null);
            }}
            hitSlop={10}
            android_ripple={{ color: "rgba(0,0,0,0.08)" }}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressedSecondary]}
          >
            <Text style={styles.secondaryBtnText}>다시 찍을래요 ㅠㅠ</Text>
          </Pressable>
        </View>

        {/* Modal을 최상단에서 렌더 */}
        <Modal
          visible={showQuickMemo}
          animationType="slide"
          transparent
          onRequestClose={() => setShowQuickMemo(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>잊기 전에 정보를 넣어주세요</Text>
              <Text style={styles.modalDesc}>빈칸으로 둬도 좋아요. 언제든지 수정할 수 있어요</Text>

              {/* 수동 재시도(선택) */}
              {/* <Pressable onPress={fillCurrentLocation} style={{ marginTop: 8 }}>
                <Text style={{ color: "#3478F6" }}>현재 위치로 채우기</Text>
              </Pressable> */}

              <Text style={styles.label}>LOCATION</Text>
              
              <TextInput style={styles.input} placeholder="위치 입력" value={placeName} onChangeText={setPlaceName} />
              <View style={{ height: 18, justifyContent: "center" }}>
                {locating ? (
                  <Text style={{ fontSize: 12, color: "#999" }}>
                    현재 위치를 불러오는 중…
                  </Text>
                ) : (
                  <Text style={{ fontSize: 12, color: "transparent" }}>placeholder</Text>
                )}
              </View>

              <Text style={styles.label}>TEXT</Text>
              <TextInput
                style={[styles.textarea, { height: 60 }]} // 60px 정도면 3줄 기본
                multiline
                numberOfLines={3}
                value={text}
                onChangeText={setText}
                placeholder="내용을 입력하세요"
              />

              <Pressable
                android_ripple={{ color: "rgba(255,255,255,0.2)" }} // 안드로이드 물결 효과
                style={({ pressed }) => [ 
                  styles.submitBtn,
                  pressed && { opacity: 0.85 }, // iOS/Android 공통 살짝 어두워짐
                ]}
                onPress={async () => {
                  if (!memoryEntryId) return;

                  const { error } = await supabase
                    .from("memory_entries")
                    .update({
                      location: placeName.trim() || null,
                      content: text.trim() || null,
                    })
                    .eq("memory_entry_id", memoryEntryId);

                  if (error) {
                    console.error("퀵메모 업데이트 실패:", error.message);
                    Alert.alert("오류", "저장에 실패했어요. 다시 시도해주세요.");
                    return;
                  }

                  setShowQuickMemo(false); // 모달 닫기
                  
                  router.replace("/");
                }}
              >
                <Text style={styles.submitBtnText}>완료</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderCamera = () => {
    return (
      <View style={{ flex: 1, width: "100%" }}>
        <CameraView
          style={StyleSheet.absoluteFill}
          ref={ref}
          mode={mode}
          facing={facing}
          mute={false}
          responsiveOrientationWhenOrientationLocked
        />

        {/* 카메라 뷰에서는 커스텀 상단 X (Stack 헤더는 숨김) */}
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <Pressable
            onPress={() => {
              router.back();
            }}
            hitSlop={12}
            android_ripple={{ color: "rgba(255,255,255,0.2)", radius: 28 }}
            style={({ pressed }) => [styles.backBtn, pressed && styles.iconPressed]}
          >
            <Feather name="x" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* 상/하 반투명 마스크 */}
        <View style={styles.topMask} />
        <View style={styles.bottomMask} />

        <View style={styles.shutterContainer}>
          {/* toggleMode 버튼: 보이지 않게(영역 유지, 탭 불가) */}
          <Pressable
            onPress={toggleMode}
            disabled
            pointerEvents="none"
            style={styles.hiddenControl}
          >
            <AntDesign name="picture" size={32} color="white" style={{ opacity: 0 }} />
          </Pressable>

          <Pressable onPress={mode === "picture" ? takePicture : recordVideo}>
            {({ pressed }) => (
              <View style={[styles.shutterBtn, { opacity: pressed ? 0.5 : 1 }]}>
                <View
                  style={[
                    styles.shutterBtnInner,
                    { backgroundColor: mode === "picture" ? "white" : "red" },
                  ]}
                />
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={toggleFacing}
            hitSlop={10}
            style={({ pressed }) => pressed && { transform: [{ scale: 0.96 }] }}
          >
            <FontAwesome6 name="rotate-left" size={32} color="white" />
          </Pressable>
        </View>
      </View>
    );
  };

  // === 여기서 한 번만 리턴: 상태별 화면 + 헤더 옵션 동적 적용 ===
  return (
    <>
      <Stack.Screen
        options={
          showStackHeader
            ? {
              headerTitle: () => null,
              headerLeft: () => (
                <Pressable
                  style={{ flexDirection: "row", alignItems: "center" }}
                  onPress={() => router.back()}
                >
                  <Feather name="chevron-left" size={24} color="black" />
                </Pressable>
              ),
              }
            : { headerShown: false }
        }
      />

      {isDenied ? (
        <View style={styles.container}>
          <Text style={{ textAlign: "center", marginBottom: 16, color: "#fff" }}>
            카메라 권한이 필요합니다.{"\n"}설정에서 권한을 허용해주세요.
          </Text>
          <Button
            title="설정 열기"
            onPress={() => {
              if (Platform.OS === "ios") {
                Linking.openURL("app-settings:");
              } else {
                Linking.openSettings();
              }
            }}
          />
        </View>
      ) : isRequesting ? (
        <View style={styles.container}>
          <Text style={{ textAlign: "center", marginBottom: 16, color: "#fff" }}>
            권한 요청 중입니다...
          </Text>
        </View>
      ) : uri ? (
        <View style={styles.container}>{renderPicture()}</View>
      ) : (
        <View style={styles.container}>{renderCamera()}</View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
  },

  /* 상단바 & 뒤로가기 (카메라 뷰에서만 쓰이는 커스텀 버튼) */
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 72,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "transparent",
    zIndex: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* 상/하 마스크 */
  topMask: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "28%",
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 10,
  },
  bottomMask: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "24%",
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 10,
  },

  /* 셔터 영역 */
  shutterContainer: {
    position: "absolute",
    bottom: 44,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    zIndex: 30,
  },
  shutterBtn: {
    backgroundColor: "transparent",
    borderWidth: 5,
    borderColor: "white",
    width: 85,
    height: 85,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterBtnInner: {
    width: 70,
    height: 70,
    borderRadius: 50,
  },

  /* 미리보기 하단 버튼 컨테이너 (카메라뷰와 같은 레이어 위) */
  previewBtnWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,        // 카메라뷰의 shutterContainer( bottom:44 )와 톤만 맞추면 됨
    gap: 10,
    zIndex: 30,        // 마스크 위로
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5B8DEF",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F2F2",
  },
  secondaryBtnText: {
    color: "#111",
    fontWeight: "700",
    fontSize: 16,
  },

  // 공통 눌림 효과
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  pressedSecondary: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  iconPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },
  shutterPressed: {
    transform: [{ scale: 0.96 }],
  },

  // 하단 팝업
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 16,
    color: "#666",
    textAlign: "left",
    marginBottom: 24,
  },
  label: { fontSize: 12, color: "#888", marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  textarea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: "#5B8DEF",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnText: { color: "#fff", fontWeight: "bold" },

  /* 토글모드 숨김용(영역 유지) */
  hiddenControl: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
