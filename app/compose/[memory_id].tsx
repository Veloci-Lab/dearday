// import { useAuthStore } from "@/utils/authStore";
// import { supabase } from "@/utils/supabase";
// import { Feather } from "@expo/vector-icons";
// import { router, useLocalSearchParams, useNavigation } from "expo-router";
// import { useEffect, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   Dimensions,
//   FlatList,
//   Image,
//   Modal,
//   Pressable,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";

// const { width, height } = Dimensions.get("window");
// const ITEM_WIDTH = width * 0.7;
// const ITEM_MARGIN = width * 0.05;
// const FOOTER_HEIGHT = 72; // ✅ 하단 버튼 영역 높이만큼 여유

// export default function ComposeScreen() {
//   const navigation = useNavigation();

//   const { profileId } = useAuthStore();
//   const { memory_id } = useLocalSearchParams();

//   const [entries, setEntries] = useState<any[]>([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [thumbnailId, setThumbnailId] = useState<number | null>(null);
//   const [viewerVisible, setViewerVisible] = useState(false);
//   const [viewerUri, setViewerUri] = useState<string | null>(null);

//   useEffect(() => {
//     navigation.setOptions({
//       headerLeft: () => (
//         <Pressable
//           style={{ flexDirection: "row", alignItems: "center" }}
//           onPress={() => router.back()}
//         >
//           <Feather name="chevron-left" size={24} color="black" />
//         </Pressable>
//       ),
//       headerTitle: "",
//     });
//   }, [navigation]);

//   useEffect(() => {
//     if (!profileId || !memory_id) return;

//     const fetchData = async () => {
//       setLoading(true);

//       const { data: memoryData, error: memoryError } = await supabase
//         .from("memories")
//         .select("memory_id, is_completed, thumbnail_entry_id")
//         .eq("profile_id", profileId)
//         .eq("memory_id", memory_id)
//         .maybeSingle();

//       if (memoryError || !memoryData) {
//         Alert.alert("에러", "메모리 정보를 불러오지 못했습니다.");
//         return;
//       }

//       const { data: entriesData, error: entriesError } = await supabase
//         .from("memory_entries")
//         .select("memory_entry_id, image_url, image_thumb_url, content, location")
//         .eq("memory_id", memory_id)
//         .eq("is_selected", true)
//         .order("entry_index", { ascending: true });

//       if (entriesError || !entriesData) {
//         Alert.alert("에러", "메모리 항목을 불러오지 못했습니다.");
//         return;
//       }

//       const mapped = entriesData.map((entry) => ({
//         ...entry,
//         locationInput: entry.location ?? "",
//         contentInput: entry.content ?? "",
//       }));
//       setEntries(mapped);

//       // 썸네일 초기화 (기능 유지)
//       let serverThumbId = memoryData.thumbnail_entry_id ?? null;
//       const thumbExistsInEntries = mapped.some(
//         (e) => e.memory_entry_id === serverThumbId
//       );
//       if (serverThumbId != null && thumbExistsInEntries) {
//         setThumbnailId(serverThumbId);
//       } else {
//         const firstWithImage = mapped.find((e) => !!e.image_url);
//         setThumbnailId(firstWithImage ? firstWithImage.memory_entry_id : null);
//       }

//       setLoading(false);
//     };

//     fetchData();
//   }, [profileId, memory_id]);

//   const handleUpdate = async () => {
//     if (!memory_id) return;

//     if (!thumbnailId) {
//       Alert.alert("대표 사진 선택", "대표 사진을 하나 선택해주세요.");
//       return;
//     }

//     try {
//       setLoading(true);

//       // memory_entries 업데이트 (기능 그대로)
//       const updates = entries.map((entry) =>
//         supabase
//           .from("memory_entries")
//           .update({
//             location: entry.locationInput.trim() || null,
//             content: entry.contentInput.trim() || null,
//           })
//           .eq("memory_entry_id", entry.memory_entry_id)
//       );
//       await Promise.all(updates);

