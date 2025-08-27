// import { useAuthStore } from "@/utils/authStore";
// import { getLocalDateString } from "@/utils/date";
// import { supabase } from "@/utils/supabase";
// import { Feather } from "@expo/vector-icons";
// import { router, useLocalSearchParams, useNavigation } from "expo-router";
// import { useEffect, useMemo, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   Dimensions,
//   Image,
//   Pressable,
//   SafeAreaView,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";

// // 화면 너비 계산
// const { width } = Dimensions.get('window');
// const PADDING = 16;
// const GAP = 5;
// const IMAGE_SIZE = (width - PADDING * 2 - GAP * 2) / 3;

// export default function TodayScreen() {
//   const navigation = useNavigation();

//   const { profileId } = useAuthStore();
//   const { memory_id } = useLocalSearchParams<{ memory_id: string }>();

//   const [entries, setEntries] = useState<any[]>([]);
//   const [selectedIds, setSelectedIds] = useState<string[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [memoryDate, setMemoryDate] = useState<string | null>(null);

//     const formattedDate = useMemo(() => {
//     if (!memoryDate) return "";
//     const [_, month, day] = memoryDate.split('-').map(Number);
//     return `${month}월 ${day}일`;
//   }, [memoryDate]);

//   useEffect(() => {
//     navigation.setOptions({
//        headerLeft: () => (
//         <Pressable
//           style={{ flexDirection: "row", alignItems: "center" }}
//           onPress={() => router.back()}
//         >
//           <Feather name="chevron-left" size={24} color="black" />
//         </Pressable>
//       ),
//       headerTitle: "",
//       headerShadowVisible: false
//     });
//   }, [navigation]);

//   useEffect(() => {
//     if (!profileId || !memory_id) return;

//     // -1이면 오늘 메모리 찾아서 교체
//     if (memory_id === "-1") {
//       (async () => {
//         const today = getLocalDateString();
//         setMemoryDate(today);
//         const { data } = await supabase
//           .from("memories")
//           .select("memory_id")
//           .eq("profile_id", profileId)
//           .eq("date", today)
//           .maybeSingle();

//         if (data?.memory_id) {
//           router.replace(`/today/${data.memory_id}`);
//         } else {
//           // 오늘 메모리 없음 → 빈 상태
//           setEntries([]); 
//           setSelectedIds([]); 
//           setLoading(false);
//         }
//       })();
//       return; // 아래 fetch 막기
//     }

//     // 정상 id일 때 로드
//     (async () => {
//       setLoading(true);

//       const { data: mem } = await supabase
//         .from("memories")
//         .select("memory_id, date")
//         .eq("profile_id", profileId)
//         .eq("memory_id", memory_id)
//         .maybeSingle();

//       if (mem?.date) {
//         setMemoryDate(mem.date);
//       }

//       if (!mem) { 
//         setEntries([]); 
//         setSelectedIds([]); 
//         setLoading(false); 
//         return; 
//       }
//       setMemoryDate(mem.date);

//       const { data: rows, error: e2 } = await supabase
//         .from("memory_entries")
//         .select("memory_entry_id, image_url, image_thumb_url, is_selected, entry_index")
//         .eq("memory_id", memory_id)
//         .order("entry_index", { ascending: true });

//       if (e2 || !rows) { setEntries([]); setSelectedIds([]); setLoading(false); return; }

//       const withImages = rows.filter(r => !!r.image_url);
//       setEntries(withImages);
//       setSelectedIds(withImages.filter(r => r.is_selected).map(r => String(r.memory_entry_id)));
//       setLoading(false);
//     })();
//   }, [profileId, memory_id]);

//   const toggleSelect = (id: string) => {
//     setSelectedIds((prev) =>
//       prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
//     );
//   };

//   const handleNext = async () => {
//     try {
//       // 선택된 항목 true
//       const { error: selectError } = await supabase
//         .from("memory_entries")
//         .update({ is_selected: true })
//         .in("memory_entry_id", selectedIds);
//       if (selectError) throw selectError;

//       // 나머지는 false
//       const unselectedIds = entries
//         .map((e) => String(e.memory_entry_id))
//         .filter((id) => !selectedIds.includes(id));

//       if (unselectedIds.length) {
//         const { error: unselectError } = await supabase
//           .from("memory_entries")
//           .update({ is_selected: false })
//           .in("memory_entry_id", unselectedIds);
//         if (unselectError) throw unselectError;
//       }

//       router.push(`/compose/${memory_id}`);
//     } catch (err) {
//       console.error("❌ handleNext 실행 오류:", err);
//       Alert.alert("저장 중 오류가 발생했어요.");
//     }
//   };

