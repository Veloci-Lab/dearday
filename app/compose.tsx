import { Image } from "expo-image";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

export default function ComposeScreen() {
  const { uris, memory_id, notification_id } = useLocalSearchParams();
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [text, setText] = useState(""); // ✅ 텍스트 입력 상태
  const [placeName, setPlaceName] = useState(""); // ✅ 장소명 입력 상태
  const [loadingPlace, setLoadingPlace] = useState(true);

  useEffect(() => {
    // 사진 uri 파싱
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

  // 위치 감지 + 역지오코딩
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