//       // memory is_completed 처리 (기능 그대로)
//       await supabase
//         .from("memories")
//         .update({
//           is_completed: true,
//           thumbnail_entry_id: thumbnailId,
//         })
//         .eq("memory_id", memory_id);

//       // Alert.alert("완료", "기록이 저장되었어요.");
//       router.push("/");
//     } catch (err) {
//       Alert.alert("에러", "저장 중 문제가 발생했습니다.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (!profileId || loading) {
//     return (
//       <View style={styles.centered}>
//         <ActivityIndicator size="large" color="#5B8DEF" />
//       </View>
//     );
//   }

//   return (
//     // ✅ 상단 공백 방지: top 제외
//     <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: "#fff" }}>
//       {/* 상단 텍스트 */}
//       <View style={styles.header}>
//         <Text style={styles.title}>사진별로 기록해주세요</Text>
//         <Text style={styles.subtitle}>빈칸으로 두셔도 좋아요</Text>
//       </View>

//       {/* 중간: 가로 캐러셀 + 입력 — 단일 ScrollView로 구성 */}
//       <ScrollView
//         contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT + 16 }}
//         automaticallyAdjustContentInsets={false}
//         contentInsetAdjustmentBehavior="never"
//       >
//         {/* 가로 캐러셀 */}
//         <FlatList
//           data={entries}
//           horizontal
//           pagingEnabled
//           snapToInterval={ITEM_WIDTH + ITEM_MARGIN}
//           decelerationRate="fast"
//           contentContainerStyle={styles.flatListContent}
//           showsHorizontalScrollIndicator={false}
//           keyExtractor={(item) => String(item.memory_entry_id)}
//           renderItem={({ item }) => {
//             const isThumbnail = item.memory_entry_id === thumbnailId;
//             return (
//               <View style={styles.itemContainer}>
//                 <Pressable
//                   onPress={() => {
//                     setViewerUri(item.image_url);
//                     setViewerVisible(true);
//                   }}
//                 >
//                   <Image source={{ uri: item.image_thumb_url || item.image_url }} style={styles.image} />
//                 </Pressable>

//                 {isThumbnail && <View pointerEvents="none" style={styles.selectedOverlay} />}

//                 <TouchableOpacity
//                   style={[styles.pinButton, isThumbnail && styles.pinButtonSelected]}
//                   onPress={() => setThumbnailId(item.memory_entry_id)}
//                   hitSlop={8}
//                 >
//                   <Feather name="image" size={32} color="#fff" />
//                 </TouchableOpacity>
//               </View>
//             );
//           }}
//           onMomentumScrollEnd={(e) => {
//             const newIndex = Math.round(e.nativeEvent.contentOffset.x / (ITEM_WIDTH + ITEM_MARGIN));
//             if (newIndex !== currentIndex) setCurrentIndex(newIndex);
//           }}
//         />

//         <View style={styles.pagination}>
//           {entries.map((_, index) => (
//             <View
//               key={index}
//               style={[
//                 styles.dot,
//                 index === currentIndex ? styles.dotActive : styles.dotInactive,
//               ]}
//             />
//           ))}
//         </View>

//         {/* 입력 영역 */}
//         <View style={styles.inputSection}>
//           <Text style={styles.label}>내가 있는 곳</Text>
//           <TextInput
//             style={styles.input}
//             placeholder="장소를 입력해주세요"
//             value={entries[currentIndex]?.locationInput}
//             onChangeText={(text) => {
//               const updated = [...entries];
//               updated[currentIndex].locationInput = text;
//               setEntries(updated);
//             }}
//           />

//           <Text style={styles.label}>내용</Text>
//           <TextInput
//             style={[styles.input, styles.multiline]}
//             placeholder="내용을 입력해주세요"
//             multiline
//             value={entries[currentIndex]?.contentInput}
//             onChangeText={(text) => {
//               const updated = [...entries];
//               updated[currentIndex].contentInput = text;
//               setEntries(updated);
//             }}
//           />
//         </View>
//       </ScrollView>

