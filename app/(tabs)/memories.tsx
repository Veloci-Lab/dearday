import { useAuthStore } from "@/utils/authStore";
import { getUserMemoryBundleByMonth } from "@/utils/memoryBundles";
import { useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { supabase } from "../../utils/supabase";

// 📦 MemoryBundleWithoutNotifications 타입
type MemoryBundle = {
  memory: {
    memory_id: string;
    date: string;
    profile_id: string;
    created_at: string;
    updated_at: string | null;
  };
  entries: {
    entry: {
      memory_entry_id: string;
      content: string;
      created_at: string;
    };
    images: {
      image_id: string;
      image_url: string;
    }[];
  }[];
};

export default function MemoriesScreen() {
  const { profileId } = useAuthStore();
  const [memories, setMemories] = useState<MemoryBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<string>("");

  const loadMonthMemories = async (profileId: string) => {
    try {
      const today = new Date();
      const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      setCurrentMonth(month);

      const result = await getUserMemoryBundleByMonth(supabase, profileId, month);
      setMemories(result);
    } catch (e) {
      console.error("메모리 불러오기 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileId) {
      loadMonthMemories(profileId);
    }
  }, [profileId]);

  if (loading) {
    return <Text style={{ textAlign: "center", marginTop: 40 }}>불러오는 중...</Text>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 16 }}>
        📅 {currentMonth} 메모리
      </Text>

      {memories.length === 0 ? (
        <Text style={{ textAlign: "center" }}>메모리가 없습니다.</Text>
      ) : (
        memories.map(({ memory, entries }) => (
          <View key={memory.memory_id} style={{ marginBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
              {memory.date}
            </Text>

            {entries.length === 0 ? (
              <Text>엔트리 없음</Text>
            ) : (
              entries.map(({ entry, images }) => (
                <View key={entry.memory_entry_id} style={{ marginBottom: 16 }}>
                  {images[0]?.image_url ? (
                    <Image
                      source={{ uri: images[0].image_url }}
                      style={{ width: "100%", height: 300, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text>이미지 없음</Text>
                  )}
                  <Text style={{ marginTop: 8 }}>
                    {entry.content || "텍스트 없음"}
                  </Text>
                </View>
              ))
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}
