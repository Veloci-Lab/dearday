import { supabase } from "@/utils/supabase";
import * as FileSystem from 'expo-file-system';
import { Image } from "expo-image";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function ComposeScreen() {
  const { uris, memory_id, notification_id, insert_index } = useLocalSearchParams();
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [loadingPlace, setLoadingPlace] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (uris && typeof uris === "string") {
      try {
        const parsed = JSON.parse(uris);
        if (Array.isArray(parsed)) {
          setPhotoUris(parsed);
        }
      } catch (e) {
        console.error("사진 uri 파싱 실패:", e);
      }
    }
  }, [uris]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("위치 권한 거부됨");
          setPlaceName("장소 정보 없음");
          setLoadingPlace(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        const geo = await Location.reverseGeocodeAsync(loc.coords);

        if (geo.length > 0) {
          const g = geo[0];
          const name = `${g.region ?? ""} ${g.city ?? ""} ${g.street ?? ""}`;
          setPlaceName(name.trim());
        } else {
          setPlaceName("알 수 없는 장소");
        }
      } catch (e) {
        console.error("위치 정보 가져오기 실패:", e);
        setPlaceName("장소 정보 없음");
      } finally {
        setLoadingPlace(false);
      }
    })();
  }, []);

  const handleUpload = async () => {
    console.log('handleUpload');
    
    setUploading(true);
    try {
      if (!memory_id) {
        Alert.alert("오류", "memory_id가 없습니다");
        return;
      }

      const insertIndex = insert_index ? parseInt(insert_index as string, 10) : null;
      console.log(insertIndex);
      
      let entryIndex = 0;

      const { data: existingEntries, error: fetchError } = await supabase
        .from("memory_entries")
        .select("memory_entry_id, entry_index")
        .eq("memory_id", memory_id as string);
      if (fetchError) throw fetchError;

      if (!existingEntries || existingEntries.length === 0) {
        entryIndex = 0;
      } else if (insertIndex === null || isNaN(insertIndex)) {
        entryIndex = Math.max(...existingEntries.map((e) => e.entry_index)) + 1;
      } else {
        const shiftTargets = existingEntries.filter((e) => e.entry_index >= insertIndex);
        for (const target of shiftTargets) {
          await supabase
            .from("memory_entries")
            .update({ entry_index: target.entry_index + 1 })
            .eq("memory_entry_id", target.memory_entry_id);
        }
        entryIndex = insertIndex;
      }
      console.log(entryIndex);
      

      const { data: entry, error: entryErr } = await supabase
        .from("memory_entries")
        .insert({
          memory_id: memory_id as string,
          notification_id: notification_id ?? null,
          content: text,
          location: placeName,
          entry_index: entryIndex,
          is_uploaded: true,
          uploaded_at: new Date().toISOString(),
        })
        .select("memory_entry_id")
        .single();

      if (entryErr || !entry) {
        console.error(entryErr);
        Alert.alert("오류", "메모리 엔트리 생성 실패");
        return;
      }

      for (let i = 0; i < photoUris.length; i++) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const base64 = await FileSystem.readAsStringAsync(photoUris[i], {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const fileName = `photo_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, bytes, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("❌ Upload error:", uploadError.message);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("photos")
        .getPublicUrl(fileName);

      const { error: imgErr } = await supabase
          .from("memory_entry_images")
          .insert({
            memory_entry_id: entry.memory_entry_id,
            image_url: urlData,
            image_index: i,
            captured_at: null,
          });
        if (imgErr) console.error(imgErr);
    } catch (e) {
      console.error("Upload threw an error:", e);
    }
  }
  router.replace("/");

      // ✅ 사진 업로드 후 memory_entry_images에 insert
      // for (let i = 0; i < photoUris.length; i++) {
      //   const uri = photoUris[i];
      //   const response = await fetch(uri);
      //   const blob = await response.blob();
      //   const fileName = `photo_${Date.now()}_${i}.jpg`;

      //   const { error: uploadErr } = await supabase.storage
      //     .from("photos")
      //     .upload(fileName, blob, { upsert: true });
      //   if (uploadErr) {
      //     console.error('uploadErr', uploadErr);
      //     continue;
      //   }

      //   const { data: urlData } = supabase.storage.from("photos").getPublicUrl(fileName);
      //   const publicUrl = urlData.publicUrl;

      //   const { error: imgErr } = await supabase
      //     .from("memory_entry_images")
      //     .insert({
      //       memory_entry_id: entry.memory_entry_id,
      //       image_url: publicUrl,
      //       image_index: i,
      //       captured_at: null,
      //     });
      //   if (imgErr) console.error(imgErr);
      // }

      router.replace("/");
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "업로드 중 오류가 발생했습니다");
    } finally {
      setUploading(false);
    }
  };

  if (uploading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>업로드 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 12 }}>📸 선택한 사진</Text>

      <View style={{ gap: 12 }}>
        {photoUris.map((uri, index) => (
          <Image
            key={index}
            source={{ uri }}
            style={{
              width: "100%",
              height: 300,
              borderRadius: 12,
              backgroundColor: "#eee",
            }}
            contentFit="cover"
          />
        ))}
      </View>

      {/* 텍스트 입력 */}
      <Text style={{ marginTop: 24, fontSize: 16 }}>✍️ 텍스트</Text>
      <TextInput
        placeholder="당신의 오늘을 기록해보세요..."
        value={text}
        onChangeText={setText}
        multiline
        numberOfLines={4}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginTop: 8,
          textAlignVertical: "top",
        }}
      />

      {/* 장소 입력 */}
      <Text style={{ marginTop: 24, fontSize: 16 }}>📍 장소</Text>
      {loadingPlace ? (
        <ActivityIndicator style={{ marginTop: 12 }} />
      ) : (
        <TextInput
          placeholder="장소를 입력해주세요"
          value={placeName}
          onChangeText={setPlaceName}
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 8,
            padding: 12,
            marginTop: 8,
          }}
        />
      )}

      {/* 업로드 버튼 */}
      <Button title="업로드" onPress={handleUpload} disabled={photoUris.length === 0} />

      {/* 확인용 */}
      <Text style={{ marginTop: 32, fontSize: 14, color: "#888" }}>
        memory_id: {memory_id}
      </Text>
      <Text style={{ fontSize: 14, color: "#888" }}>
        notification_id: {notification_id}
      </Text>
    </ScrollView>
  );
}
