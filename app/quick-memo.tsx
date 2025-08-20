import { useAuthStore } from "@/utils/authStore";
import { getLocalDateString } from "@/utils/date";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

export default function QuickMemoScreen() {
  const insets = useSafeAreaInsets();
  const { profileId } = useAuthStore();

  const { local_uri, notification_id } = useLocalSearchParams<{
    local_uri?: string;
    notification_id?: string;
  }>();

  const [previewUri, setPreviewUri] = useState<string | null>(null);  // 로컬 미리보기
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);    // 업로드 완료 후 public URL
  const [uploading, setUploading] = useState(false);
  const [placeName, setPlaceName] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  // 업로드 작업 Promise 보관(저장 버튼에서 대기)
  const uploadPromiseRef = useRef<Promise<string> | null>(null);

  // 로컬 사진 세팅
  useEffect(() => {
    if (!local_uri) return;
    setPreviewUri(decodeURIComponent(local_uri));
  }, [local_uri]);

  // 들어오자마자 업로드 시작
  useEffect(() => {
    if (!previewUri || remoteUrl || uploading) return;

    const startUpload = async (uri: string): Promise<string> => {
      setUploading(true);
      try {
        // 파일 읽기 → base64 → 바이트로 변환
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // RN 환경에서 atob가 있을 수도/없을 수도 있어서 분기
        const binary =
          typeof atob !== "undefined"
            ? atob(base64)
            : Buffer.from(base64, "base64").toString("binary");
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const fileName = `photo_${profileId}_${Date.now()}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("photos")
          .upload(fileName, bytes, { contentType: "image/jpeg", upsert: false });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("photos").getPublicUrl(fileName);
        const imageUrl = urlData?.publicUrl;
        if (!imageUrl) throw new Error("Public URL 생성 실패");

        setRemoteUrl(imageUrl);
        return imageUrl;
      } finally {
        setUploading(false);
      }
    };

    const p = startUpload(previewUri);
    uploadPromiseRef.current = p;
  }, [previewUri, remoteUrl, uploading]);

  // 위치를 문자열로 조합
  function pickNicePlace(geo?: Location.LocationGeocodedAddress | null) {
    if (!geo) return "";
    const parts = [geo.city ?? geo.subregion, geo.district, geo.name ?? geo.street].filter(Boolean);
    return parts.join(" ");
  }

  // 화면 진입 시 위치 자동 채우기(거부 시 조용히 패스)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 뒤로가기: 단순히 카메라로 복귀(서버에 아직 아무것도 없음)
  const goBackToCamera = useCallback(() => {
    router.replace("/camera");
  }, []);

  // 저장: 업로드 완료될 때까지 대기 → memories 준비 → memory_entries insert
  const handleSave = useCallback(async () => {
    if (saving) return;
    try {
      setSaving(true);
      if (!profileId) throw new Error("로그인이 필요합니다.");
      if (!previewUri) throw new Error("이미지 경로가 없습니다.");

      // 업로드가 아직이면 완료될 때까지 대기
      let finalUrl = remoteUrl;
      if (!finalUrl) {
        if (!uploadPromiseRef.current) {
          Alert.alert("오류", "사진 업로드를 시작하지 못했어요. 다시 시도해주세요.");
          setSaving(false);
          return;
        }
        finalUrl = await uploadPromiseRef.current;
      }
      if (!finalUrl) throw new Error("업로드된 이미지 URL이 없습니다.");

      // 오늘자 memories 찾거나 생성
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

      // entry_index 계산
      const { data: existingEntries } = await supabase
        .from("memory_entries")
        .select("entry_index")
        .eq("memory_id", memory_id);

      const entryIndex =
        existingEntries && existingEntries.length > 0
          ? Math.max(...existingEntries.map((e: any) => e.entry_index)) + 1
          : 0;

      // memory_entries insert
      const insertData: any = {
        memory_id,
        entry_index: entryIndex,
        image_url: finalUrl,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: placeName.trim() || null,
        content: text.trim() || null,
      };
      if (notification_id) insertData.notification_id = notification_id;

      const { error: entryErr } = await supabase.from("memory_entries").insert(insertData).single();
      if (entryErr) throw entryErr;

      router.replace("/");
    } catch (e: any) {
      console.error("❌ 저장 실패:", e?.message ?? e);
      Alert.alert("오류", "저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }, [saving, profileId, previewUri, remoteUrl, placeName, text, notification_id]);

  const hasImage = useMemo(() => !!previewUri, [previewUri]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* 상단 네이티브 헤더 제거 */}
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: 20 + (Platform.OS === "android" ? insets.top : 0) },
        ]}
      >
        {/* 이미지 + 좌측 상단 뒤로가기 버튼 오버레이 */}
        <View style={styles.imageWrap}>
          {hasImage && <Image source={{ uri: previewUri! }} style={styles.image} />}

          {/*  상단 그라데이션 오버레이 (터치 막지 않도록 pointerEvents) */}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.25)", "transparent"]}
            locations={[0, 0.5, 1]}
            style={styles.imageGradient}
          /> 

          {/* 뒤로가기 버튼 (아이콘은 밝은색으로) */}
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
            {locating ? "현재 위치를 불러오는 중…" : "빈칸으로 둬도 좋아요. 언제든지 수정할 수 있어요"}
          </Text>
        </View>

        {/* 장소 입력 */}
        <Text style={styles.label}>내가 있는 곳</Text>
        <TextInput
          style={styles.input}
          value={placeName}
          onChangeText={setPlaceName}
          placeholder="장소를 입력하세요"
          editable={!saving}
        />

        {/* 텍스트 입력 */}
        <Text style={styles.label}>순간의 기록</Text>
        <TextInput
          style={styles.textarea}
          value={text}
          onChangeText={setText}
          placeholder="내용을 입력해주세요"
          multiline
          editable={!saving}
        />

        {/* 업로드 진행 상태 보조 텍스트(선택) */}
        {/* {uploading && (
          <Text style={{ marginTop: 8, color: "#888", fontSize: 12 }}>
            사진을 업로드하는 중이에요…
          </Text>
        )} */}
      </ScrollView>

      {/* 하단 완료 버튼 */}
      <View style={styles.footerWrapper}>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.footerButton}
          disabled={saving || !hasImage}           // 필요하면 || uploading 추가해서 업로드 중엔 터치 막아도 됨
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
  container: { padding: 20, paddingBottom: 120 },
  imageWrap: {
    position: "relative",
    width: "100%",
    borderRadius: 10,       // ⬅️ 추가
    overflow: "hidden",     // ⬅️ 추가 (그라데이션 라운드에 맞게 클리핑)
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
    height: 96,             // ⬅️ 상단만 덮을 높이. 필요시 80~120 사이로 조절
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
    backgroundColor: "rgba(0,0,0,0.35)", // ⬅️ 버튼 뒤 원형 배경
  },
  h1: { 
    fontFamily: "Pretendard-Bold",
    fontSize: 20, 
    lineHeight: 28, 
    //fontWeight: "700", 
    color: "#0F172A" 
  },
  sub: { 
    fontFamily: "Pretendard-Regular",
    marginTop: 6, 
    fontSize: 13, 
    color: "#929292" 
  },
  label: { 
    fontFamily: "Pretendard-Regular",
    fontSize: 14, 
    marginBottom: 8, 
    color: "#0D0D0D" 
  },
  input: { 
    fontFamily: "Pretendard-Regular",
    borderWidth: 1, 
    borderColor: "#ddd", 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    fontSize: 14, 
    marginBottom: 16 
  },
  textarea: { 
    fontFamily: "Pretendard-Regular",
    borderWidth: 1, 
    borderColor: "#ddd", 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    fontSize: 14, 
    height: 100, 
    textAlignVertical: "top" 
  },
  footerWrapper: { 
    padding: 16, 
    backgroundColor: "#fff", 
    borderTopWidth: 1, 
    borderTopColor: "#ddd" 
  },
  footerButton: { 
    backgroundColor: "#5B8DEF", 
    borderRadius: 8, 
    paddingVertical: 14, 
    alignItems: "center" 
  },
  footerText: { 
    fontFamily: "Pretendard-Bold",
    color: "#fff", 
    //fontWeight: "bold" 
  },
});
