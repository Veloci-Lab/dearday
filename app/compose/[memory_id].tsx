import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const ITEM_WIDTH = width * 0.7;
const ITEM_MARGIN = width * 0.05;
const FOOTER_HEIGHT = 72; // 하단 버튼 영역 높이만큼 여유

export default function ComposeScreen() {
  const navigation = useNavigation();

  const { profileId } = useAuthStore();
  const { memory_id } = useLocalSearchParams();

  const [entries, setEntries] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [thumbnailId, setThumbnailId] = useState<number | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          style={{ flexDirection: "row", alignItems: "center" }}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={24} color="black" />
        </Pressable>
      ),
      headerTitle: "",
    });
  }, [navigation]);

  useEffect(() => {
    if (!profileId || !memory_id) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: memoryData, error: memoryError } = await supabase
        .from("memories")
        .select("memory_id, is_completed, thumbnail_entry_id")
        .eq("profile_id", Number(profileId))
        .eq("memory_id", Number(memory_id))
        .maybeSingle();

      if (memoryError || !memoryData) {
        Alert.alert("에러", "메모리 정보를 불러오지 못했습니다.");
        return;
      }

      const { data: entriesData, error: entriesError } = await supabase
        .from("memory_entries")
        .select("memory_entry_id, content, location, image_path, image_thumb_path")
        .eq("memory_id", Number(memory_id))
        .eq("is_selected", true)
        .order("entry_index", { ascending: true });

      if (entriesError || !entriesData) {
        Alert.alert("에러", "메모리 항목을 불러오지 못했습니다.");
        return;
      }

      // signed URL 발급
      const mapped = await Promise.all(
        (entriesData ?? []).map(async (entry) => {
          let thumbUrl: string | null = null;
          let fullUrl: string | null = null;

          if (entry.image_thumb_path) {
            const { data } = await supabase.storage
              .from("pictures")
              .createSignedUrl(entry.image_thumb_path, 300);
            thumbUrl = data?.signedUrl ?? null;
          }
          if (entry.image_path) {
            const { data } = await supabase.storage
              .from("pictures")
              .createSignedUrl(entry.image_path, 300);
            fullUrl = data?.signedUrl ?? null;
          }

          return {
            ...entry,
            locationInput: entry.location ?? "",
            contentInput: entry.content ?? "",
            thumbUrl,
            fullUrl,
          };
        })
      );
      setEntries(mapped);

      // 썸네일 초기화 (기능 유지)
      let serverThumbId = memoryData.thumbnail_entry_id ?? null;
      const thumbExistsInEntries = mapped.some(
        (e) => e.memory_entry_id === serverThumbId
      );
      if (serverThumbId != null && thumbExistsInEntries) {
        setThumbnailId(serverThumbId);
      } else {
        const firstWithImage = mapped.find((e) => !!e.image_url);
        setThumbnailId(firstWithImage ? firstWithImage.memory_entry_id : null);
      }

      setLoading(false);
    };

    fetchData();
  }, [profileId, memory_id]);

  const handleUpdate = async () => {
    if (!memory_id) return;

    if (!thumbnailId) {
      Alert.alert("대표 사진 선택", "대표 사진을 하나 선택해주세요.");
      return;
    }

    try {
      setLoading(true);

      // memory_entries 업데이트 (기능 그대로)
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

      // memory is_completed 처리 (기능 그대로)
      await supabase
        .from("memories")
        .update({
          is_completed: true,
          thumbnail_entry_id: thumbnailId,
        })
        .eq("memory_id", Number(memory_id));

      // Alert.alert("완료", "기록이 저장되었어요.");
      router.push("/");
    } catch (err) {
      Alert.alert("에러", "저장 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!profileId || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5B8DEF" />
      </View>
    );
  }

  return (
    // ✅ 상단 공백 방지: top 제외
    <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* 상단 텍스트 */}
      <View style={styles.header}>
        <Text style={styles.title}>사진별로 기록해주세요</Text>
        <Text style={styles.subtitle}>빈칸으로 두셔도 좋아요</Text>
      </View>

      {/* 중간: 가로 캐러셀 + 입력 — 단일 ScrollView로 구성 */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT + 16 }}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
      >
        {/* 가로 캐러셀 */}
        <FlatList
          data={entries}
          horizontal
          pagingEnabled
          snapToInterval={ITEM_WIDTH + ITEM_MARGIN}
          decelerationRate="fast"
          contentContainerStyle={styles.flatListContent}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.memory_entry_id)}
          renderItem={({ item }) => {
            const isThumbnail = item.memory_entry_id === thumbnailId;
            return (
              <View style={styles.itemContainer}>
                <Pressable
                  onPress={() => {
                    setViewerUri(item.fullUrl); // 모달은 원본 URL
                    setViewerVisible(true);
                  }}
                >
                  <Image source={{ uri: item.thumbUrl ?? item.fullUrl }} style={styles.image} />
                </Pressable>

                {isThumbnail && <View pointerEvents="none" style={styles.selectedOverlay} />}

                <TouchableOpacity
                  style={[styles.pinButton, isThumbnail && styles.pinButtonSelected]}
                  onPress={() => setThumbnailId(item.memory_entry_id)}
                  hitSlop={8}
                >
                  <Feather name="image" size={32} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          }}
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.round(e.nativeEvent.contentOffset.x / (ITEM_WIDTH + ITEM_MARGIN));
            if (newIndex !== currentIndex) setCurrentIndex(newIndex);
          }}
        />

        {/* 입력 영역 */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>장소</Text>
          <TextInput
            style={styles.input}
            placeholder="장소를 입력해주세요"
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
            placeholder="내용을 입력해주세요"
            multiline
            value={entries[currentIndex]?.contentInput}
            onChangeText={(text) => {
              const updated = [...entries];
              updated[currentIndex].contentInput = text;
              setEntries(updated);
            }}
          />
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.footerWrapper}>
        <TouchableOpacity onPress={handleUpdate} style={styles.footerButton}>
          <Text style={styles.footerText}>기록 완료</Text>
        </TouchableOpacity>
      </View>

      {/* 사진 확대 모달 */}
      <Modal visible={viewerVisible} transparent statusBarTranslucent onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewerBackdrop}>
          <View style={styles.viewerPanel}>
            <View style={styles.viewerImageWrap}>
              {viewerUri && (
                <Image
                  source={{ uri: viewerUri }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
              )}
            </View>
            <TouchableOpacity style={styles.viewerCloseBelow} onPress={() => setViewerVisible(false)}>
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ⬇ 기존 스타일 그대로 유지
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 16, backgroundColor: "#fff" },
  title: { 
    fontFamily: "Pretendard-Bold",
    fontSize: 20, 
    lineHeight: 28, 
    //fontWeight: "700", 
    color: "#0F172A" 
  },
  subtitle: { 
    fontFamily: "Pretendard-Regular",
    marginTop: 6, 
    fontSize: 13, 
    color: "#929292" 
  },
  flatListContent: { paddingHorizontal: ITEM_MARGIN, paddingTop: 16 },
  image: { width: ITEM_WIDTH, height: ITEM_WIDTH, borderRadius: 12, backgroundColor: "#eee", marginRight: ITEM_MARGIN },
  itemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    marginRight: ITEM_MARGIN,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#eee",
    position: "relative",
  },
  selectedOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 3, borderColor: "#5B8DEF", borderRadius: 12 },
  pinButton: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "rgba(242, 242, 242, 0.4)",
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    padding: 6,
  },
  pinButtonSelected: { backgroundColor: "#5B8DEF" },
  inputSection: { paddingHorizontal: 20, paddingBottom: 0 }, // ScrollView가 하단 패딩을 대신 가짐
  label: { 
    fontFamily: "Pretendard-SemiBold",
    //fontWeight: "bold", 
    marginTop: 16, 
    marginBottom: 6 
  },
  input: { 
    fontFamily: "Pretendard-Regular",
    borderWidth: 1, 
    borderColor: "#ccc", 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 14, 
    backgroundColor: "#fff" 
  },
  multiline: { height: 100, textAlignVertical: "top", marginBottom: 20 },
  footerWrapper: { padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#ddd" },
  footerButton: { backgroundColor: "#5B8DEF", borderRadius: 8, paddingVertical: 14, alignItems: "center" },
  footerText: { 
    fontFamily: "Pretendard-Bold",
    fontSize: 16,
    color: "#fff", 
    //fontWeight: "bold" 
  },
  viewerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  viewerPanel: { width: Math.min(width * 0.9, 420), height: Math.min(height * 0.85, 720), padding: 16, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.6)" },
  viewerImageWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  viewerImage: { width: "100%", height: "100%" },
  viewerCloseBelow: {
    alignSelf: "center",
    marginTop: 12,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
});
