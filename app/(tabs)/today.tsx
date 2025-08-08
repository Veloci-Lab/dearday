import { useAuthStore } from "@/utils/authStore";
import { getLocalDateString } from "@/utils/date";
import { supabase } from "@/utils/supabase";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function TodayScreen() {
  const { profileId } = useAuthStore();
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;

    const fetchTodayImages = async () => {
  setLoading(true);

  // ✅ 메모리 ID 가져오기
  const { data: memoryData, error: memoryError } = await supabase
    .from("memories")
    .select("memory_id")
    .eq("profile_id", profileId)
    .eq("date", getLocalDateString())
    .single();

  if (memoryError || !memoryData) {
    console.error("❌ 메모리 조회 실패:", memoryError?.message);
    setEntries([]);
    setSelectedIds([]);
    setLoading(false);
    return;
  }

  // ✅ memory_entries 직접 조회 + 정렬
  const { data: entriesData, error: entriesError } = await supabase
    .from("memory_entries")
    .select("memory_entry_id, image_url, is_selected, entry_index")
    .eq("memory_id", memoryData.memory_id)
    .order("entry_index", { ascending: true });

    if (entriesError) {
      console.error("❌ 메모리 엔트리 조회 실패:", entriesError.message);
      setEntries([]);
      setSelectedIds([]);
      setLoading(false);
      return;
    }

    const entriesWithImages = entriesData.filter((e) => !!e.image_url);
    setEntries(entriesWithImages);

    const preSelected = entriesWithImages
      .filter((e) => e.is_selected)
      .map((e) => e.memory_entry_id);

    setSelectedIds(preSelected);
    setLoading(false);
  };


    fetchTodayImages();
  }, [profileId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleNext = async () => {
    try {
      // 선택된 항목 업데이트
      const { error: selectError } = await supabase
        .from("memory_entries")
        .update({ is_selected: true })
        .in("memory_entry_id", selectedIds);

      if (selectError) {
        console.error("❌ 선택 항목 업데이트 실패:", selectError.message);
        return;
      }

      // 선택되지 않은 항목 업데이트
      const unselectedIds = entries
        .map((e) => e.memory_entry_id)
        .filter((id) => !selectedIds.includes(id));

      if (unselectedIds.length > 0) {
        const { error: unselectError } = await supabase
          .from("memory_entries")
          .update({ is_selected: false })
          .in("memory_entry_id", unselectedIds);

        if (unselectError) {
          console.error("❌ 선택 해제 항목 업데이트 실패:", unselectError.message);
          return;
        }
      }

      router.push("/compose");
    } catch (err) {
      console.error("❌ handleNext 실행 오류:", err);
    }
  };

  if (!profileId || loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#5B8DEF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* 상단 안내 */}
      <View style={styles.header}>
        <Text style={styles.logo}>🟦Dearday</Text>
        <Text style={styles.title}>오늘 하루동안 찍으신 사진이에요</Text>
        <Text style={styles.subtitle}>N장을 골라서 기록해주세요</Text>
      </View>

      <ScrollView contentContainerStyle={styles.gridContainer}>
        {entries.length === 0 ? (
          <View style={styles.centered}>
            <Text style={{ color: "#888" }}>오늘 등록된 사진이 없어요.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {entries.map((entry) => {
              const isSelected = selectedIds.includes(entry.memory_entry_id);
              return (
                <TouchableOpacity
                  key={entry.memory_entry_id}
                  onPress={() => toggleSelect(entry.memory_entry_id)}
                  style={[
                    styles.imageWrapper,
                    isSelected && { opacity: 0.8 },
                  ]}
                >
                  <Image
                    source={{ uri: entry.image_url }}
                    style={styles.image}
                  />
                  {isSelected && (
                    <View style={styles.checkOverlay}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 하단 고정 */}
      <View style={styles.footerWrapper}>
        <TouchableOpacity
          onPress={handleNext}
          style={styles.footerButton}
          disabled={selectedIds.length === 0}
        >
          <Text style={styles.footerText}>
            총 {selectedIds.length}장을 선택했어요
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 16,
    backgroundColor: "#fff",
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5B8DEF",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#888",
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  imageWrapper: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
    backgroundColor: "#eee",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  checkOverlay: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  checkMark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
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
