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

  const torchIcon = require("@/assets/images/torch.png");
  const facingIcon = require("@/assets/images/facing.png");

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
    const photo = await ref.current?.takePictureAsync({
      shutterSound: false,
    });
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

  const renderPicture = () => (
    <View style={{ flex: 1, width: "100%", backgroundColor: "#000" }}>
      <Image source={{ uri }} contentFit="contain" style={StyleSheet.absoluteFill} />
      {/* 상단 뒤로가기 버튼 */}
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 16, height: 72 + 16 },
        ]}
      >
        <Pressable
          onPress={() => setUri(null)}
          hitSlop={12}
          android_ripple={{ color: "rgba(255,255,255,0.2)", radius: 28 }}
          style={({ pressed }) => [styles.backBtn, pressed && styles.iconPressed]}
        >
          <Feather name="chevron-left" size={22} color="#fff" />
        </Pressable>
      </View>
      {/* 확인 버튼 */}
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
      </View>
    </View>
  );

  const renderCamera = () => (
  <GestureDetector gesture={pinchGesture}>
    <View style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "center" }}>
      <CameraView
        style={
          ratio === "1:1"
            ? {
                width: "100%",
                aspectRatio: 1, // 정사각형
              }
            : StyleSheet.absoluteFill // 나머지는 풀화면
        }
        ref={ref}
        mode="picture"
        facing={facing}
        responsiveOrientationWhenOrientationLocked
        enableTorch={torchOn}
        flash={flashMode}
        mirror={facing === "front" && mirrorOn}
        zoom={zoom}
        ratio={ratio}
      />

      {/* 상단 바 */}
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 16, height: 72 + 16 },
        ]}
      >
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
            <Pressable onPress={toggleRatio} style={styles.iconBtn}>
              <Text style={styles.iconText}>{ratio}</Text>
            </Pressable>
            {/* Flash */}
            <Pressable onPress={cycleFlash} style={styles.iconBtn}>
              <Text style={styles.iconText}>Flash {flashMode.toUpperCase()}</Text>
            </Pressable>
            {/* Mirror */}
            <Pressable onPress={toggleMirror} style={styles.iconBtn}>
              <Text style={styles.iconText}>MIRROR</Text>
            </Pressable>
            {/* Zoom HUD */}
            <Text style={styles.zoomHudText}>{(zoom * 100).toFixed(0)}%</Text>
          </View>
        </View>
      </View>

      {/* 하단 셔터/토치/카메라전환 */}
      <View style={styles.shutterContainer}>
        <Pressable onPress={toggleTorch}>
          <Image source={torchIcon} style={styles.torchIcon} />
        </Pressable>
        <Pressable onPress={takePicture}>
          <View style={styles.shutterBtn}>
            <View style={styles.shutterBtnInner} />
          </View>
        </Pressable>
        <Pressable onPress={toggleFacing}>
          <Image source={facingIcon} style={styles.torchIcon} />
        </Pressable>
      </View>
    </View>
  </GestureDetector>
);


  return (
    <>
      <Stack.Screen options={showStackHeader ? { headerShown: true } : { headerShown: false }} />
      {isDenied ? (
        <View style={styles.container}>
          <Text style={{ textAlign: "center", marginBottom: 16, color: "#fff" }}>
            카메라 권한이 필요합니다.
          </Text>
          <Button
            title="설정 열기"
            onPress={() =>
              Platform.OS === "ios" ? Linking.openURL("app-settings:") : Linking.openSettings()
            }
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
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, height: 72, paddingHorizontal: 14, justifyContent: "center", backgroundColor: "transparent", zIndex: 20 },
  topBarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  shutterContainer: { position: "absolute", bottom: 44, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 30, zIndex: 30 },
  shutterBtn: { backgroundColor: "transparent", borderWidth: 10, borderColor: "#5B8DEF", width: 75, height: 75, borderRadius: 75, alignItems: "center", justifyContent: "center" },
  shutterBtnInner: { width: 65, height: 65, borderRadius: 65, backgroundColor: "white" },
  iconBtn: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#C3C3C3" },
  iconText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  previewBtnWrap: { position: "absolute", left: 16, right: 16, bottom: 24, zIndex: 30 },
  primaryBtn: { height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#5B8DEF" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  zoomHudText: { fontSize: 13, color: "#fff", backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  iconPressed: { transform: [{ scale: 0.94 }], opacity: 0.85 },
  torchIcon: { width: 32, height: 32, resizeMode: "contain" },
});