//       {/* 하단 버튼 */}
//       <View style={styles.footerWrapper}>
//         <TouchableOpacity onPress={handleUpdate} style={styles.footerButton}>
//           <Text style={styles.footerText}>기록 완료</Text>
//         </TouchableOpacity>
//       </View>

//       {/* 사진 확대 모달 */}
//       <Modal visible={viewerVisible} transparent statusBarTranslucent onRequestClose={() => setViewerVisible(false)}>
//         <View style={styles.viewerBackdrop}>
//           <View style={styles.viewerPanel}>
//             <View style={styles.viewerImageWrap}>
//               {viewerUri && <Image source={{ uri: viewerUri }} style={styles.viewerImage} resizeMode="contain" />}
//             </View>
//             <TouchableOpacity style={styles.viewerCloseBelow} onPress={() => setViewerVisible(false)}>
//               <Feather name="x" size={22} color="#fff" />
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   // ⬇ 기존 스타일 그대로 유지
//   centered: { flex: 1, justifyContent: "center", alignItems: "center" },
//   header: { padding: 16, backgroundColor: "#fff" },
//   title: { 
//     fontFamily: "Pretendard-Bold",
//     fontSize: 20, 
//     lineHeight: 28, 
//     //fontWeight: "700", 
//     color: "#0F172A" 
//   },
//   subtitle: { 
//     fontFamily: "Pretendard-Regular",
//     marginTop: 6, 
//     fontSize: 13, 
//     color: "#929292" 
//   },
//   flatListContent: { paddingHorizontal: ITEM_MARGIN, paddingTop: 16 },
//   image: { width: ITEM_WIDTH, height: ITEM_WIDTH, borderRadius: 12, backgroundColor: "#eee", marginRight: ITEM_MARGIN },
//   itemContainer: {
//     width: ITEM_WIDTH,
//     height: ITEM_WIDTH,
//     marginRight: ITEM_MARGIN,
//     borderRadius: 12,
//     overflow: "hidden",
//     backgroundColor: "#eee",
//     position: "relative",
//   },
//   selectedOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 3, borderColor: "#5B8DEF", borderRadius: 12 },
//   pinButton: {
//     position: "absolute",
//     top: 0,
//     right: 0,
//     backgroundColor: "rgba(242, 242, 242, 0.4)",
//     borderTopRightRadius: 8,
//     borderBottomLeftRadius: 8,
//     padding: 6,
//   },
//   pinButtonSelected: { backgroundColor: "#5B8DEF" },
//   inputSection: { paddingHorizontal: 20, paddingBottom: 0 }, // ScrollView가 하단 패딩을 대신 가짐
//   label: { 
//     fontFamily: "Pretendard-SemiBold",
//     //fontWeight: "bold", 
//     marginTop: 16, 
//     marginBottom: 6 
//   },
//   input: { 
//     fontFamily: "Pretendard-Regular",
//     borderWidth: 1, 
//     borderColor: "#ccc", 
//     borderRadius: 8, 
//     padding: 12, 
//     fontSize: 14, 
//     backgroundColor: "#fff" 
//   },
//   multiline: { height: 100, textAlignVertical: "top", marginBottom: 20 },
//   footerWrapper: { padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#ddd" },
//   footerButton: { backgroundColor: "#5B8DEF", borderRadius: 8, paddingVertical: 14, alignItems: "center" },
//   footerText: { 
//     fontFamily: "Pretendard-Bold",
//     fontSize: 16,
//     color: "#fff", 
//     //fontWeight: "bold" 
//   },
//   viewerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
//   viewerPanel: { width: Math.min(width * 0.9, 420), height: Math.min(height * 0.85, 720), padding: 16, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.6)" },
//   viewerImageWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
//   viewerImage: { width: "100%", height: "100%" },
//   viewerCloseBelow: {
//     alignSelf: "center",
//     marginTop: 12,
//     borderRadius: 22,
//     alignItems: "center",
//     justifyContent: "center",
//     width: 36,
//     height: 36,
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.7)",
//     backgroundColor: "rgba(0,0,0,0.35)",
//   },
//   pagination: { // ✅ 페이지네이션 스타일
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 16,
//   },
// });

