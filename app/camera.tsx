import { useAuthStore } from "@/utils/authStore";
import Feather from "@expo/vector-icons/Feather";
import {
  CameraType,
  CameraView,
  FlashMode,
  useCameraPermissions,
} from "expo-camera";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import * as MediaLibrary from "expo-media-library";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Button,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function App() {
  const { profileId } = useAuthStore();
  const { notification_id } = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const ref = useRef<CameraView>(null);

  const [uri, setUri] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const insets = useSafeAreaInsets();
  const [isUploading, setIsUploading] = useState(false);

  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [torchOn, setTorchOn] = useState(false);
  const [mirrorOn, setMirrorOn] = useState(true);

  const [zoom, setZoom] = useState(0);
  const zoomSV = useSharedValue(0);
  const baseZoomSV = useSharedValue(0);
  const MIN_ZOOM = 0;
  const MAX_ZOOM = 1;
  const ZOOM_SENSITIVITY = 0.8;

  const [ratio, setRatio] = useState<"4:3" | "16:9" | "1:1">("4:3");
  const [btnBlockH, setBtnBlockH] = useState(0);
  const topOffset = insets.top + 16;  // 해치 + 패딩
  const bottomOffset = btnBlockH + (insets.bottom || 0) + 16;

  const torchIcon = require("@/assets/images/icons/torch.png");
  const facingIcon = require("@/assets/images/icons/facing.png");
  const mirrorOnIcon = require("@/assets/images/icons/mirror_on.png");
  const mirrorOffIcon = require("@/assets/images/icons/mirror_off.png");
  const flashOnIcon = require("@/assets/images/icons/flash_on.png");
  const flashOffIcon = require("@/assets/images/icons/flash_off.png");
  const flashAutoIcon = require("@/assets/images/icons/flash_auto.png");

  // 최초 한 번: 'undetermined'이면 다이얼로그 요청
  useEffect(() => {
    if (permission?.status === "undetermined") requestPermission();
  }, [permission?.status, requestPermission]);

  // 설정 다녀오거나 포그라운드 복귀 시: 항상 최신 상태 재확인
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") requestPermission();
    });
    return () => sub.remove();
  }, [requestPermission]);

  const granted = permission?.granted === true;

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
    const photo = await ref.current?.takePictureAsync({ shutterSound: false });
    if (!photo?.uri) return;
    setUri(photo.uri);
    saveToGallery(photo.uri);
  };

  const toggleFacing = () => setFacing((prev) => (prev === "back" ? "front" : "back"));
  const cycleFlash = () =>
    setFlashMode((prev) => (prev === "off" ? "on" : prev === "on" ? "auto" : "off"));
  const toggleTorch = () => setTorchOn((t) => !t);
  const toggleMirror = () => setMirrorOn((m) => !m);
  const toggleRatio = () =>
    setRatio((prev) => (prev === "4:3" ? "16:9" : prev === "16:9" ? "1:1" : "4:3"));

  const handleConfirmPhoto = async () => {
    if (!uri) return;
    router.replace({
      pathname: "/quick-memo",
      params: {
        local_uri: encodeURIComponent(uri),
        ...(notification_id && { notification_id: String(notification_id) }),
      },
    });
  };

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      "worklet";
      baseZoomSV.value = zoomSV.value;
    })
    .onChange((e) => {
      "worklet";
      let next = baseZoomSV.value + (e.scale - 1) * ZOOM_SENSITIVITY;
      if (next < MIN_ZOOM) next = MIN_ZOOM;
      if (next > MAX_ZOOM) next = MAX_ZOOM;
      if (Math.abs(next - zoomSV.value) > 0.002) {
        zoomSV.value = next;
        runOnJS(setZoom)(next);
      }
    });

  const renderPicture = () => {
    if (!uri) return null;
    const ar = ratio === "1:1" ? 1 : ratio === "16:9" ? 9 / 16 : 3 / 4;
    const bottomOffset = btnBlockH + (insets.bottom || 0) + 16;

    return (
      <View style={{ flex: 1, width: "100%", backgroundColor: "#000" }}>
        {ratio === "16:9" ? (
          // 16:9 전용 → 남는 영역 중앙 정렬
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: bottomOffset,
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <View style={[styles.previewFrame, { aspectRatio: ar }]}>
              <Image source={{ uri }} contentFit="cover" style={StyleSheet.absoluteFill} />
            </View>
          </View>
        ) : (
          // 1:1, 4:3 전용 → 그냥 중앙 배치
          <View
            style={{
              position: "absolute",
              top: topOffset,
              left: 0,
              right: 0,
              bottom: bottomOffset,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={[styles.previewFrame, { aspectRatio: ar }]}>
              <Image source={{ uri }} contentFit="cover" style={StyleSheet.absoluteFill} />
            </View>
          </View>
        )}

        {/* 하단 버튼 */}
        <View
          style={[styles.previewBtnGroup, { paddingBottom: insets.bottom }]}
          onLayout={(e) => setBtnBlockH(e.nativeEvent.layout.height)}
        >
          <Pressable
            onPress={handleConfirmPhoto}
            disabled={isUploading}
            style={[styles.primaryBtn, isUploading && { opacity: 0.7 }]}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
            ) : (
              <Text style={styles.primaryBtnText}>마음에 들어요</Text>
            )}
          </Pressable>

          <Pressable
  onPress={() => setUri(null)}
  hitSlop={10}
  style={styles.secondaryLink}   // height 제거
>
  <Text style={styles.secondaryLinkText}>다시 찍을래요</Text>
</Pressable>

        </View>
      </View>
    );
  };

  const renderCamera = () => {
    const arNum = ratio === "1:1" ? 1 : ratio === "16:9" ? 9 / 16 : 3 / 4;

    return (
      <GestureDetector gesture={pinchGesture}>
        {/* 전체 배경은 검정 */}
        <View style={{ flex: 1, width: "100%", backgroundColor: "#000" }}>
          {/* 카메라 박스를 화면 가운데에 배치 */}
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            {/* 🚩 iOS: 모든 비율을 컨테이너에서 고정 (여기서 레터박스가 생김)
                🚩 Android: 1:1만 컨테이너, 나머지는 기존처럼 풀스크린 유지 */}
            <View
              style={Platform.select({
                ios: {
                  width: "100%",
                  maxWidth: 900,          // 필요시 조정(레터박스 두께 바꾸고 싶으면 maxWidth 조정)
                  aspectRatio: arNum,     // 1:1 / 4:3 / 16:9 모두 컨테이너에 비율 적용
                  overflow: "hidden",
                },
                android:
                  ratio === "1:1"
                    ? { width: "100%", aspectRatio: 1, overflow: "hidden" }
                    : StyleSheet.absoluteFill,
              })}
            >
              <CameraView
                ref={ref}
                style={StyleSheet.absoluteFill} // 컨테이너를 '가득' 채우기만 함
                mode="picture"
                facing={facing}
                responsiveOrientationWhenOrientationLocked
                enableTorch={torchOn}
                flash={flashMode}
                mirror={facing === "front" && mirrorOn}
                zoom={zoom}
                // ✅ iOS는 ratio 전달하지 않음(무시됨). Android에만 전달.
                {...(Platform.OS === "android" ? { ratio } : {})}
              />
            </View>
          </View>

          {/* 하단 컨트롤 (그대로) */}
          <View style={[styles.bottomWrap, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.zoomHud}>
              <Text style={styles.zoomHudText}>{(zoom * 100).toFixed(0)}%</Text>
            </View>

            <Pressable onPress={takePicture} hitSlop={10} style={styles.shutterBtn}>
              <View style={styles.shutterBtnInner} />
            </Pressable>

            <View style={styles.controlRow}>
              <Pressable onPress={toggleTorch} hitSlop={10} style={styles.sideIconBtn}>
                <Image source={torchIcon} contentFit="contain" style={styles.sideIcon} />
              </Pressable>

              <View style={styles.centerPill}>
                <Pressable onPress={toggleMirror} style={styles.pillBtn}>
                  <Image
                    source={mirrorOn ? mirrorOnIcon : mirrorOffIcon}
                    style={styles.pillIcon}
                    contentFit="contain"
                  />
                </Pressable>
                <View style={styles.pillDivider} />

                <Pressable onPress={toggleRatio} style={styles.pillBtn}>
                  <Text style={styles.pillText}>{ratio}</Text>
                </Pressable>
                <View style={styles.pillDivider} />

                <Pressable onPress={cycleFlash} style={styles.pillBtn}>
                  <Image
                    source={
                      flashMode === "on"
                        ? flashOnIcon
                        : flashMode === "auto"
                        ? flashAutoIcon
                        : flashOffIcon
                    }
                    style={styles.pillIcon}
                    contentFit="contain"
                  />
                </Pressable>
              </View>

              <Pressable onPress={toggleFacing} hitSlop={10} style={styles.sideIconBtn}>
                <Image source={facingIcon} contentFit="contain" style={styles.sideIcon} />
              </Pressable>
            </View>
          </View>

          {/* 상단 바 */}
          <View style={[styles.topBar, { paddingTop: insets.top + 16, height: 72 + 16 }]}>
            <View style={styles.topBarRow}>
              <Pressable
                onPress={() => router.back()}
                hitSlop={12}
                android_ripple={{ color: "rgba(255,255,255,0.2)", radius: 28 }}
                style={({ pressed }) => [styles.backBtn, pressed && styles.iconPressed]}
              >
                <Feather name="x" size={22} color="#fff" />
              </Pressable>
              <View style={{ width: 36 }} />
            </View>
          </View>
        </View>
      </GestureDetector>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/* 권한 없으면: 설정 유도 화면만 노출 */}
      {!granted ? (
        <View style={styles.container}>
          <View style={[styles.topBar, { paddingTop: insets.top + 16, height: 72 + 16 }]}>
            <View style={styles.topBarRow}>
              <Pressable
                onPress={() => router.back()}
                hitSlop={12}
                android_ripple={{ color: "rgba(255,255,255,0.2)", radius: 28 }}
                style={({ pressed }) => [styles.backBtn, pressed && styles.iconPressed]}
                accessibilityRole="button"
                accessibilityLabel="닫기"
              >
                <Feather name="x" size={22} color="#fff" />
              </Pressable>
              <View style={{ width: 36 }} />
            </View>
          </View>

          <Text style={{ textAlign: "center", marginBottom: 16, color: "#fff" }}>
            사진 촬영을 위해 카메라 권한을 켜주세요.
          </Text>
          <Button
            title="설정 열기"
            onPress={() =>
              Platform.OS === "ios" ? Linking.openURL("app-settings:") : Linking.openSettings()
            }
          />
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

  /* 상단바 */
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
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },

  /* 하단 전체 래퍼 */
  bottomWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 20, // 확대비율 - 셔터 - 컨트롤 라인 간격
  },

  /* 확대비율 HUD */
  zoomHud: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#D9D9D966",
  },
  zoomHudText: {
    fontSize: 15,
    color: "#FEFEFE",
  },

  /* 셔터 버튼 */
  shutterBtn: {
    backgroundColor: "transparent",
    borderWidth: 10,
    borderColor: "#5B8DEF",
    width: 86,
    height: 86,
    borderRadius: 86,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterBtnInner: {
    width: 74,
    height: 74,
    borderRadius: 74,
    backgroundColor: "white",
  },

  /* 맨 아래 컨트롤 라인 */
  controlRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // 좌: 토치 / 중앙: pill / 우: 전환
  },
  sideIconBtn: {
    width: 64,
    height: 64,
    borderRadius: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  sideIcon: {
    width: 32,
    height: 32,
  },

  /* 중앙 pill (미러 / 비율 / 플래시) */
  centerPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 40,
    gap: 6,
    borderColor: "rgba(217, 217, 217, 0.4)",
    borderWidth: 1,
  },
  pillIcon: {
    width: 22,
    height: 22,
    tintColor: "#fff", // 필요하면 흰색 틴트
  },
  pillBtn: {
    paddingHorizontal: 10,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: {
    color: "#fff",
    fontSize: 15,
  },
  pillDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  // 미리보기 프레임(라운드 + 테두리)
  previewFrame: {
    width: "86%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#111", // 빈 공간 보일 때 대비
  },

  // 하단 버튼 그룹
  previewBtnGroup: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    alignItems: "center",
    gap: 10,
  },
  // 사진 선택
  primaryBtn: {
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5B8DEF",
    alignSelf: "stretch",
  },
  primaryBtnText: { color: "#FEFEFE", fontSize: 17, fontWeight: "700" },
  // 재촬영
  secondaryBtn: { 
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
   },
  secondaryBtnText: { color: "#FEFEFE", fontSize: 17 , fontWeight: "400" },
  secondaryLink: {
    paddingVertical: 8, // 살짝만 터치 영역
  },
  secondaryLinkText: {
    color: "#FEFEFE",
    fontSize: 16,
    fontWeight: "400",
    // textDecorationLine: "underline" // 원하면 링크 느낌
  },
});
