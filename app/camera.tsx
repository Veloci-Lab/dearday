import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import {
  CameraMode,
  CameraType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from "react";
import {
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const ref = useRef<CameraView>(null);
  const [mode, setMode] = useState<CameraMode>("picture");
  const [facing, setFacing] = useState<CameraType>("back");
  const [recording, setRecording] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const { memory_id, notification_id, insert_index } = useLocalSearchParams();

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center" }}>
          We need your permission to use the camera
        </Text>
        <Button onPress={requestPermission} title="Grant permission" />
      </View>
    );
  }

  const takePicture = async () => {
     if (photos.length >= 3) {
        alert("최대 3장까지 등록할 수 있어요.");
        return;
      }
      
    const photo = await ref.current?.takePictureAsync();
    if (photo?.uri) {
      setPhotos((prev) => [...prev, photo.uri]);
    }
  };

  const deletePhoto = (uriToDelete: string) => {
    setPhotos((prev) => prev.filter((uri) => uri !== uriToDelete));
  };

  const uploadPhotos = async () => {
  console.log("uploadPhotos");

  // ✅ 먼저 compose 화면으로 uri 전달하고 이동
  router.push({
    pathname: "/compose",
    params: {
      uris: JSON.stringify(photos),
      memory_id,
      notification_id,
      insert_index,
    },
  });

  // ✅ 이후에 업로드는 백그라운드에서 진행
  // for (const uri of photos) {
  //   try {
  //     const {
  //       data: { session },
  //     } = await supabase.auth.getSession();

  //     const base64 = await FileSystem.readAsStringAsync(uri, {
  //       encoding: FileSystem.EncodingType.Base64,
  //     });

  //     const binary = atob(base64);
  //     const bytes = new Uint8Array(binary.length);
  //     for (let i = 0; i < binary.length; i++) {
  //       bytes[i] = binary.charCodeAt(i);
  //     }

  //     const fileName = `photo_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;

  //     const { error: uploadError } = await supabase.storage
  //       .from("photos")
  //       .upload(fileName, bytes, {
  //         contentType: "image/jpeg",
  //         upsert: true,
  //       });

  //     if (uploadError) {
  //       console.error("❌ Upload error:", uploadError.message);
  //       continue;
  //     }

  //     const { data: urlData } = supabase.storage
  //       .from("photos")
  //       .getPublicUrl(fileName);

  //     console.log("✅ Uploaded:", urlData.publicUrl);
  //     // TODO: 사진 업로드는 오래 걸려서 미리 하고 최종적으로 업로드때 혹시 안올라간거 있으면 올리고 db 업데이트.
  //   } catch (e) {
  //     console.error("Upload threw an error:", e);
  //   }
  // }
};


  const recordVideo = async () => {
    if (recording) {
      setRecording(false);
      ref.current?.stopRecording();
      return;
    }
    setRecording(true);
    const video = await ref.current?.recordAsync();
    console.log({ video });
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "picture" ? "video" : "picture"));
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  return (
    <View style={{ flex: 1 }}>
      {/* (1) 미리보기 썸네일 영역 - 고정 높이 */}
      <View style={styles.thumbnailWrapper}>
        {photos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailRow}
          >
            {photos.map((uri, index) => (
              <View key={index} style={{ marginRight: 8 }}>
                <Image
                  source={{ uri }}
                  style={styles.thumbnail}
                  contentFit="cover"
                />
                <TouchableOpacity
                  onPress={() => deletePhoto(uri)}
                  style={styles.deleteButton}
                >
                  <Text style={{ color: "white", fontSize: 12 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyThumbnail}>
            <Text style={{ color: "#aaa" }}>사진을 촬영해보세요</Text>
          </View>
        )}
      </View>

      {/* (2) 카메라 영역 - flex 1 */}
      <View style={{ flex: 1 }}>
        <CameraView
          style={styles.camera}
          ref={ref}
          mode={mode}
          facing={facing}
          mute={false}
          responsiveOrientationWhenOrientationLocked
        >
          <View style={styles.shutterContainer}>
            <Pressable onPress={toggleMode}>
              {mode === "picture" ? (
                <AntDesign name="picture" size={32} color="white" />
              ) : (
                <Feather name="video" size={32} color="white" />
              )}
            </Pressable>

            <Pressable
  onPress={mode === "picture" ? takePicture : recordVideo}
  disabled={mode === "picture" && photos.length >= 3}
>
  {({ pressed }) => (
    <View
      style={[
        styles.shutterBtn,
        {
          opacity:
            photos.length >= 3
              ? 0.3
              : pressed
              ? 0.5
              : 1,
        },
      ]}
    >
      <View
        style={[
          styles.shutterBtnInner,
          {
            backgroundColor: mode === "picture" ? "white" : "red",
          },
        ]}
      />
    </View>
  )}
</Pressable>


            <Pressable onPress={toggleFacing}>
              <FontAwesome6 name="rotate-left" size={32} color="white" />
            </Pressable>
          </View>
        </CameraView>
      </View>

      {/* (3) 하단 선택 완료 버튼 - 고정 높이 */}
      <View style={styles.confirmContainer}>
        <Button title="선택 완료" onPress={uploadPhotos} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  thumbnailWrapper: {
    height: 90,
    backgroundColor: "#111",
    justifyContent: "center",
  },
  thumbnailRow: {
    paddingHorizontal: 12,
    alignItems: "center",
  },
  emptyThumbnail: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  deleteButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "black",
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  shutterContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
  confirmContainer: {
    height: 72,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
});