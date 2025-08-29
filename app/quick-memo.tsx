// import { useAuthStore } from "@/utils/authStore";
// import { getLocalDateString } from "@/utils/date";
// import { supabase } from "@/utils/supabase";
// import { Feather } from "@expo/vector-icons";
// import * as FileSystem from "expo-file-system";
// import * as ImageManipulator from "expo-image-manipulator";
// import { LinearGradient } from "expo-linear-gradient";
// import * as Location from "expo-location";
// import { Stack, router, useLocalSearchParams } from "expo-router";
// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   Image,
//   KeyboardAvoidingView,
//   Platform,
//   Pressable,
//   SafeAreaView,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// async function uriToBytes(uri: string): Promise<Uint8Array> {
//   const base64 = await FileSystem.readAsStringAsync(uri, {
//     encoding: FileSystem.EncodingType.Base64,
//   });
//   const binary =
//     typeof atob !== "undefined"
//       ? atob(base64)
//       : Buffer.from(base64, "base64").toString("binary");
//   const bytes = new Uint8Array(binary.length);
//   for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
//   return bytes;
// }

// async function uploadToStorageReturnUrl(
//   bucket: string,
//   objectPath: string,
//   bytes: Uint8Array,
//   contentType: string = "image/jpeg",
//   cacheControl: string = "public, max-age=31536000, immutable"
// ): Promise<string> {
//   const { error } = await supabase.storage
//     .from(bucket)
//     .upload(objectPath, bytes, {
//       contentType,
//       upsert: false,
//       cacheControl,
//     });

//   if (error) throw error;

//   const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
//   return data.publicUrl;
// }

// export default function QuickMemoScreen() {
//   const insets = useSafeAreaInsets();
//   const { profileId } = useAuthStore();

//   const { local_uri, notification_id } = useLocalSearchParams<{
//     local_uri?: string;
//     notification_id?: string;
//   }>();

//   const [previewUri, setPreviewUri] = useState<string | null>(null);
//   const [remoteUrls, setRemoteUrls] = useState<{ original: string | null; thumb: string | null }>({
//     original: null,
//     thumb: null,
//   });
//   const [uploading, setUploading] = useState(false);
//   const [placeName, setPlaceName] = useState<string>("");
//   const [text, setText] = useState<string>("");
//   const [locating, setLocating] = useState(false);
//   const [saving, setSaving] = useState(false);

//   const uploadPromiseRef = useRef<Promise<{ original: string; thumb: string }> | null>(null);
  
//   const scrollViewRef = useRef<ScrollView>(null);
//   const contentInputRef = useRef<TextInput>(null);

//   useEffect(() => {
//     if (!local_uri) return;
//     setPreviewUri(decodeURIComponent(local_uri));
//   }, [local_uri]);

//   useEffect(() => {
//     if (!previewUri || remoteUrls.original || remoteUrls.thumb || uploading) return;

//     const startUpload = async (uri: string): Promise<{ original: string; thumb: string }> => {
//       setUploading(true);
//       try {
//         const BUCKET = "photos";
//         const ts = Date.now();
//         const baseKey = `${profileId}_${ts}`;

//         const origBytes = await uriToBytes(uri);
//         const origPath = `original/photo_${baseKey}.jpg`;
//         const finalOriginalUrl = await uploadToStorageReturnUrl(
//           BUCKET,
//           origPath,
//           origBytes,
//           "image/jpeg"
//         );

//         const manip = await ImageManipulator.manipulateAsync(
//           uri,
//           [{ resize: { width: 480 } }],
//           { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
//         );
//         const thumbBytes = await uriToBytes(manip.uri);
//         const thumbPath = `thumb/photo_${baseKey}.jpg`;
//         const finalThumbUrl = await uploadToStorageReturnUrl(
//           BUCKET,
//           thumbPath,
//           thumbBytes,
//           "image/jpeg"
//         );

//         setRemoteUrls({ original: finalOriginalUrl, thumb: finalThumbUrl });
//         return { original: finalOriginalUrl, thumb: finalThumbUrl };
//       } finally {
//         setUploading(false);
//       }
//     };

//     const p = startUpload(previewUri);
//     uploadPromiseRef.current = p;
//   }, [previewUri, remoteUrls.original, remoteUrls.thumb, uploading, profileId]);

//   function pickNicePlace(geo?: Location.LocationGeocodedAddress | null) {
//     if (!geo) return "";
//     const parts = [geo.city ?? geo.subregion, geo.district].filter(Boolean);
//     return parts.join(" ");
//   }