//   if (!profileId || loading) {
//     return (
//       <SafeAreaView style={styles.centered}>
//         <ActivityIndicator size="large" color="#5B8DEF" />
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
//        {/* 상단 안내 */}
//       <View style={styles.header}>
//         <Text style={styles.title}>{formattedDate}에 찍은 사진들이에요</Text>
//         <Text style={styles.subtitle}>N장을 골라서 기록해주세요</Text>
//       </View>

//       <ScrollView contentContainerStyle={styles.gridContainer}>
//         {entries.length === 0 ? (
//           <View style={styles.centered}>
//             <Text style={{ fontFamily: "Pretendard-Regular", color: "#888" }}>오늘 등록된 사진이 없어요.</Text>
//           </View>
//         ) : (
//           <View style={styles.grid}>
//             {entries.map((entry) => {
//               const id = String(entry.memory_entry_id);
//               const isSelected = selectedIds.includes(id);
//               return (
//                 <TouchableOpacity
//                   key={id}
//                   onPress={() => toggleSelect(id)}
//                   style={[styles.imageWrapper, isSelected && styles.imageWrapperSelected]}
//                 >
//                   <Image source={{ uri: entry.image_thumb_url || entry.image_url }} style={styles.image} />
//                   {isSelected && (
//                     <>
//                       <View style={styles.selectedOverlay} />
//                       <View style={styles.checkIconContainer}>
//                         <Image
//                           source={require('@/assets/images/checkbox.png')}
//                           style={styles.checkIcon}
//                         />
//                       </View>
//                     </>
//                   )}
//                 </TouchableOpacity>
//               );
//             })}
//           </View>
//         )}
//       </ScrollView>

//       {/* 하단 고정 */}
//       <View style={styles.footerWrapper}>
//         <TouchableOpacity
//           onPress={handleNext}
//           style={[styles.footerButton, selectedIds.length === 0 && { opacity: 0.6 }]}
//           disabled={selectedIds.length === 0}
//         >
//           <Text style={styles.footerText}>선택 완료</Text>
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   centered: { flex: 1, justifyContent: "center", alignItems: "center" },
//   header: {
//     padding: 16,
//     backgroundColor: "#fff",
//   },
//   title: {
//     fontFamily: "Pretendard-SemiBold",
//     fontSize: 20,
//     lineHeight: 28,
//     color: "#0F172A",
//   },
//   subtitle: {
//     fontFamily: "Pretendard-Regular",
//     marginTop: 4,
//     fontSize: 13,
//     color: "#929292",
//   },
//   gridContainer: {
//     paddingHorizontal: PADDING,
//     paddingBottom: 100,
//   },
//   grid: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: GAP, // 아이템 간 간격
//   },
//   imageWrapper: {
//     width: IMAGE_SIZE, // 계산된 너비 적용
//     height: IMAGE_SIZE, // 정사각형
//     borderRadius: 10,
//     overflow: "hidden",
//     backgroundColor: "#eee",
//     position: "relative",
//     borderWidth: 2,
//     borderColor: "transparent",
//   },
//   imageWrapperSelected: {
//     borderColor: "#5B8DEF",
//   },
//   image: {
//     width: "100%",
//     height: "100%",
//     borderRadius: 10,
//   },
//   checkOverlay: {
//     position: "absolute",
//     top: 6,
//     right: 6,
//     width: 24,
//     height: 24,
//     // borderRadius: 5,
//     // backgroundColor: "#5B8DEF",
//     // justifyContent: "center",
//     // alignItems: "center",
//   },
//   checkMark: {
//     color: "#fff",
//     fontSize: 17,
//     fontWeight: "bold",
//   },
//   footerWrapper: {
//     padding: 16,
//     backgroundColor: "#fff",
//     // borderTopWidth: 1,
//     // borderTopColor: "#ddd",
//   },
//   footerButton: {
//     backgroundColor: "#5B8DEF",
//     borderRadius: 12,
//     // paddingVertical: 14,
//     height: 52,
//     alignItems: "center",
//     justifyContent: 'center'
//   },
//   footerText: {
//     fontFamily: "Pretendard-Bold",
//     fontSize: 16,
//     color: "#fff",
//   },
//   checkIcon: {
//     width: "100%",
//     height: "100%",
//   },
//   selectedOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(0, 0, 0, 0.4)',
//     borderRadius: 10,
//   },
//   checkIconContainer: {
//     position: "absolute",
//     top: 8,
//     right: 8,
//     width: 24,
//     height: 24,
//   },
// });

// app/today/[memory_id].tsx
import { useAuthStore } from "@/utils/authStore";
import { getLocalDateString } from "@/utils/date";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// 화면 너비 계산
const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 5;
const IMAGE_SIZE = (width - PADDING * 2 - GAP * 2) / 3;

