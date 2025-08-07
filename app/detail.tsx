import { getUserMemoryEntry } from "@/utils/memoryBundles";
import { supabase } from "@/utils/supabase";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    Text,
    View,
} from "react-native";

const screenWidth = Dimensions.get("window").width;

export default function DetailScreen() {
  const { memory_entry_id } = useLocalSearchParams();
  const [entry, setEntry] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [memoryDate, setMemoryDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memory_entry_id || typeof memory_entry_id !== "string") return;

    (async () => {
      try {
        const result = await getUserMemoryEntry(supabase, memory_entry_id);
        if (!result) return;

        const { entry, images } = result;
        setEntry(entry);
        setImages(images);

        const { data: memory, error } = await supabase
          .from("memories")
          .select("date")
          .eq("memory_id", entry.memory_id)
          .single();

        if (error || !memory?.date) {
          console.error("Memory.date 조회 실패:", error?.message);
          return;
        }

        setMemoryDate(memory.date);
      } catch (err) {
        console.error("메모리 entry 조회 실패:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [memory_entry_id]);

  if (loading || !entry || !memoryDate) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>불러오는 중...</Text>
      </View>
    );
  }

  const weekday = new Date(memoryDate).toLocaleDateString("ko-KR", {
    weekday: "long",
  });

  const formattedDate = memoryDate.replaceAll("-", ".");
  const formattedTime = new Date(entry.uploaded_at ?? entry.created_at).toLocaleTimeString(
    "ko-KR",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "white" }}>
      {/* 상단 날짜 / 요일 / 업로드 시간 */}
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: "#000" }}>
          {formattedDate}
        </Text>
        <Text style={{ fontSize: 16, color: "#999", marginTop: 2 }}>{weekday}</Text>
        <Text style={{ fontSize: 16, marginTop: 12 }}>
          🕐 업로드 시간: {formattedTime}
        </Text>
        {entry.location && (
          <Text style={{ fontSize: 16, marginTop: 4 }}>📍 {entry.location}</Text>
        )}
      </View>

      {/* 이미지 슬라이드 */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: "#eee" }}
      >
        {images.map((img, i) => (
          <Image
            key={img.memory_entry_image_id ?? i}
            source={{ uri: img.image_url }}
            style={{
              width: screenWidth,
              height: 400,
              resizeMode: "cover",
            }}
          />
        ))}
      </ScrollView>

      {/* 텍스트 콘텐츠 */}
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 16, lineHeight: 22 }}>
          {entry.content}
        </Text>
      </View>
    </ScrollView>
  );
}