//   useEffect(() => {
//     (async () => {
//       try {
//         setLocating(true);
//         const { status } = await Location.requestForegroundPermissionsAsync();
//         if (status !== "granted") return;
//         const pos = await Location.getCurrentPositionAsync({
//           accuracy: Location.Accuracy.Balanced,
//         });
//         const geos = await Location.reverseGeocodeAsync({
//           latitude: pos.coords.latitude,
//           longitude: pos.coords.longitude,
//         });
//         const pretty = pickNicePlace(geos[0]);
//         if (pretty && !placeName) setPlaceName(pretty);
//       } catch (e) {
//         console.warn("위치 자동 채우기 실패:", e);
//       } finally {
//         setLocating(false);
//       }
//     })();
//   }, []);

//   const goBackToCamera = useCallback(() => {
//     router.replace("/camera");
//   }, []);

//   const handleSave = useCallback(async () => {
//     if (saving) return;
//     try {
//       setSaving(true);
//       if (!profileId) throw new Error("로그인이 필요합니다.");
//       if (!previewUri) throw new Error("이미지 경로가 없습니다.");

//       let finalOriginalUrl = remoteUrls.original;
//       let finalThumbUrl = remoteUrls.thumb;

//       if (!finalOriginalUrl || !finalThumbUrl) {
//         if (!uploadPromiseRef.current) {
//           Alert.alert("오류", "사진 업로드를 시작하지 못했어요. 다시 시도해주세요.");
//           setSaving(false);
//           return;
//         }
//         const res = await uploadPromiseRef.current;
//         finalOriginalUrl = res.original;
//         finalThumbUrl = res.thumb;
//       }
//       if (!finalOriginalUrl || !finalThumbUrl) {
//         throw new Error("업로드된 이미지 URL이 없습니다.");
//       }

//       const today = getLocalDateString();
//       let memory_id: number;
//       const { data: existingMemory, error: memErr } = await supabase
//         .from("memories")
//         .select("memory_id")
//         .eq("profile_id", Number(profileId))
//         .eq("date", today)
//         .single();

//       if (memErr && memErr.code !== "PGRST116") throw memErr;

//       if (existingMemory) {
//         memory_id = existingMemory.memory_id;
//       } else {
//         const { data: newMemory, error: insertMemErr } = await supabase
//           .from("memories")
//           .insert({ profile_id: Number(profileId), date: today })
//           .select("memory_id")
//           .single();
//         if (insertMemErr) throw insertMemErr;
//         memory_id = newMemory.memory_id;
//       }

//       const { data: existingEntries } = await supabase
//         .from("memory_entries")
//         .select("entry_index")
//         .eq("memory_id", memory_id);

//       const entryIndex =
//         existingEntries && existingEntries.length > 0
//           ? Math.max(...existingEntries.map((e: any) => e.entry_index)) + 1
//           : 0;

//       const insertData: any = {
//         memory_id,
//         entry_index: entryIndex,
//         image_url: finalOriginalUrl,
//         image_thumb_url: finalThumbUrl,
//         timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
//         location: placeName.trim() || null,
//         content: text.trim() || null,
//       };
//       if (notification_id) insertData.notification_id = notification_id;

//       const { error: entryErr } = await supabase.from("memory_entries").insert(insertData).single();
//       if (entryErr) throw entryErr;

//       router.replace("/");
//     } catch (e: any) {
//       console.error("⚠ 저장 실패:", e?.message ?? e);
//       Alert.alert("오류", "저장에 실패했어요. 다시 시도해주세요.");
//     } finally {
//       setSaving(false);
//     }
//   }, [saving, profileId, previewUri, remoteUrls.original, remoteUrls.thumb, placeName, text, notification_id]);

//   const hasImage = useMemo(() => !!previewUri, [previewUri]);

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
//       <Stack.Screen options={{ headerShown: false }} />