//////////////////////////////////////////////////////////////////////////////////////

// // app/compose/[memory_id].tsx
// import { useAuthStore } from "@/utils/authStore";
// import { supabase } from "@/utils/supabase";
// import { Feather } from "@expo/vector-icons";
// import { router, useLocalSearchParams, useNavigation } from "expo-router";
// import { useEffect, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   Dimensions,
//   FlatList,
//   Image,
//   Modal,
//   Pressable,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";

// const { width, height } = Dimensions.get("window");
// const ITEM_WIDTH = width * 0.7;
// const ITEM_MARGIN = width * 0.05;
// const FOOTER_HEIGHT = 72; 

// export default function ComposeScreen() {
//   const navigation = useNavigation();

//   const { profileId } = useAuthStore();
//   const { memory_id } = useLocalSearchParams();

//   const [entries, setEntries] = useState<any[]>([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [thumbnailId, setThumbnailId] = useState<number | null>(null);
//   const [viewerVisible, setViewerVisible] = useState(false);
//   const [viewerUri, setViewerUri] = useState<string | null>(null);

//   useEffect(() => {
//     navigation.setOptions({
//       headerLeft: () => (
//         <Pressable
//           style={{ flexDirection: "row", alignItems: "center" }}
//           onPress={() => router.back()}
//         >
//           <Feather name="chevron-left" size={24} color="black" />
//         </Pressable>
//       ),
//       headerTitle: "",
//       headerShadowVisible: false,
//     });
//   }, [navigation]);

//   useEffect(() => {
//     if (!profileId || !memory_id) return;

//     const fetchData = async () => {
//       setLoading(true);

//       const { data: memoryData, error: memoryError } = await supabase
//         .from("memories")
//         .select("memory_id, is_completed, thumbnail_entry_id")
//         .eq("profile_id", profileId)
//         .eq("memory_id", memory_id)
//         .maybeSingle();

//       if (memoryError || !memoryData) {
//         Alert.alert("에러", "메모리 정보를 불러오지 못했습니다.");
//         return;
//       }

//       const { data: entriesData, error: entriesError } = await supabase
//         .from("memory_entries")
//         .select("memory_entry_id, image_url, image_thumb_url, content, location")
//         .eq("memory_id", memory_id)
//         .eq("is_selected", true)
//         .order("entry_index", { ascending: true });

//       if (entriesError || !entriesData) {
//         Alert.alert("에러", "메모리 항목을 불러오지 못했습니다.");
//         return;
//       }

//       const mapped = entriesData.map((entry) => ({
//         ...entry,
//         locationInput: entry.location ?? "",
//         contentInput: entry.content ?? "",
//       }));
//       setEntries(mapped);
      
//       let serverThumbId = memoryData.thumbnail_entry_id ?? null;
//       const thumbExistsInEntries = mapped.some(
//         (e) => e.memory_entry_id === serverThumbId
//       );
//       if (serverThumbId != null && thumbExistsInEntries) {
//         setThumbnailId(serverThumbId);
//       } else {
//         const firstWithImage = mapped.find((e) => !!e.image_url);
//         setThumbnailId(firstWithImage ? firstWithImage.memory_entry_id : null);
//       }

//       setLoading(false);
//     };

//     fetchData();
//   }, [profileId, memory_id]);

//   const handleUpdate = async () => {
//     if (!memory_id) return;

//     if (!thumbnailId) {
//       Alert.alert("대표 사진 선택", "대표 사진을 하나 선택해주세요.");
//       return;
//     }

//     try {
//       setLoading(true);
      
