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
import * as MediaLibrary from "expo-media-library";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Button,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function App() {
  const { profileId } = useAuthStore();
  const { notification_id } = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const ref = useRef<CameraView>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [mode, setMode] = useState<CameraMode>("picture");
  const [facing, setFacing] = useState<CameraType>("back");
  const [recording, setRecording] = useState(false);

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

  if (permission.status === "denied") {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center", marginBottom: 16 }}>
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
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center", marginBottom: 16 }}>
          권한 요청 중입니다...
        </Text>
      </View>
    );
  }

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
    // ✅ 촬영 직후 갤러리에 자동 저장
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
      // ✅ 녹화 완료 후 갤러리에 자동 저장
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
      };

      const { data, error: entryErr } = await supabase
        .from("memory_entries")
        .insert(insertData)
        .select("memory_entry_id")
        .single();

      if (entryErr) throw entryErr;

      console.log("✅ 사진 업로드 및 DB 저장 완료");

      router.replace({
        pathname: "/quick-memo",
        params: {
          memory_entry_id: data.memory_entry_id,
        },
      });
    } catch (err) {
      console.error("❌ handleConfirmPhoto 오류:", err);
    }
  };

  const renderPicture = () => {
    return (
      <View>
        <Image source={{ uri }} contentFit="contain" style={{ width: 300, aspectRatio: 1 }} />
        <Button onPress={() => setUri(null)} title="Take another picture" />
        <Button onPress={handleConfirmPhoto} title="Use this picture" />
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
        <View style={styles.shutterContainer}>
          <Pressable onPress={toggleMode}>
            {mode === "picture" ? (
              <AntDesign name="picture" size={32} color="white" />
            ) : (
              <Feather name="video" size={32} color="white" />
            )}
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
          <Pressable onPress={toggleFacing}>
            <FontAwesome6 name="rotate-left" size={32} color="white" />
          </Pressable>
        </View>
      </View>
    );
  };

  return <View style={styles.container}>{uri ? renderPicture() : renderCamera()}</View>;
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
  shutterContainer: {
    position: "absolute",
    bottom: 44,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
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
});