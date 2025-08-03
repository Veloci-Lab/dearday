import { useAuthStore } from "@/utils/authStore";
import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import { supabase } from "../../utils/supabase";

type MemoryEntry = {
  memory_entry_id: string;
  image_url: string | null;
  content: string | null;
};

type Memory = {
  memory_id: string;
  date: string;
  memory_entries: MemoryEntry[];
};

export default function MemoriesScreen() {
  const { profileId } = useAuthStore();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllMemories = async () => {
    const { data, error } = await supabase
      .from("memories")
      .select("*, memory_entries(*)")
      .eq("profile_id", profileId)
      .order("date", { ascending: false });

    if (error) {
      Alert.alert("메모리 불러오기 실패", error.message);
    } else {
      setMemories(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (profileId) {
      loadAllMemories();
    }
  }, [profileId]);

  if (loading) {
    return <Text style={{ textAlign: "center", marginTop: 40 }}>불러오는 중...</Text>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      {memories.length === 0 ? (
        <Text style={{ textAlign: "center" }}>메모리가 없습니다.</Text>
      ) : (
        memories.map((memory) => (
          <View key={memory.memory_id} style={{ marginBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
              {memory.date}
            </Text>

            {memory.memory_entries.length === 0 ? (
              <Text>엔트리 없음</Text>
            ) : (
              memory.memory_entries.map((entry) => (
                <View key={entry.memory_entry_id} style={{ marginBottom: 16 }}>
                  {entry.image_url ? (
                    <Image
                      source={{ uri: entry.image_url }}
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
