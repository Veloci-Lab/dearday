import { useAuthStore } from "@/utils/authStore";
import Feather from "@expo/vector-icons/Feather";
import {
  CameraMode,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ★ 핀치 제스처 & Reanimated
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";

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

  // 플래시/토치/미러 상태
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [torchOn, setTorchOn] = useState(false);
  const [mirrorOn, setMirrorOn] = useState(true);

  // 줌 상태 (UI 표기용) + shared values(제스처 계산용)
  const [zoom, setZoom] = useState(0);        // 0 ~ 1, HUD/CameraView용
  const zoomSV = useSharedValue(0);           // worklet에서 사용하는 값
  const baseZoomSV = useSharedValue(0);       // 핀치 시작 기준
  const MIN_ZOOM = 0;
  const MAX_ZOOM = 1;
  const ZOOM_SENSITIVITY = 0.8;

  const [ratio, setRatio] = useState<"4:3" | "16:9" | "1:1">("4:3");

  useEffect(() => {
    if (permission?.status === "undetermined") requestPermission();
    const subscription = AppState.addEventListener("change", (s) => {
      if (s === "active") requestPermission();
    });
    return () => subscription.remove();
  }, [permission]);

  if (!permission) return null;

  const isDenied = permission.status === "denied";
  const isRequesting = !permission.granted && !isDenied;
  const showStackHeader = isDenied || isRequesting;

  // 갤러리 저장
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

  const cycleFlash = () => {
    setFlashMode((prev) => (prev === "off" ? "on" : prev === "on" ? "auto" : "off"));
  };

  const toggleTorch = () => setTorchOn((t) => !t);

  const toggleMirror = () => {
    setMirrorOn((m) => {
      const next = !m;
      return next;
    });
  };

  const toggleRatio = () => {
    setRatio((prev) => (prev === "4:3" ? "16:9" : prev === "16:9" ? "1:1" : "4:3"));
  };


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

  // ★ 핀치 제스처(Worklet-safe)
  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      "worklet";
      baseZoomSV.value = zoomSV.value;
    })
    .onChange((e) => {
      "worklet";
      // e.scale: 1(기준)에서 증가/감소
      let next = baseZoomSV.value + (e.scale - 1) * ZOOM_SENSITIVITY;
      if (next < MIN_ZOOM) next = MIN_ZOOM;
      if (next > MAX_ZOOM) next = MAX_ZOOM;

      // 너무 잦은 업데이트 완화
      if (Math.abs(next - zoomSV.value) > 0.002) {
        zoomSV.value = next;
        runOnJS(setZoom)(next); // UI State 업데이트는 JS 스레드로
      }
    });

  const renderPicture = () => (
    <View style={{ flex: 1, width: "100%", backgroundColor: "#000" }}>
      <Image source={{ uri }} contentFit="contain" style={StyleSheet.absoluteFill} />
      <View style={styles.topMask} pointerEvents="none" />
      <View style={styles.bottomMask} pointerEvents="none" />
      <View style={[styles.previewBtnWrap, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={handleConfirmPhoto}
          disabled={isUploading}
          style={[styles.primaryBtn, isUploading && { opacity: 0.7 }]}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
          ) : (
            <Text style={styles.primaryBtnText}>이 사진으로 기록하기</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => setUri(null)}
          hitSlop={10}
          android_ripple={{ color: "rgba(255,255,255,0.15)" }}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressedSecondary]}
        >
          <Text style={styles.secondaryBtnText}>다시 찍을래요</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderCamera = () => (
    <GestureDetector gesture={pinchGesture}>
      <View style={{ flex: 1, width: "100%" }}>
        <CameraView
          style={StyleSheet.absoluteFill}
          ref={ref}
          mode={mode}
          facing={facing}
          mute={false}
          responsiveOrientationWhenOrientationLocked
          enableTorch={torchOn}
          flash={flashMode}
          mirror={facing === "front" && mirrorOn}
          zoom={zoom} // 0~1
          ratio={ratio}
        />

        {/* 상단 바: 뒤로가기 + Flash / Mirror / Zoom% */}
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <View style={styles.topBarRow}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              android_ripple={{ color: "rgba(255,255,255,0.2)", radius: 28 }}
              style={({ pressed }) => [styles.backBtn, pressed && styles.iconPressed]}
            >
              <Feather name="x" size={22} color="#fff" />
            </Pressable>

            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              {/* Ratio */}
              <Pressable
                onPress={toggleRatio}
                hitSlop={10}
                android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true, radius: 24 }}
                style={({ pressed }) => [
                  styles.iconBtnWrap,
                  pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
                ]}
              >
                <View style={styles.iconBtn}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                    {ratio}
                  </Text>
                </View>
              </Pressable>

              {/* Flash */}
              <Pressable
                onPress={cycleFlash}
                hitSlop={10}
                android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true, radius: 24 }}
                style={({ pressed }) => [
                  styles.iconBtnWrap,
                  pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
                ]}
              >
                <View style={styles.iconBtn}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                    Flash {flashMode.toUpperCase()}
                  </Text>
                </View>
              </Pressable>

              {/* Mirror */}
              <Pressable
                onPress={toggleMirror}
                hitSlop={10}
                android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true, radius: 24 }}
                style={({ pressed }) => [
                  styles.iconBtnWrap,
                  pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
                ]}
              >
                <View style={styles.iconBtn}>
                  <Text style={{ color: "#fff", fontSize: 10, marginTop: 2 }}>
                    {mirrorOn ? "MIRROR" : "NORMAL"}
                  </Text>
                </View>
              </Pressable>

              {/* Zoom % HUD */}
              <View style={[styles.iconBtn, { paddingHorizontal: 12, minWidth: undefined }]}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                  {(zoom * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 상/하 반투명 마스크 (제스처 통과) */}
        <View style={styles.topMask} pointerEvents="none" />
        <View style={styles.bottomMask} pointerEvents="none" />

        {/* 하단 셔터/토치/카메라전환 */}
        <View style={styles.shutterContainer}>
          {/* 좌측: 토치 */}
          <Pressable
            onPress={toggleTorch}
            hitSlop={10}
            android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true, radius: 28 }}
            style={({ pressed }) => [
              styles.iconBtnWrap,
              pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
            ]}
          >
            <View style={styles.iconBtn}>
              <Feather name="zap" size={20} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 10, marginTop: 2 }}>
                {torchOn ? "TORCH" : "OFF"}
              </Text>
            </View>
          </Pressable>

          {/* 셔터 */}
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

          {/* 우측: 카메라 전환 */}
          <Pressable
            onPress={toggleFacing}
            hitSlop={10}
            android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true, radius: 28 }}
            style={({ pressed }) => [
              styles.iconBtnWrap,
              pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
            ]}
          >
            <Feather name="repeat" size={32} color="white" />
          </Pressable>
        </View>
      </View>
    </GestureDetector>
  );

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
              if (Platform.OS === "ios") Linking.openURL("app-settings:");
              else Linking.openSettings();
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

  // 상단 바
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
    borderWidth: 10,
    borderColor: "#5B8DEF",
    width: 75,
    height: 75,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterBtnInner: {
    width: 65,
    height: 65,
    borderRadius: 65,
  },

  // 아이콘 버튼(공용)
  iconBtnWrap: {
    borderRadius: 22,
    overflow: "hidden",
  },
  iconBtn: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 10,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(142,142,147,0.95)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
    // iOS 그림자
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    // Android 그림자
    elevation: 5,
  },

  /* 미리보기 하단 버튼 */
  previewBtnWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    gap: 10,
    zIndex: 30,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5B8DEF",
  },
  primaryBtnText: {
    fontFamily: "Pretendard-Bold",
    color: "#fff",
    fontSize: 16,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontFamily: "Pretendard-Regular",
    color: "#FEFEFE",
    fontSize: 16,
  },

  // 공통 눌림 효과
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  pressedSecondary: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  iconPressed: { transform: [{ scale: 0.94 }], opacity: 0.85 },

  // 숨김용
  hiddenControl: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
