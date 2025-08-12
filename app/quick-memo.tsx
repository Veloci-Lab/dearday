// app/quick-memo/[memory_entry_id].tsx (예시 경로)
// 기존 코드 + 위치 자동채우기 추가 버전

import { supabase } from "@/utils/supabase";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function QuickMemoScreen() {
  const { memory_entry_id } = useLocalSearchParams();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [locating, setLocating] = useState(false);

  // ✅ 기존 이미지 로드 쿼리: 변경 없음
  useEffect(() => {
    if (!memory_entry_id) return;

    const fetchImage = async () => {
      const { data, error } = await supabase
        .from("memory_entries")
        .select("image_url")
        .eq("memory_entry_id", memory_entry_id)
        .single();

      if (error) {
        console.error("❌ 이미지 로드 실패:", error.message);
        return;
      }

      setImageUrl(data.image_url);
    };

    fetchImage();
  }, [memory_entry_id]);

  // 위치를 문자열로 조합
  function pickNicePlace(geo?: Location.LocationGeocodedAddress | null) {
    if (!geo) return "";
    const parts = [
      geo.city ?? geo.subregion, // 시/도
      geo.district,              // 구/군
      geo.name ?? geo.street,    // 건물명/도로명
    ].filter(Boolean);
    return parts.join(" ");
  }

  // 화면 진입 시 자동으로 위치 받아와 장소 입력칸 채우기
  useEffect(() => {
    (async () => {
      try {
        setLocating(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocating(false);
          return; // 권한 거부 시 조용히 패스 (원하면 Alert 추가)
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const geos = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const pretty = pickNicePlace(geos[0]);
        // 사용자가 이미 입력했다면 덮어쓰지 않음
        if (pretty && !placeName) setPlaceName(pretty);
      } catch (e) {
        console.warn("위치 자동 채우기 실패:", e);
      } finally {
        setLocating(false);
      }
    })();
    // placeName을 의도적으로 deps에 넣지 않음(초기 1회만 자동 세팅)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 수동 재시도 버튼
  const fillCurrentLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocating(false);
        Alert.alert("권한 필요", "설정에서 위치 접근을 허용해주세요.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const geos = await Location.reverseGeocodeAsync(pos.coords);
      const pretty = pickNicePlace(geos[0]);
      if (pretty) setPlaceName(pretty);
    } catch (e) {
      console.warn("현재 위치로 채우기 실패:", e);
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!memory_entry_id) return;

    const { error } = await supabase
      .from("memory_entries")
      .update({
        location: placeName.trim() || null,
        content: text.trim() || null,
      })
      .eq("memory_entry_id", memory_entry_id); // ← 원본 그대로 유지

    if (error) {
      console.error("❌ 업데이트 실패:", error.message);
      Alert.alert("오류", "저장에 실패했어요. 다시 시도해주세요.");
      return;
    }

    router.replace("/");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>사진별로 기록해주세요</Text>
        <Text style={styles.subtitle}>
          {locating ? "현재 위치를 불러오는 중…" : "사진별로 기록해주세요"}
        </Text>

        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
          />
        )}

        {/* 장소 입력 */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={styles.label}>장소</Text>
          <TouchableOpacity onPress={fillCurrentLocation}>
            <Text style={{ color: "#3478F6" }}>현재 위치로 채우기</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          value={placeName}
          onChangeText={setPlaceName}
          placeholder="장소를 입력하세요"
        />

        {/* 텍스트 입력 */}
        <Text style={styles.label}>내용</Text>
        <TextInput
          style={styles.textarea}
          value={text}
          onChangeText={setText}
          placeholder="내용을 입력하세요"
          multiline
        />
      </ScrollView>

      {/* 하단 완료 버튼 */}
      <View style={styles.footerWrapper}>
        <TouchableOpacity onPress={handleSave} style={styles.footerButton}>
          <Text style={styles.footerText}>완료</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    marginBottom: 24,
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: "#eee",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textarea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    height: 100,
  },
  footerWrapper: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  footerButton: {
    backgroundColor: "#444",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  footerText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