//       <KeyboardAvoidingView
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         style={{ flex: 1 }}
//       >
//         <View style={{ flex: 1 }}>
//           <ScrollView
//             ref={scrollViewRef}
//             contentContainerStyle={styles.container}
//             automaticallyAdjustContentInsets={false}
//             contentInsetAdjustmentBehavior="never"
//           >
//             <View style={styles.imageWrap}>
//               {hasImage && <Image source={{ uri: previewUri! }} style={styles.image} />}
//               <LinearGradient
//                 pointerEvents="none"
//                 colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.25)", "transparent"]}
//                 locations={[0, 0.5, 1]}
//                 style={styles.imageGradient}
//               />
//               <Pressable
//                 onPress={goBackToCamera}
//                 style={({ pressed }) => [
//                   styles.backFab,
//                   pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
//                 ]}
//                 hitSlop={10}
//               >
//                 <View style={styles.backFabBg}>
//                   <Feather name="chevron-left" size={22} color="#fff" />
//                 </View>
//               </Pressable>
//             </View>

//             <View style={{ marginVertical: 16 }}>
//               <Text style={styles.h1}>잊기 전에 정보를 넣어주세요</Text>
//               <Text style={styles.sub}>
//                 {locating ? "현재 위치를 불러오는 중..." : "빈칸으로 둬도 좋아요. 언제든지 수정할 수 있어요"}
//               </Text>
//             </View>

//             <Text style={styles.label}>내가 있는 곳</Text>
//             <TextInput
//               style={styles.input}
//               value={placeName}
//               onChangeText={setPlaceName}
//               placeholder="장소를 입력하세요"
//               editable={!saving}
//             />

//             <Text style={styles.label}>순간의 기록</Text>
//             <TextInput
//               ref={contentInputRef}
//               style={styles.textarea}
//               value={text}
//               onChangeText={setText}
//               placeholder="내용을 입력해주세요"
//               multiline
//               editable={!saving}
//               onFocus={() => {
//                 setTimeout(() => {
//                   contentInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
//                     scrollViewRef.current?.scrollTo({ y: pageY - 100, animated: true });
//                   });
//                 }, 200);
//               }}
//             />
//           </ScrollView>
//         </View>
//       </KeyboardAvoidingView>

