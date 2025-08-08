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
import * as FileSystem from 'expo-file-system';
import { Image } from "expo-image";
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";

export default function CameraScreen() {
  const { profileId } = useAuthStore();
  const { notification_id } = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const ref = useRef<CameraView>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [mode, setMode] = useState<CameraMode>("picture");
  const [facing, setFacing] = useState<CameraType>("back");
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    // 권한이 '미확인'일 때만 요청 보내기
    if (permission && permission.status === "undetermined") {
        requestPermission();
    }
  }, [permission]);


  if (!permission) {
    console.log(permission);
    
    return null;
  }

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
    const photo = await ref.current?.takePictureAsync();
    setUri(photo?.uri);
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

  const renderPicture = () => {
    return (
      <View>
        <Image
          source={{ uri }}
          contentFit="contain"
          style={{ width: 300, aspectRatio: 1 }}
        />
        <Button onPress={() => setUri(null)} title="Take another picture" />
        <Button onPress={handleConfirmPhoto} title="Use this picture" />
      </View>
    );
  };

  const handleConfirmPhoto = async () => {
  try {
    if (!profileId || !uri) throw new Error("필수 정보 누락 (profileId 또는 uri)");

    const today = getLocalDateString();

    // supabase storage에 업로드
    // 1. base64로 파일 읽기
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 2. base64 → Uint8Array 변환
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // 3. 파일 이름 지정
    const fileName = `photo_${Date.now()}.jpg`; // TODO

    // 4. Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(fileName, bytes, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) throw error;

    // 5. Public URL 가져오기
    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);

    const imageUrl = urlData?.publicUrl;
    if (!imageUrl) throw new Error("Public URL 생성 실패");

    // memory 유무 확인 (없으면 생성)
    let memory_id: string;
    const { data: existingMemory, error: memoryQueryErr } = await supabase
        .from("memories")
        .select("memory_id")
        .eq("profile_id", profileId)
        .eq("date", today)
        .single();

    if (memoryQueryErr && memoryQueryErr.code !== "PGRST116") { // 에러가 "row not found"가 아닌 다른 문제일 경우
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

    // memory_entries insert
    const { data: existingEntries } = await supabase
      .from("memory_entries")
      .select("entry_index")
      .eq("memory_id", memory_id);

    const entryIndex =
      existingEntries && existingEntries.length > 0
        ? Math.max(...existingEntries.map((e) => e.entry_index)) + 1
        : 0;

    // 3. memory_entries에 insert
    const insertData = {
        memory_id,
        ...(notification_id && { notification_id }), // ✅ 있을 때만 추가
        entry_index: entryIndex,
        image_url: imageUrl,
    };

    const { error: entryErr } = await supabase
        .from("memory_entries")
        .insert(insertData);

    if (entryErr) throw entryErr;

    console.log("✅ 사진 업로드 및 DB 저장 완료");
    router.replace("/");
  } catch (err) {
    console.error("❌ handleConfirmPhoto 오류:", err);
    // Alert.alert("오류", err.message || "알 수 없는 오류");
  }
};


  const renderCamera = () => {
    return (
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
          <Pressable onPress={mode === "picture" ? takePicture : recordVideo}>
            {({ pressed }) => (
              <View
                style={[
                  styles.shutterBtn,
                  {
                    opacity: pressed ? 0.5 : 1,
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
    );
  };

  return (
    <View style={styles.container}>
      {uri ? renderPicture() : renderCamera()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
});