export default function TodayScreen() {
  const navigation = useNavigation();

  const { profileId } = useAuthStore();
  const { memory_id } = useLocalSearchParams<{ memory_id: string }>();

  const [entries, setEntries] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [memoryDate, setMemoryDate] = useState<string | null>(null);

    const formattedDate = useMemo(() => {
    if (!memoryDate) return "";
    const [_, month, day] = memoryDate.split('-').map(Number);
    return `${month}월 ${day}일`;
  }, [memoryDate]);

  useEffect(() => {
    navigation.setOptions({
      headerShadowVisible: false,
      headerStyle: {
        borderBottomWidth: 1,
        borderBottomColor: '#f2f2f2',
      },
       headerLeft: () => (
        <Pressable
          style={{ flexDirection: "row", alignItems: "center" }}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={24} color="black" />
        </Pressable>
      ),
      headerTitle: "",
      headerShadowVisible: false,
    });
  }, [navigation]);

  useEffect(() => {
    if (!profileId || !memory_id) return;

    if (memory_id === "-1") {
      (async () => {
        const today = getLocalDateString();
        setMemoryDate(today);
        const { data } = await supabase
          .from("memories")
          .select("memory_id")
          .eq("profile_id", profileId)
          .eq("date", today)
          .maybeSingle();

        if (data?.memory_id) {
          router.replace(`/today/${data.memory_id}`);
        } else {
          setEntries([]);
          setSelectedIds([]);
          setLoading(false);
        }
      })();
      return;
    }

    (async () => {
      setLoading(true);

      const { data: mem } = await supabase
        .from("memories")
        .select("memory_id, date")
        .eq("profile_id", profileId)
        .eq("memory_id", memory_id)
        .maybeSingle();

      if (mem?.date) {
        setMemoryDate(mem.date);
      }

      if (!mem) {
        setEntries([]);
        setSelectedIds([]);
        setLoading(false);
        return;
      }

      const { data: rows, error: e2 } = await supabase
        .from("memory_entries")
        .select("memory_entry_id, image_url, image_thumb_url, is_selected, entry_index")
        .eq("memory_id", memory_id)
        .order("entry_index", { ascending: true });

      if (e2 || !rows) { setEntries([]); setSelectedIds([]); setLoading(false); return; }

      const withImages = rows.filter(r => !!r.image_url);
      setEntries(withImages);
      setSelectedIds(withImages.filter(r => r.is_selected).map(r => String(r.memory_entry_id)));
      setLoading(false);
    })();
  }, [profileId, memory_id]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleNext = async () => {
    try {
      const { error: selectError } = await supabase
        .from("memory_entries")
        .update({ is_selected: true })
        .in("memory_entry_id", selectedIds);
      if (selectError) throw selectError;

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

      router.push(`/compose/${memory_id}`);
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
      <View style={styles.header}>
        <Text style={styles.title}>{formattedDate}에 찍은 사진들이에요</Text>
        <Text style={styles.subtitle}>N장을 골라서 기록해주세요</Text>
      </View>

      <ScrollView contentContainerStyle={styles.gridContainer}>
        {entries.length === 0 ? (
          <View style={styles.centered}>
            <Text style={{ fontFamily: "Pretendard-Regular", color: "#888" }}>오늘 등록된 사진이 없어요.</Text>
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
                  style={styles.imageWrapper}
                >
                  <Image source={{ uri: entry.image_thumb_url || entry.image_url }} style={styles.image} />

                  {isSelected && (
                    <>
                      {/* ✅ 테두리, 오버레이, 아이콘을 모두 분리 */}
                      <View style={styles.borderOverlay} />
                      <View style={styles.selectionOverlay} />
                      <View style={styles.checkIconContainer}>
                        <Image
                          source={require('@/assets/images/checkbox.png')}
                          style={styles.checkIcon}
                        />
                      </View>
                    </>
                  )}

                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.footerWrapper}>
        <TouchableOpacity
          onPress={handleNext}
          style={[styles.footerButton, selectedIds.length === 0 && { opacity: 0.6 }]}
          disabled={selectedIds.length === 0}
        >
          <Text style={styles.footerText}>선택 완료</Text>
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
  title: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 20,
    lineHeight: 28,
    color: "#0F172A",
  },
  subtitle: {
    fontFamily: "Pretendard-Regular",
    marginTop: 4,
    fontSize: 13,
    color: "#929292",
  },
  gridContainer: {
    paddingHorizontal: PADDING,
    paddingBottom: 100,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  imageWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 10,
    overflow: "hidden", // ✅ 자식 요소가 부모 밖으로 나가지 않도록 hidden 처리
    backgroundColor: "#eee",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#5B8DEF",
  },
  checkIconContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
  },
  checkIcon: {
    width: "100%",
    height: "100%",
  },
  footerWrapper: {
    padding: 16,
    backgroundColor: "#fff",
  },
  footerButton: {
    backgroundColor: "#5B8DEF",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: 'center',
  },
  footerText: {
    fontFamily: "Pretendard-Bold",
    fontSize: 16,
    color: "#fff",
  },
});