//       <View style={styles.footerWrapper}>
//         <TouchableOpacity
//           onPress={handleSave}
//           style={styles.footerButton}
//           disabled={saving || !hasImage}
//         >
//           {saving ? (
//             <ActivityIndicator size="small" color="#fff" />
//           ) : (
//             <Text style={styles.footerText}>완료</Text>
//           )}
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { 
//     padding: 20, 
//     paddingBottom: 16 
//   },
//   imageWrap: {
//     position: "relative",
//     width: "100%",
//     borderRadius: 10,
//     overflow: "hidden",
//   },
//   image: {
//     width: "100%",
//     aspectRatio: 1,
//     borderRadius: 10,
//     backgroundColor: "#eee",
//   },
//   imageGradient: {
//     position: "absolute",
//     left: 0,
//     right: 0,
//     top: 0,
//     height: 96,
//   },
//   backFab: {
//     position: "absolute",
//     left: 12,
//     top: 12,
//   },
//   backFabBg: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "rgba(0,0,0,0.35)",
//   },
//   h1: {
//     fontFamily: "Pretendard-Bold",
//     fontSize: 20,
//     lineHeight: 28,
//     color: "#0F172A",
//   },
//   sub: {
//     fontFamily: "Pretendard-Regular",
//     marginTop: 6,
//     fontSize: 13,
//     color: "#929292",
//   },
//   label: {
//     fontFamily: "Pretendard-Regular",
//     fontSize: 14,
//     marginBottom: 8,
//     color: "#0D0D0D",
//   },
//   input: {
//     fontFamily: "Pretendard-Regular",
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     fontSize: 14,
//     marginBottom: 16,
//     color: "#333333"
//   },
//   textarea: {
//     fontFamily: "Pretendard-Regular",
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     fontSize: 14,
//     height: 100,
//     textAlignVertical: "top",
//   },
//   footerWrapper: { 
//     padding: 16, 
//     backgroundColor: "#fff",
//     borderTopWidth: 1,
//     borderTopColor: "#ddd",
//   },
//   footerButton: {
//     backgroundColor: "#5B8DEF",
//     borderRadius: 8,
//     paddingVertical: 14,
//     alignItems: "center",
//   },
//   footerText: {
//     fontFamily: "Pretendard-Bold",
//     color: "#fff",
//     fontSize: 16,
//   },
// });


import { useAuthStore } from "@/utils/authStore";
import { getLocalDateString } from "@/utils/date";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

async function uriToBytes(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary =
    typeof atob !== "undefined"
      ? atob(base64)
      : Buffer.from(base64, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function uploadToStorageReturnUrl(
  bucket: string,
  objectPath: string,
  bytes: Uint8Array,
  contentType: string = "image/jpeg",
  cacheControl: string = "public, max-age=31536000, immutable"
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, bytes, {
      contentType,
      upsert: false,
      cacheControl,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

export default function QuickMemoScreen() {
  const insets = useSafeAreaInsets();
  const { profileId } = useAuthStore();

  const { local_uri, notification_id } = useLocalSearchParams<{
    local_uri?: string;
    notification_id?: string;
  }>();

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [remoteUrls, setRemoteUrls] = useState<{ original: string | null; thumb: string | null }>({
    original: null,
    thumb: null,
  });
  const [uploading, setUploading] = useState(false);
  const [placeName, setPlaceName] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const uploadPromiseRef = useRef<Promise<{ original: string; thumb: string }> | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const contentInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!local_uri) return;
    setPreviewUri(decodeURIComponent(local_uri));
  }, [local_uri]);

  useEffect(() => {
    if (!previewUri || remoteUrls.original || remoteUrls.thumb || uploading) return;

    const startUpload = async (uri: string): Promise<{ original: string; thumb: string }> => {
      setUploading(true);
      try {
        const BUCKET = "photos";
        const ts = Date.now();
        const baseKey = `${profileId}_${ts}`;

        const origBytes = await uriToBytes(uri);
        const origPath = `original/photo_${baseKey}.jpg`;
        const finalOriginalUrl = await uploadToStorageReturnUrl(
          BUCKET,
          origPath,
          origBytes,
          "image/jpeg"
        );

        const manip = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 480 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        const thumbBytes = await uriToBytes(manip.uri);
        const thumbPath = `thumb/photo_${baseKey}.jpg`;
        const finalThumbUrl = await uploadToStorageReturnUrl(
          BUCKET,
          thumbPath,
          thumbBytes,
          "image/jpeg"
        );

        setRemoteUrls({ original: finalOriginalUrl, thumb: finalThumbUrl });
        return { original: finalOriginalUrl, thumb: finalThumbUrl };
      } finally {
        setUploading(false);
      }
    };

    const p = startUpload(previewUri);
    uploadPromiseRef.current = p;
  }, [previewUri, remoteUrls.original, remoteUrls.thumb, uploading, profileId]);

  function pickNicePlace(geo?: Location.LocationGeocodedAddress | null) {
    if (!geo) return "";
    const parts = [geo.city ?? geo.subregion, geo.district].filter(Boolean);
    return parts.join(" ");
  }

  useEffect(() => {
    (async () => {
      try {
        setLocating(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const geos = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const pretty = pickNicePlace(geos[0]);
        if (pretty && !placeName) setPlaceName(pretty);
      } catch (e) {
        console.warn("위치 자동 채우기 실패:", e);
      } finally {
        setLocating(false);
      }
    })();
  }, []);

  const goBackToCamera = useCallback(() => {
    router.replace("/camera");
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    try {
      setSaving(true);
      if (!profileId) throw new Error("로그인이 필요합니다.");
      if (!previewUri) throw new Error("이미지 경로가 없습니다.");

      let finalOriginalUrl = remoteUrls.original;
      let finalThumbUrl = remoteUrls.thumb;

      if (!finalOriginalUrl || !finalThumbUrl) {
        if (!uploadPromiseRef.current) {
          Alert.alert("오류", "사진 업로드를 시작하지 못했어요. 다시 시도해주세요.");
          setSaving(false);
          return;
        }
        const res = await uploadPromiseRef.current;
        finalOriginalUrl = res.original;
        finalThumbUrl = res.thumb;
      }
      if (!finalOriginalUrl || !finalThumbUrl) {
        throw new Error("업로드된 이미지 URL이 없습니다.");
      }

      const today = getLocalDateString();
      let memory_id: number;
      const { data: existingMemory, error: memErr } = await supabase
        .from("memories")
        .select("memory_id")
        .eq("profile_id", Number(profileId))
        .eq("date", today)
        .single();

      if (memErr && memErr.code !== "PGRST116") throw memErr;

      if (existingMemory) {
        memory_id = existingMemory.memory_id;
      } else {
        const { data: newMemory, error: insertMemErr } = await supabase
          .from("memories")
          .insert({ profile_id: Number(profileId), date: today })
          .select("memory_id")
          .single();
        if (insertMemErr) throw insertMemErr;
        memory_id = newMemory.memory_id;
      }

      const { data: existingEntries } = await supabase
        .from("memory_entries")
        .select("entry_index")
        .eq("memory_id", memory_id);

      const entryIndex =
        existingEntries && existingEntries.length > 0
          ? Math.max(...existingEntries.map((e: any) => e.entry_index)) + 1
          : 0;

      const insertData: any = {
        memory_id,
        entry_index: entryIndex,
        image_url: finalOriginalUrl,
        image_thumb_url: finalThumbUrl,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: placeName.trim() || null,
        content: text.trim() || null,
      };
      if (notification_id) insertData.notification_id = notification_id;

      const { error: entryErr } = await supabase.from("memory_entries").insert(insertData).single();
      if (entryErr) throw entryErr;

      router.replace("/");
    } catch (e: any) {
      console.error("⚠ 저장 실패:", e?.message ?? e);
      Alert.alert("오류", "저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }, [saving, profileId, previewUri, remoteUrls.original, remoteUrls.thumb, placeName, text, notification_id]);

  const hasImage = useMemo(() => !!previewUri, [previewUri]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.container}
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
          >
            <View style={styles.imageWrap}>
              {hasImage && <Image source={{ uri: previewUri! }} style={styles.image} />}
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.25)", "transparent"]}
                locations={[0, 0.5, 1]}
                style={styles.imageGradient}
              />
              <Pressable
                onPress={goBackToCamera}
                style={({ pressed }) => [
                  styles.backFab,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
                hitSlop={10}
              >
                <View style={styles.backFabBg}>
                  <Feather name="chevron-left" size={22} color="#fff" />
                </View>
              </Pressable>
            </View>

            <View style={{ marginVertical: 16 }}>
              <Text style={styles.h1}>잊기 전에 정보를 넣어주세요</Text>
              <Text style={styles.sub}>
                {locating ? "현재 위치를 불러오는 중..." : "빈칸으로 둬도 좋아요. 언제든지 수정할 수 있어요"}
              </Text>
            </View>

            <Text style={styles.label}>내가 있는 곳</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={placeName}
                onChangeText={setPlaceName}
                placeholder="장소를 입력하세요"
                editable={!saving}
              />
              {!!placeName && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setPlaceName("")}
                >
                  <Feather name="x-circle" size={18} color="#C2C2C2" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.label}>순간의 기록</Text>
            <TextInput
              ref={contentInputRef}
              style={styles.textarea}
              value={text}
              onChangeText={setText}
              placeholder="내용을 입력해주세요"
              multiline
              editable={!saving}
              onFocus={() => {
                setTimeout(() => {
                  contentInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
                    scrollViewRef.current?.scrollTo({ y: pageY - 100, animated: true });
                  });
                }, 200);
              }}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <View style={styles.footerWrapper}>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.footerButton}
          disabled={saving || !hasImage}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.footerText}>완료</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20, 
    paddingBottom: 16 
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 96,
  },
  backFab: {
    position: "absolute",
    left: 12,
    top: 12,
  },
  backFabBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  h1: {
    fontFamily: "Pretendard-Bold",
    fontSize: 20,
    lineHeight: 28,
    color: "#0F172A",
  },
  sub: {
    fontFamily: "Pretendard-Regular",
    marginTop: 6,
    fontSize: 13,
    color: "#929292",
  },
  label: {
    fontFamily: "Pretendard-Medium",
    fontSize: 14,
    marginBottom: 8,
    color: "#0D0D0D",
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#f2f2f2",
    borderRadius: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontFamily: "Pretendard-Regular",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333333"
  },
  clearButton: {
    padding: 8,
    marginRight: 4,
  },
  textarea: {
    fontFamily: "Pretendard-Regular",
    borderWidth: 1,
    borderColor: "#f2f2f2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    height: 100,
    textAlignVertical: "top",
  },
  footerWrapper: { 
    padding: 16, 
    backgroundColor: "#fff",
    // borderTopWidth: 1,
    // borderTopColor: "#ddd",
  },
  // footerButton: {
  //   backgroundColor: "#5B8DEF",
  //   borderRadius: 8,
  //   paddingVertical: 14,
  //   alignItems: "center",
  // },
  footerButton: {
    backgroundColor: "#5B8DEF",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: 'center',
  },
  footerText: {
    fontFamily: "Pretendard-Bold",
    color: "#fff",
    fontSize: 16,
  },
});