//       const updates = entries.map((entry) =>
//         supabase
//           .from("memory_entries")
//           .update({
//             location: entry.locationInput.trim() || null,
//             content: entry.contentInput.trim() || null,
//           })
//           .eq("memory_entry_id", entry.memory_entry_id)
//       );
//       await Promise.all(updates);
      
//       await supabase
//         .from("memories")
//         .update({
//           is_completed: true,
//           thumbnail_entry_id: thumbnailId,
//         })
//         .eq("memory_id", memory_id);
        
//       router.push("/");
//     } catch (err) {
//       Alert.alert("에러", "저장 중 문제가 발생했습니다.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (!profileId || loading) {
//     return (
//       <View style={styles.centered}>
//         <ActivityIndicator size="large" color="#5B8DEF" />
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: "#fff" }}>
//       <View style={styles.header}>
//         <Text style={styles.title}>사진별로 기록해주세요</Text>
//         <Text style={styles.subtitle}>빈칸으로 두셔도 좋아요</Text>
//       </View>
      
//       <ScrollView
//         contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT + 16 }}
//         automaticallyAdjustContentInsets={false}
//         contentInsetAdjustmentBehavior="never"
//       >
//         <FlatList
//           data={entries}
//           horizontal
//           pagingEnabled
//           snapToInterval={ITEM_WIDTH + ITEM_MARGIN}
//           decelerationRate="fast"
//           contentContainerStyle={styles.flatListContent}
//           showsHorizontalScrollIndicator={false}
//           keyExtractor={(item) => String(item.memory_entry_id)}
//           renderItem={({ item, index }) => {
//             const isThumbnail = item.memory_entry_id === thumbnailId;
//             const isCurrent = index === currentIndex;
//             return (
//               <View style={[styles.itemContainer, isCurrent && styles.activeItem]}>
//                 <Pressable
//                   onPress={() => {
//                     setViewerUri(item.image_url);
//                     setViewerVisible(true);
//                   }}
//                 >
//                   <Image source={{ uri: item.image_thumb_url || item.image_url }} style={styles.image} />
//                 </Pressable>
                
//                 {/* ✅ 썸네일 선택 아이콘 로직 수정 */}
//                 <TouchableOpacity
//                   style={styles.pinButton}
//                   onPress={() => setThumbnailId(item.memory_entry_id)}
//                   hitSlop={8}
//                 >
//                   <Image 
//                     source={
//                       isThumbnail 
//                         ? require('@/assets/images/select_on.png') 
//                         : require('@/assets/images/select_off.png')
//                     } 
//                     style={styles.pinIcon} 
//                   />
//                 </TouchableOpacity>
//               </View>
//             );
//           }}
//           onMomentumScrollEnd={(e) => {
//             const newIndex = Math.round(e.nativeEvent.contentOffset.x / (ITEM_WIDTH + ITEM_MARGIN));
//             if (newIndex !== currentIndex) setCurrentIndex(newIndex);
//           }}
//         />

//         <View style={styles.pagination}>
//           {entries.map((_, index) => (
//             <View
//               key={index}
//               style={[
//                 styles.dot,
//                 index === currentIndex ? styles.dotActive : styles.dotInactive,
//               ]}
//             />
//           ))}
//         </View>

//         <View style={styles.inputSection}>
//           <Text style={styles.label}>내가 있는 곳</Text>
//           <View style={styles.inputContainer}>
//             <TextInput
//               style={styles.input}
//               placeholder="장소를 입력해주세요"
//               value={entries[currentIndex]?.locationInput}
//               onChangeText={(text) => {
//                 const updated = [...entries];
//                 updated[currentIndex].locationInput = text;
//                 setEntries(updated);
//               }}
//             />
//             {!!entries[currentIndex]?.locationInput && (
//               <TouchableOpacity 
//                 style={styles.clearButton} 
//                 onPress={() => {
//                   const updated = [...entries];
//                   updated[currentIndex].locationInput = "";
//                   setEntries(updated);
//                 }}
//               >
//                 <Feather name="x-circle" size={18} color="#C2C2C2" />
//               </TouchableOpacity>
//             )}
//           </View>

