import { useAuthStore } from "@/utils/authStore";
import { getLocalDateString } from "@/utils/date";
import { supabase } from "@/utils/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const params = useLocalSearchParams<{ memory_id?: string | string[] }>();

  // 1) URL 파라미터 → state로 복사 (배열 대비)
  const initialId =
    typeof params.memory_id === "string"
      ? params.memory_id
      : Array.isArray(params.memory_id)
      ? params.memory_id[0]
      : null;
  const [memoryId, setMemoryId] = useState<string | null>(initialId);

  const [entries, setEntries] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // A. memoryId 결정: 없으면 오늘 날짜로 조회
  useEffect(() => {
    if (!profileId) return;

    (async () => {
      if (memoryId) return; // 이미 정해짐

      const today = getLocalDateString(); // ✅ 괄호 추가

      const { data, error } = await supabase
        .from("memories")
        .select("memory_id")
        .eq("date", today)
        .eq("profile_id", profileId)
        .maybeSingle();

      if (error) {
        console.error("오늘 memory_id 조회 실패:", error);
        setEntries([]);
        setSelectedIds([]);
        setLoading(false);
        return;
      }

      if (data?.memory_id) {
        setMemoryId(String(data.memory_id));
      } else {
        // 오늘 메모리 자체가 없음
        setEntries([]);
        setSelectedIds([]);
        setLoading(false);
      }
    })();
  }, [profileId, memoryId]);

  // B. entries 로드: memoryId가 정해지면 실행
  useEffect(() => {
    if (!profileId || !memoryId) return;

    (async () => {
      setLoading(true);

      // (선택) 해당 메모리가 정말 내 것인지 확인 — 문제 없으면 생략 가능
      const { data: mem, error: memErr } = await supabase
        .from("memories")
        .select("memory_id")
        .eq("profile_id", profileId)
        .eq("memory_id", memoryId)
        .maybeSingle();

      if (memErr) {
        console.error("memory 확인 실패:", memErr);
        Alert.alert("문제가 발생했어요. 잠시 후 다시 시도해주세요.");
        setEntries([]);
        setSelectedIds([]);
        setLoading(false);
        return;
      }
      if (!mem) {
        setEntries([]);
        setSelectedIds([]);
        setLoading(false);
        return;
      }

      const { data: entriesData, error: entriesError } = await supabase
        .from("memory_entries")
        .select("memory_entry_id, image_url, is_selected, entry_index")
        .eq("memory_id", memoryId)
        .order("entry_index", { ascending: true });

      if (entriesError || !entriesData) {
        Alert.alert("에러", "메모리 항목을 불러오지 못했습니다.");
        setEntries([]);
        setSelectedIds([]);
        setLoading(false);
        return;
      }

      const withImages = entriesData.filter((e) => !!e.image_url);
      setEntries(withImages);

      // id 타입을 문자열로 통일
      setSelectedIds(
        withImages.filter((e) => e.is_selected).map((e) => String(e.memory_entry_id))
      );

      setLoading(false);
    })();
  }, [profileId, memoryId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleNext = async () => {
    try {
      // 선택된 항목 true
      const { error: selectError } = await supabase
        .from("memory_entries")
        .update({ is_selected: true })
        .in("memory_entry_id", selectedIds);
      if (selectError) throw selectError;

      // 나머지는 false
      const unselectedIds = entries
        .map((e) => String(e.memory_entry_id))
        .filter((id) => !selectedIds.includes(id));

      if (unselectedIds.length) {
        const { error: unselectError } = await supabase
          .from("memory_entries")
          .update({ is_selected: false })
          .in("memory_entry_id", unselectedIds);
        if (unselectError) throw unselectError;
      }

      router.push({ pathname: "/compose", params: { memory_id: memoryId ?? "" } });
    } catch (err) {
      console.error("❌ handleNext 실행 오류:", err);
      Alert.alert("저장 중 오류가 발생했어요.");
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
              const id = String(entry.memory_entry_id);
              const isSelected = selectedIds.includes(id);
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => toggleSelect(id)}
                  style={[styles.imageWrapper, isSelected && { opacity: 0.8 }]}
                >
                  <Image source={{ uri: entry.image_url }} style={styles.image} />
                  {isSelected && (
                    <View className="checkOverlay" style={styles.checkOverlay}>
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
          style={[styles.footerButton, selectedIds.length === 0 && { opacity: 0.6 }]}
          disabled={selectedIds.length === 0}
        >
          <Text style={styles.footerText}>총 {selectedIds.length}장을 선택했어요</Text>
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
