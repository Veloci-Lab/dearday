import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


const { width } = Dimensions.get("window");
const ITEM_WIDTH = width * 0.7;
const ITEM_MARGIN = width * 0.05;

export default function ComposeScreen() {
  const { profileId } = useAuthStore();
  const { memory_id } = useLocalSearchParams();

  const [entries, setEntries] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId || !memory_id) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: memoryData, error: memoryError } = await supabase
        .from("memories")
        .select("memory_id")
        .eq("profile_id", profileId)
        .eq("memory_id", memory_id)
        .maybeSingle();

      if (memoryError || !memoryData) {
        Alert.alert("에러", "메모리 정보를 불러오지 못했습니다.");
        return;
      }

      const { data: entriesData, error: entriesError } = await supabase
        .from("memory_entries")
        .select("memory_entry_id, image_url, content, location")
        .eq("memory_id", memory_id)
        .eq("is_selected", true)
        .order("entry_index", { ascending: true });

      if (entriesError || !entriesData) {
        Alert.alert("에러", "메모리 항목을 불러오지 못했습니다.");
        return;
      }

      setEntries(
        entriesData.map((entry) => ({
          ...entry,
          locationInput: entry.location ?? "",
          contentInput: entry.content ?? "",
        }))
      );

      setLoading(false);
    };

    fetchData();
  }, [profileId, memory_id]);

  const handleUpdate = async () => {
    if (!memory_id) return;

    try {
      setLoading(true);

      // memory_entries 업데이트
      const updates = entries.map((entry) =>
        supabase
          .from("memory_entries")
          .update({
            location: entry.locationInput.trim() || null,
            content: entry.contentInput.trim() || null,
          })
          .eq("memory_entry_id", entry.memory_entry_id)
      );
      await Promise.all(updates);

      // memory is_completed 처리
      await supabase
        .from("memories")
        .update({ 
          is_completed: true,
          thumbnail_entry_id: entries[0].memory_entry_id, // TODO: 썸네일 선택 기능 추가. 임시로 첫번째 사진
         })
        .eq("memory_id", memory_id);

      Alert.alert("완료", "기록이 저장되었어요.");
      router.push("/");
    } catch (err) {
      Alert.alert("에러", "저장 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5B8DEF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={entries}
        horizontal
        pagingEnabled
        snapToInterval={ITEM_WIDTH + ITEM_MARGIN}
        decelerationRate="fast"
        contentContainerStyle={styles.flatListContent}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.memory_entry_id}
        renderItem={({ item, index }) => {
          const isSelected = index === currentIndex;
          return (
            <Image
              source={{ uri: item.image_url }}
              style={[
                styles.image,
                isSelected && styles.imageSelected,
              ]}
            />
          );
        }}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(
            e.nativeEvent.contentOffset.x / (ITEM_WIDTH + ITEM_MARGIN)
          );
          if (newIndex !== currentIndex) setCurrentIndex(newIndex);
        }}
      />

      <ScrollView contentContainerStyle={styles.inputSection}>
        <Text style={styles.label}>장소</Text>
        <TextInput
          style={styles.input}
          placeholder="장소를 입력하세요"
          value={entries[currentIndex]?.locationInput}
          onChangeText={(text) => {
            const updated = [...entries];
            updated[currentIndex].locationInput = text;
            setEntries(updated);
          }}
        />

        <Text style={styles.label}>내용</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="내용을 입력하세요"
          multiline
          value={entries[currentIndex]?.contentInput}
          onChangeText={(text) => {
            const updated = [...entries];
            updated[currentIndex].contentInput = text;
            setEntries(updated);
          }}
        />
      </ScrollView>

      {/* ✅ 하단 고정 완료 버튼 */}
      <SafeAreaView edges={['bottom']} style={styles.footerWrapper}>
        <TouchableOpacity style={styles.footerButton} onPress={handleUpdate}>
            <Text style={styles.footerText}>완료</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  flatListContent: {
    paddingHorizontal: ITEM_MARGIN,
    paddingTop: 16,
  },
  image: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    marginRight: ITEM_MARGIN,
    borderRadius: 12,
    backgroundColor: "#eee",
  },
  imageSelected: {
    borderColor: "#5B8DEF",
    borderWidth: 3,
    transform: [{ scale: 1.03 }],
  },
  inputSection: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  label: {
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  multiline: {
    height: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
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
