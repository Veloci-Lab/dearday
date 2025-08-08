import { supabase } from "@/utils/supabase";
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

  const handleSave = async () => {
    if (!memory_entry_id) return;

    const { error } = await supabase
      .from("memory_entries")
      .update({
        location: placeName.trim() || null,
        content: text.trim() || null,
      })
      .eq("memory_entry_id", memory_entry_id);

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
        <Text style={styles.subtitle}>사진별로 기록해주세요</Text>

        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
          />
        )}

        {/* 장소 입력 */}
        <Text style={styles.label}>장소</Text>
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