//           <Text style={styles.label}>순간의 기록</Text>
//           <TextInput
//             style={[styles.input, styles.multiline]}
//             placeholder="내용을 입력해주세요"
//             multiline
//             value={entries[currentIndex]?.contentInput}
//             onChangeText={(text) => {
//               const updated = [...entries];
//               updated[currentIndex].contentInput = text;
//               setEntries(updated);
//             }}
//           />
//         </View>
//       </ScrollView>
      
//       <View style={styles.footerWrapper}>
//         <TouchableOpacity onPress={handleUpdate} style={styles.footerButton}>
//           <Text style={styles.footerText}>완료</Text>
//         </TouchableOpacity>
//       </View>
      
//       <Modal visible={viewerVisible} transparent statusBarTranslucent onRequestClose={() => setViewerVisible(false)}>
//         <View style={styles.viewerBackdrop}>
//           <View style={styles.viewerPanel}>
//             <View style={styles.viewerImageWrap}>
//               {viewerUri && <Image source={{ uri: viewerUri }} style={styles.viewerImage} resizeMode="contain" />}
//             </View>
//             <TouchableOpacity style={styles.viewerCloseBelow} onPress={() => setViewerVisible(false)}>
//               <Feather name="x" size={22} color="#fff" />
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   centered: { flex: 1, justifyContent: "center", alignItems: "center" },
//   header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: "#fff" },
//   title: { 
//     fontFamily: "Pretendard-Bold",
//     fontSize: 20, 
//     lineHeight: 28, 
//     color: "#0F172A" 
//   },
//   subtitle: { 
//     fontFamily: "Pretendard-Regular",
//     marginTop: 4, 
//     fontSize: 13, 
//     color: "#929292" 
//   },
//   flatListContent: { paddingHorizontal: ITEM_MARGIN, paddingTop: 16 },
//   itemContainer: {
//     width: ITEM_WIDTH,
//     height: ITEM_WIDTH,
//     marginRight: ITEM_MARGIN,
//     borderRadius: 12,
//     overflow: "hidden",
//     backgroundColor: "#eee",
//     position: "relative",
//   },
//   activeItem: {
//     borderWidth: 3,
//     borderColor: "#5B8DEF",
//   },
//   image: { width: ITEM_WIDTH, height: ITEM_WIDTH, borderRadius: 12, backgroundColor: "#eee" },
//   pinButton: {
//     position: "absolute",
//     top: 8,
//     right: 8,
//     width: 32,
//     height: 32,
//   },
//   pinIcon: {
//     width: "100%",
//     height: "100%",
//   },
//   pagination: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 16,
//   },
//   dot: {
//     width: 7,
//     height: 7,
//     borderRadius: 3.5,
//     marginHorizontal: 4,
//   },
//   dotActive: {
//     backgroundColor: '#5B8DEF',
//   },
//   dotInactive: {
//     backgroundColor: '#E2E8F0',
//   },
//   inputSection: { paddingHorizontal: 20, paddingTop: 12 }, 
//   label: { 
//     fontFamily: "Pretendard-SemiBold",
//     color: '#0F172A',
//     marginTop: 16, 
//     marginBottom: 8 
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#F7F7F8',
//     borderRadius: 10,
//   },
//   input: { 
//     flex: 1,
//     fontFamily: "Pretendard-Regular",
//     padding: 12, 
//     fontSize: 14, 
//     height: 48,
//   },
//   clearButton: {
//     padding: 8,
//     marginRight: 4,
//   },
//   multiline: { height: 100, textAlignVertical: "top", marginBottom: 20 },
//   footerWrapper: { padding: 16, backgroundColor: "#fff" },
//   footerButton: { 
//     backgroundColor: "#5B8DEF", 
//     borderRadius: 12,
//     height: 52,
//     alignItems: "center",
//     justifyContent: 'center',
//   },
//   footerText: { 
//     fontFamily: "Pretendard-Bold",
//     fontSize: 16,
//     color: "#fff", 
//   },
//   viewerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
//   viewerPanel: { width: Math.min(width * 0.9, 420), height: Math.min(height * 0.85, 720), padding: 16, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.6)" },
//   viewerImageWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
//   viewerImage: { width: "100%", height: "100%" },
//   viewerCloseBelow: {
//     alignSelf: "center",
//     marginTop: 12,
//     borderRadius: 22,
//     alignItems: "center",
//     justifyContent: "center",
//     width: 36,
//     height: 36,
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.7)",
//     backgroundColor: "rgba(0,0,0,0.35)",
//   },
// });

///////////////////////////////////////////////////////////////////////////////

// app/compose/[memory_id].tsx
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
const ITEM_WIDTH = 231;
const ITEM_HORIZONTAL_MARGIN = 8;
const ITEM_TOTAL_MARGIN = ITEM_HORIZONTAL_MARGIN * 2;
const ITEM_MARGIN = (width - ITEM_WIDTH) / 2;
const FLATLIST_PADDING = ITEM_MARGIN - ITEM_HORIZONTAL_MARGIN;
const FOOTER_HEIGHT = 72;

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

    const fetchData = async () => {
      setLoading(true);

      const { data: memoryData, error: memoryError } = await supabase
        .from("memories")
        .select("memory_id, is_completed, thumbnail_entry_id")
        .eq("profile_id", profileId)
        .eq("memory_id", memory_id)
        .maybeSingle();

      if (memoryError || !memoryData) {
        Alert.alert("에러", "메모리 정보를 불러오지 못했습니다.");
        return;
      }

      const { data: entriesData, error: entriesError } = await supabase
        .from("memory_entries")
        .select("memory_entry_id, image_url, image_thumb_url, content, location")
        .eq("memory_id", memory_id)
        .eq("is_selected", true)
        .order("entry_index", { ascending: true });

      if (entriesError || !entriesData) {
        Alert.alert("에러", "메모리 항목을 불러오지 못했습니다.");
        return;
      }

      const mapped = entriesData.map((entry) => ({
        ...entry,
        locationInput: entry.location ?? "",
        contentInput: entry.content ?? "",
      }));
      setEntries(mapped);

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

      await supabase
        .from("memories")
        .update({
          is_completed: true,
          thumbnail_entry_id: thumbnailId,
        })
        .eq("memory_id", memory_id);

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
    <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <Text style={styles.title}>사진별로 기록해주세요</Text>
        <Text style={styles.subtitle}>빈칸으로 두셔도 좋아요</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT + 16 }}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
      >
        <FlatList
          data={entries}
          horizontal
          pagingEnabled
          //snapToInterval={ITEM_WIDTH + (ITEM_MARGIN - (width - ITEM_WIDTH) / 2) * 2}
          snapToInterval={ ITEM_WIDTH + ITEM_TOTAL_MARGIN }
          decelerationRate="fast"
          contentContainerStyle={styles.flatListContent}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.memory_entry_id)}
          renderItem={({ item, index }) => {
            const isThumbnail = item.memory_entry_id === thumbnailId;
            const isCurrent = index === currentIndex;
            return (
              <View style={[styles.itemContainer, isCurrent && styles.activeItem]}>
                <Pressable
                  onPress={() => {
                    setViewerUri(item.image_url);
                    setViewerVisible(true);
                  }}
                >
                  <Image source={{ uri: item.image_thumb_url || item.image_url }} style={styles.image} />
                </Pressable>

                <TouchableOpacity
                  style={styles.pinButton}
                  onPress={() => setThumbnailId(item.memory_entry_id)}
                  hitSlop={8}
                >
                  <Image
                    source={
                      isThumbnail
                        ? require('@/assets/images/select_on.png')
                        : require('@/assets/images/select_off.png')
                    }
                    style={styles.pinIcon}
                  />
                </TouchableOpacity>
              </View>
            );
          }}
          onMomentumScrollEnd={(e) => {
            const contentOffset = e.nativeEvent.contentOffset.x;
            const newIndex = Math.round(contentOffset / (ITEM_WIDTH + ITEM_TOTAL_MARGIN ));
            if (newIndex !== currentIndex) setCurrentIndex(newIndex);
          }}
        />

        <View style={styles.pagination}>
          {entries.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>내가 있는 곳</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="장소를 입력해주세요"
              placeholderTextColor="#C3C3C3"
              value={entries[currentIndex]?.locationInput}
              onChangeText={(text) => {
                const updated = [...entries];
                updated[currentIndex].locationInput = text;
                setEntries(updated);
              }}
            />
            {!!entries[currentIndex]?.locationInput && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  const updated = [...entries];
                  updated[currentIndex].locationInput = "";
                  setEntries(updated);
                }}
              >
                <Feather name="x-circle" size={18} color="#C2C2C2" />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.label}>순간의 기록</Text>
          <View style={[styles.inputContainer, styles.multilineContainer]}>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="내용을 입력해주세요"
              placeholderTextColor="#C3C3C3"
              multiline
              value={entries[currentIndex]?.contentInput}
              onChangeText={(text) => {
                const updated = [...entries];
                updated[currentIndex].contentInput = text;
                setEntries(updated);
              }}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footerWrapper}>
        <TouchableOpacity onPress={handleUpdate} style={styles.footerButton}>
          <Text style={styles.footerText}>완료</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={viewerVisible} transparent statusBarTranslucent onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewerBackdrop}>
          <View style={styles.viewerPanel}>
            <View style={styles.viewerImageWrap}>
              {viewerUri && <Image source={{ uri: viewerUri }} style={styles.viewerImage} resizeMode="contain" />}
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: "#fff" },
  title: {
    fontFamily: "Pretendard-Bold",
    fontSize: 20,
    lineHeight: 28,
    color: "#0F172A"
  },
  subtitle: {
    fontFamily: "Pretendard-Regular",
    marginTop: 4,
    fontSize: 13,
    color: "#929292",
    marginBottom: 25,
  },
  flatListContent: {
    // paddingHorizontal: (width - ITEM_WIDTH) / 2
    paddingHorizontal: FLATLIST_PADDING,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    //marginHorizontal: (ITEM_MARGIN - (width - ITEM_WIDTH) / 2),
    marginHorizontal: ITEM_HORIZONTAL_MARGIN,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#eee",
    position: "relative",
  },
  activeItem: {
    borderWidth: 3,
    borderColor: "#5B8DEF",
    borderRadius: 20,
  },
  image: {
    width: "100%",
    height: "100%",
    // ✅ 이미지 자체에 borderRadius를 주어 테두리 안쪽으로 완벽하게 맞도록 수정
    borderRadius: 17,
  },
  pinButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
  },
  pinIcon: {
    width: "100%",
    height: "100%",
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#5B8DEF',
  },
  dotInactive: {
    backgroundColor: '#E2E8F0',
  },
  inputSection: { paddingHorizontal: 20, paddingTop: 12 },
  label: {
    fontFamily: "Pretendard-SemiBold",
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFEFE',
    borderColor: '#F2F2F2',
    borderWidth: 1,
    borderRadius: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Pretendard-Regular",
    paddingHorizontal: 16,
    fontSize: 14,
    height: 48,
  },
  clearButton: {
    padding: 8,
    marginRight: 8,
  },
  multilineContainer: {
    height: 120,
    alignItems: 'flex-start'
  },
  multiline: {
    height: '100%',
    textAlignVertical: "top",
    paddingTop: 16,
    paddingBottom: 16,
  },
  footerWrapper: { padding: 16, backgroundColor: "#fff" },
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