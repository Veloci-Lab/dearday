// // app/compose/[memory_id].tsx
// import { useAuthStore } from "@/utils/authStore";
// import { supabase } from "@/utils/supabase";
// import { Feather } from "@expo/vector-icons";
// import { router, useLocalSearchParams, useNavigation } from "expo-router";
// import { useEffect, useRef, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   Dimensions,
//   FlatList,
//   Image,
//   KeyboardAvoidingView,
//   Modal,
//   Platform,
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
// const ITEM_WIDTH = 231;
// const ITEM_HORIZONTAL_MARGIN = 8;
// const ITEM_TOTAL_MARGIN = ITEM_HORIZONTAL_MARGIN * 2;
// const ITEM_MARGIN = (width - ITEM_WIDTH) / 2;
// const FLATLIST_PADDING = ITEM_MARGIN - ITEM_HORIZONTAL_MARGIN;
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

//   const scrollViewRef = useRef<ScrollView>(null);
//   const contentInputRef = useRef<TextInput>(null);
//   const locationInputRef = useRef<TextInput>(null);

//   useEffect(() => {
//     navigation.setOptions({
//       headerShadowVisible: false,
//       headerStyle: {
//         borderBottomWidth: 1,
//         borderBottomColor: '#f2f2f2',
//       },
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
//       const { data: memoryData } = await supabase
//         .from("memories")
//         .select("memory_id, is_completed, thumbnail_entry_id")
//         .eq("profile_id", profileId)
//         .eq("memory_id", memory_id)
//         .maybeSingle();
      
//       const { data: entriesData } = await supabase
//         .from("memory_entries")
//         .select("memory_entry_id, image_url, image_thumb_url, content, location")
//         .eq("memory_id", memory_id)
//         .eq("is_selected", true)
//         .order("entry_index", { ascending: true });
      
//       const mapped = (entriesData ?? []).map((entry) => ({
//         ...entry,
//         locationInput: entry.location ?? "",
//         contentInput: entry.content ?? ""
//       }));
//       setEntries(mapped);
      
//       let serverThumbId = memoryData?.thumbnail_entry_id ?? null;
//       const thumbExistsInEntries = mapped.some((e) => e.memory_entry_id === serverThumbId);
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
//     if (!memory_id || !thumbnailId) {
//       Alert.alert("대표 사진 선택", "대표 사진을 하나 선택해주세요.");
//       return;
//     }
//     setLoading(true);
//     const updates = entries.map((entry) =>
//       supabase
//         .from("memory_entries")
//         .update({
//           location: entry.locationInput.trim() || null,
//           content: entry.contentInput.trim() || null
//         })
//         .eq("memory_entry_id", entry.memory_entry_id)
//     );
//     await Promise.all(updates);
//     await supabase
//       .from("memories")
//       .update({
//         is_completed: true,
//         thumbnail_entry_id: thumbnailId
//       })
//       .eq("memory_id", memory_id);
//     router.push("/");
//     setLoading(false);
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
//       <KeyboardAvoidingView
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         style={{ flex: 1 }}
//       >
//         <View style={{ flex: 1 }}>
//           {/* ScrollView가 전체 콘텐츠를 감싸도록 수정 */}
//           <ScrollView
//             ref={scrollViewRef}
//             contentContainerStyle={{ paddingBottom: 16 }}
//             automaticallyAdjustContentInsets={false}
//             contentInsetAdjustmentBehavior="never"
//             showsVerticalScrollIndicator={false}
//           >
//             {/* 헤더를 ScrollView 안으로 이동 */}
//             <View style={styles.header}>
//               <Text style={styles.title}>사진별로 기록해주세요</Text>
//               <Text style={styles.subtitle}>빈칸으로 두셔도 좋아요</Text>
//             </View>

//             <FlatList
//               data={entries}
//               horizontal
//               pagingEnabled
//               snapToInterval={ITEM_WIDTH + ITEM_TOTAL_MARGIN}
//               decelerationRate="fast"
//               contentContainerStyle={styles.flatListContent}
//               showsHorizontalScrollIndicator={false}
//               keyExtractor={(item) => String(item.memory_entry_id)}
//               renderItem={({ item, index }) => {
//                 const isThumbnail = item.memory_entry_id === thumbnailId;
//                 const isCurrent = index === currentIndex;
//                 return (
//                   <View style={[styles.itemContainer, isCurrent && styles.activeItem]}>
//                     <Pressable
//                       onPress={() => {
//                         setViewerUri(item.image_url);
//                         setViewerVisible(true);
//                       }}
//                     >
//                       <Image
//                         source={{ uri: item.image_thumb_url || item.image_url }}
//                         style={styles.image}
//                       />
//                     </Pressable>
//                     <TouchableOpacity
//                       style={styles.pinButton}
//                       onPress={() => setThumbnailId(item.memory_entry_id)}
//                       hitSlop={8}
//                     >
//                       <Image
//                         source={
//                           isThumbnail
//                             ? require('@/assets/images/select_on.png')
//                             : require('@/assets/images/select_off.png')
//                         }
//                         style={styles.pinIcon}
//                       />
//                     </TouchableOpacity>
//                   </View>
//                 );
//               }}
//               onMomentumScrollEnd={(e) => {
//                 const contentOffset = e.nativeEvent.contentOffset.x;
//                 const newIndex = Math.round(contentOffset / (ITEM_WIDTH + ITEM_TOTAL_MARGIN));
//                 if (newIndex !== currentIndex) setCurrentIndex(newIndex);
//               }}
//             />

//             <View style={styles.pagination}>
//               {entries.map((_, index) => (
//                 <View
//                   key={index}
//                   style={[
//                     styles.dot,
//                     index === currentIndex ? styles.dotActive : styles.dotInactive
//                   ]}
//                 />
//               ))}
//             </View>

//             <View style={styles.inputSection}>
//               <Text style={styles.label}>내가 있는 곳</Text>
//               <View style={styles.inputContainer}>
//                 <TextInput
//                   ref={locationInputRef}
//                   style={styles.input}
//                   placeholder="장소를 입력해주세요"
//                   placeholderTextColor="#C3C3C3"
//                   value={entries[currentIndex]?.locationInput}
//                   onChangeText={(text) => {
//                     const updated = [...entries];
//                     updated[currentIndex].locationInput = text;
//                     setEntries(updated);
//                   }}
//                   onFocus={() => {
//                     // "내가 있는 곳" 입력 시에도 스크롤 처리
//                     setTimeout(() => {
//                       locationInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
//                         // 헤더가 스크롤에 포함되므로 더 적은 오프셋 사용
//                         scrollViewRef.current?.scrollTo({ y: pageY - 150, animated: true });
//                       });
//                     }, 200);
//                   }}
//                 />
//                 {!!entries[currentIndex]?.locationInput && (
//                   <TouchableOpacity
//                     style={styles.clearButton}
//                     onPress={() => {
//                       const updated = [...entries];
//                       updated[currentIndex].locationInput = "";
//                       setEntries(updated);
//                     }}
//                   >
//                     <Feather name="x-circle" size={18} color="#C2C2C2" />
//                   </TouchableOpacity>
//                 )}
//               </View>

//               <Text style={styles.label}>순간의 기록</Text>
//               <View style={[styles.inputContainer, styles.multilineContainer]}>
//                 <TextInput
//                   ref={contentInputRef}
//                   style={[styles.input, styles.multiline]}
//                   placeholder="내용을 입력해주세요"
//                   placeholderTextColor="#C3C3C3"
//                   multiline
//                   value={entries[currentIndex]?.contentInput}
//                   onChangeText={(text) => {
//                     const updated = [...entries];
//                     updated[currentIndex].contentInput = text;
//                     setEntries(updated);
//                   }}
//                   onFocus={() => {
//                     setTimeout(() => {
//                       contentInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
//                         // 헤더가 스크롤에 포함되므로 더 적은 오프셋 사용
//                         scrollViewRef.current?.scrollTo({ y: pageY - 150, animated: true });
//                       });
//                     }, 200);
//                   }}
//                 />
//               </View>
//             </View>
//           </ScrollView>
//         </View>

//         <View style={styles.footerWrapper}>
//           <TouchableOpacity onPress={handleUpdate} style={styles.footerButton}>
//             <Text style={styles.footerText}>완료</Text>
//           </TouchableOpacity>
//         </View>
//       </KeyboardAvoidingView>

//       <Modal
//         visible={viewerVisible}
//         transparent
//         statusBarTranslucent
//         onRequestClose={() => setViewerVisible(false)}
//       >
//         <View style={styles.viewerBackdrop}>
//           <View style={styles.viewerPanel}>
//             <View style={styles.viewerImageWrap}>
//               {viewerUri && (
//                 <Image
//                   source={{ uri: viewerUri }}
//                   style={styles.viewerImage}
//                   resizeMode="contain"
//                 />
//               )}
//             </View>
//             <TouchableOpacity
//               style={styles.viewerCloseBelow}
//               onPress={() => setViewerVisible(false)}
//             >
//               <Feather name="x" size={22} color="#fff" />
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   centered: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center"
//   },
//   header: {
//     paddingHorizontal: 16,
//     paddingTop: 16,
//     paddingBottom: 8,
//     backgroundColor: "#fff"
//   },
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
//     color: "#929292",
//     marginBottom: 25,
//   },
//   flatListContent: {
//     paddingHorizontal: FLATLIST_PADDING,
//   },
//   itemContainer: {
//     width: ITEM_WIDTH,
//     height: ITEM_WIDTH,
//     marginHorizontal: ITEM_HORIZONTAL_MARGIN,
//     borderRadius: 20,
//     overflow: "hidden",
//     backgroundColor: "#eee",
//     position: "relative",
//   },
//   activeItem: {
//     borderWidth: 3,
//     borderColor: "#5B8DEF",
//     borderRadius: 20,
//   },
//   image: {
//     width: "100%",
//     height: "100%",
//     borderRadius: 17,
//   },
//   pinButton: {
//     position: "absolute",
//     top: 12,
//     right: 12,
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
//     marginTop: 24,
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
//   inputSection: {
//     paddingHorizontal: 20,
//     paddingTop: 12
//   },
//   label: {
//     fontFamily: "Pretendard-Medium",
//     color: '#0F172A',
//     marginTop: 16,
//     marginBottom: 8
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FEFEFE',
//     borderColor: '#F2F2F2',
//     borderWidth: 1,
//     borderRadius: 10,
//   },
//   input: {
//     flex: 1,
//     fontFamily: "Pretendard-Regular",
//     paddingHorizontal: 16,
//     fontSize: 14,
//     height: 48,
//     color: "#333333"
//   },
//   clearButton: {
//     padding: 8,
//     marginRight: 8,
//   },
//   multilineContainer: {
//     height: 120,
//     alignItems: 'flex-start'
//   },
//   multiline: {
//     height: '100%',
//     textAlignVertical: "top",
//     paddingTop: 16,
//     paddingBottom: 16,
//   },
//   footerWrapper: {
//     padding: 16,
//     backgroundColor: "#fff",
//   },
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
//   viewerBackdrop: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.9)",
//     justifyContent: "center",
//     alignItems: "center"
//   },
//   viewerPanel: {
//     width: Math.min(width * 0.9, 420),
//     height: Math.min(height * 0.85, 720),
//     padding: 16,
//     borderRadius: 12,
//     backgroundColor: "rgba(0,0,0,0.6)"
//   },
//   viewerImageWrap: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center"
//   },
//   viewerImage: {
//     width: "100%",
//     height: "100%"
//   },
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

////////////////////////////////////////////////////////////////////////////////////////

// // app/compose/[memory_id].tsx
// import { useAuthStore } from "@/utils/authStore";
// import { supabase } from "@/utils/supabase";
// import { Feather } from "@expo/vector-icons";
// import { router, useLocalSearchParams, useNavigation } from "expo-router";
// import { useEffect, useRef, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   Dimensions,
//   FlatList,
//   Image,
//   KeyboardAvoidingView,
//   Modal,
//   Platform,
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
// const ITEM_WIDTH = 231;
// const ITEM_HORIZONTAL_MARGIN = 8;
// const ITEM_TOTAL_MARGIN = ITEM_HORIZONTAL_MARGIN * 2;
// const ITEM_MARGIN = (width - ITEM_WIDTH) / 2;
// const FLATLIST_PADDING = ITEM_MARGIN - ITEM_HORIZONTAL_MARGIN;
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

//   const scrollViewRef = useRef<ScrollView>(null);
//   const contentInputRef = useRef<TextInput>(null);
//   const locationInputRef = useRef<TextInput>(null);

//   // ✅ 가로 리스트 제어용 ref 및 한 칸 스크롤 유틸
//   const listRef = useRef<FlatList<any>>(null);
//   const SNAP = ITEM_WIDTH + ITEM_TOTAL_MARGIN;
//   const scrollOneStep = (dir: -1 | 1) => {
//     const target = Math.max(0, Math.min(entries.length - 1, currentIndex + dir));
//     listRef.current?.scrollToOffset({ offset: target * SNAP, animated: true });
//   };

//   useEffect(() => {
//     navigation.setOptions({
//       headerShadowVisible: false,
//       headerStyle: {
//         borderBottomWidth: 1,
//         borderBottomColor: '#f2f2f2',
//       },
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
//       const { data: memoryData } = await supabase
//         .from("memories")
//         .select("memory_id, is_completed, thumbnail_entry_id")
//         .eq("profile_id", profileId)
//         .eq("memory_id", memory_id)
//         .maybeSingle();
      
//       const { data: entriesData } = await supabase
//         .from("memory_entries")
//         .select("memory_entry_id, image_url, image_thumb_url, content, location")
//         .eq("memory_id", memory_id)
//         .eq("is_selected", true)
//         .order("entry_index", { ascending: true });
      
//       const mapped = (entriesData ?? []).map((entry) => ({
//         ...entry,
//         locationInput: entry.location ?? "",
//         contentInput: entry.content ?? ""
//       }));
//       setEntries(mapped);
      
//       let serverThumbId = memoryData?.thumbnail_entry_id ?? null;
//       const thumbExistsInEntries = mapped.some((e) => e.memory_entry_id === serverThumbId);
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
//     if (!memory_id || !thumbnailId) {
//       Alert.alert("대표 사진 선택", "대표 사진을 하나 선택해주세요.");
//       return;
//     }
//     setLoading(true);
//     const updates = entries.map((entry) =>
//       supabase
//         .from("memory_entries")
//         .update({
//           location: entry.locationInput.trim() || null,
//           content: entry.contentInput.trim() || null
//         })
//         .eq("memory_entry_id", entry.memory_entry_id)
//     );
//     await Promise.all(updates);
//     await supabase
//       .from("memories")
//       .update({
//         is_completed: true,
//         thumbnail_entry_id: thumbnailId
//       })
//       .eq("memory_id", memory_id);
//     router.push("/");
//     setLoading(false);
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
//       <KeyboardAvoidingView
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         style={{ flex: 1 }}
//       >
//         <View style={{ flex: 1 }}>
//           {/* ScrollView가 전체 콘텐츠를 감싸도록 유지 */}
//           <ScrollView
//             ref={scrollViewRef}
//             contentContainerStyle={{ paddingBottom: 16 }}
//             automaticallyAdjustContentInsets={false}
//             contentInsetAdjustmentBehavior="never"
//             showsVerticalScrollIndicator={false}
//           >
//             {/* 헤더를 ScrollView 안으로 이동 */}
//             <View style={styles.header}>
//               <Text style={styles.title}>사진별로 기록해주세요</Text>
//               <Text style={styles.subtitle}>빈칸으로 두셔도 좋아요</Text>
//             </View>

//             <FlatList
//               ref={listRef}
//               data={entries}
//               horizontal
//               pagingEnabled
//               snapToInterval={ITEM_WIDTH + ITEM_TOTAL_MARGIN}
//               decelerationRate="fast"
//               contentContainerStyle={styles.flatListContent}
//               showsHorizontalScrollIndicator={false}
//               keyExtractor={(item) => String(item.memory_entry_id)}
//               renderItem={({ item, index }) => {
//                 const isThumbnail = item.memory_entry_id === thumbnailId;
//                 const isCurrent = index === currentIndex;
//                 return (
//                   <View style={[styles.itemContainer, isCurrent && styles.activeItem]}>
//                     <Pressable
//                       onPress={() => {
//                         if (isCurrent) {
//                           // 가운데 카드만 확대
//                           setViewerUri(item.image_url);
//                           setViewerVisible(true);
//                         } else {
//                           // 좌우 카드: 해당 방향으로 한 칸 이동
//                           if (index < currentIndex) scrollOneStep(-1);
//                           else scrollOneStep(1);
//                         }
//                       }}
//                     >
//                       <Image
//                         source={{ uri: item.image_thumb_url || item.image_url }}
//                         style={styles.image}
//                       />
//                     </Pressable>
//                     <TouchableOpacity
//                       style={styles.pinButton}
//                       onPress={() => setThumbnailId(item.memory_entry_id)}
//                       hitSlop={8}
//                     >
//                       <Image
//                         source={
//                           isThumbnail
//                             ? require('@/assets/images/select_on.png')
//                             : require('@/assets/images/select_off.png')
//                         }
//                         style={styles.pinIcon}
//                       />
//                     </TouchableOpacity>
//                   </View>
//                 );
//               }}
//               onMomentumScrollEnd={(e) => {
//                 const contentOffset = e.nativeEvent.contentOffset.x;
//                 const newIndex = Math.round(contentOffset / (ITEM_WIDTH + ITEM_TOTAL_MARGIN));
//                 if (newIndex !== currentIndex) setCurrentIndex(newIndex);
//               }}
//             />

//             <View style={styles.pagination}>
//               {entries.map((_, index) => (
//                 <View
//                   key={index}
//                   style={[
//                     styles.dot,
//                     index === currentIndex ? styles.dotActive : styles.dotInactive
//                   ]}
//                 />
//               ))}
//             </View>

//             <View style={styles.inputSection}>
//               <Text style={styles.label}>내가 있는 곳</Text>
//               <View style={styles.inputContainer}>
//                 <TextInput
//                   ref={locationInputRef}
//                   style={styles.input}
//                   placeholder="장소를 입력해주세요"
//                   placeholderTextColor="#C3C3C3"
//                   value={entries[currentIndex]?.locationInput}
//                   onChangeText={(text) => {
//                     const updated = [...entries];
//                     updated[currentIndex].locationInput = text;
//                     setEntries(updated);
//                   }}
//                   onFocus={() => {
//                     setTimeout(() => {
//                       locationInputRef.current?.measure((x, y, w, h, pageX, pageY) => {
//                         scrollViewRef.current?.scrollTo({ y: pageY - 150, animated: true });
//                       });
//                     }, 200);
//                   }}
//                 />
//                 {!!entries[currentIndex]?.locationInput && (
//                   <TouchableOpacity
//                     style={styles.clearButton}
//                     onPress={() => {
//                       const updated = [...entries];
//                       updated[currentIndex].locationInput = "";
//                       setEntries(updated);
//                     }}
//                   >
//                     <Feather name="x-circle" size={18} color="#C2C2C2" />
//                   </TouchableOpacity>
//                 )}
//               </View>

//               <Text style={styles.label}>순간의 기록</Text>
//               <View style={[styles.inputContainer, styles.multilineContainer]}>
//                 <TextInput
//                   ref={contentInputRef}
//                   style={[styles.input, styles.multiline]}
//                   placeholder="내용을 입력해주세요"
//                   placeholderTextColor="#C3C3C3"
//                   multiline
//                   value={entries[currentIndex]?.contentInput}
//                   onChangeText={(text) => {
//                     const updated = [...entries];
//                     updated[currentIndex].contentInput = text;
//                     setEntries(updated);
//                   }}
//                   onFocus={() => {
//                     setTimeout(() => {
//                       contentInputRef.current?.measure((x, y, w, h, pageX, pageY) => {
//                         scrollViewRef.current?.scrollTo({ y: pageY - 150, animated: true });
//                       });
//                     }, 200);
//                   }}
//                 />
//               </View>
//             </View>
//           </ScrollView>
//         </View>

//         <View style={styles.footerWrapper}>
//           <TouchableOpacity onPress={handleUpdate} style={styles.footerButton}>
//             <Text style={styles.footerText}>완료</Text>
//           </TouchableOpacity>
//         </View>
//       </KeyboardAvoidingView>

//       <Modal
//         visible={viewerVisible}
//         transparent
//         statusBarTranslucent
//         onRequestClose={() => setViewerVisible(false)}
//       >
//         <View style={styles.viewerBackdrop}>
//           <View style={styles.viewerPanel}>
//             <View style={styles.viewerImageWrap}>
//               {viewerUri && (
//                 <Image
//                   source={{ uri: viewerUri }}
//                   style={styles.viewerImage}
//                   resizeMode="contain"
//                 />
//               )}
//             </View>
//             <TouchableOpacity
//               style={styles.viewerCloseBelow}
//               onPress={() => setViewerVisible(false)}
//             >
//               <Feather name="x" size={22} color="#fff" />
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   centered: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center"
//   },
//   header: {
//     paddingHorizontal: 16,
//     paddingTop: 16,
//     paddingBottom: 8,
//     backgroundColor: "#fff"
//   },
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
//     color: "#929292",
//     marginBottom: 25,
//   },
//   flatListContent: {
//     paddingHorizontal: FLATLIST_PADDING,
//   },
//   itemContainer: {
//     width: ITEM_WIDTH,
//     height: ITEM_WIDTH,
//     marginHorizontal: ITEM_HORIZONTAL_MARGIN,
//     borderRadius: 20,
//     overflow: "hidden",
//     backgroundColor: "#eee",
//     position: "relative",
//   },
//   activeItem: {
//     borderWidth: 3,
//     borderColor: "#5B8DEF",
//     borderRadius: 20,
//   },
//   image: {
//     width: "100%",
//     height: "100%",
//     borderRadius: 17,
//   },
//   pinButton: {
//     position: "absolute",
//     top: 12,
//     right: 12,
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
//     marginTop: 24,
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
//   inputSection: {
//     paddingHorizontal: 20,
//     paddingTop: 12
//   },
//   label: {
//     fontFamily: "Pretendard-Medium",
//     color: '#0F172A',
//     marginTop: 16,
//     marginBottom: 8
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FEFEFE',
//     borderColor: '#F2F2F2',
//     borderWidth: 1,
//     borderRadius: 10,
//   },
//   input: {
//     flex: 1,
//     fontFamily: "Pretendard-Regular",
//     paddingHorizontal: 16,
//     fontSize: 14,
//     height: 48,
//     color: "#333333"
//   },
//   clearButton: {
//     padding: 8,
//     marginRight: 8,
//   },
//   multilineContainer: {
//     height: 120,
//     alignItems: 'flex-start'
//   },
//   multiline: {
//     height: '100%',
//     textAlignVertical: "top",
//     paddingTop: 16,
//     paddingBottom: 16,
//   },
//   footerWrapper: {
//     padding: 16,
//     backgroundColor: "#fff",
//   },
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
//   viewerBackdrop: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.9)",
//     justifyContent: "center",
//     alignItems: "center"
//   },
//   viewerPanel: {
//     width: Math.min(width * 0.9, 420),
//     height: Math.min(height * 0.85, 720),
//     padding: 16,
//     borderRadius: 12,
//     backgroundColor: "rgba(0,0,0,0.6)"
//   },
//   viewerImageWrap: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center"
//   },
//   viewerImage: {
//     width: "100%",
//     height: "100%"
//   },
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

////////////////////////////////////////////////////////////////////////////////////////

// app/compose/[memory_id].tsx
import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

  const scrollViewRef = useRef<ScrollView>(null);
  const contentInputRef = useRef<TextInput>(null);
  const locationInputRef = useRef<TextInput>(null);

  // ✅ 가로 리스트 제어용 ref 및 한 칸 스크롤 유틸
  const listRef = useRef<FlatList<any>>(null);
  const SNAP = ITEM_WIDTH + ITEM_TOTAL_MARGIN;
  const scrollOneStep = (dir: -1 | 1) => {
    const target = Math.max(0, Math.min(entries.length - 1, currentIndex + dir));
    listRef.current?.scrollToOffset({ offset: target * SNAP, animated: true });
  };

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
    });
  }, [navigation]);

  useEffect(() => {
    if (!profileId || !memory_id) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: memoryData } = await supabase
        .from("memories")
        .select("memory_id, is_completed, thumbnail_entry_id")
        .eq("profile_id", profileId)
        .eq("memory_id", memory_id)
        .maybeSingle();

      const { data: entriesData } = await supabase
        .from("memory_entries")
        .select("memory_entry_id, image_url, image_thumb_url, content, location")
        .eq("memory_id", memory_id)
        .eq("is_selected", true)
        .order("entry_index", { ascending: true });

      const mapped = (entriesData ?? []).map((entry) => ({
        ...entry,
        locationInput: entry.location ?? "",
        contentInput: entry.content ?? ""
      }));
      setEntries(mapped);

      let serverThumbId = memoryData?.thumbnail_entry_id ?? null;
      const thumbExistsInEntries = mapped.some((e) => e.memory_entry_id === serverThumbId);
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
    if (!memory_id || !thumbnailId) {
      Alert.alert("대표 사진 선택", "대표 사진을 하나 선택해주세요.");
      return;
    }
    setLoading(true);
    const updates = entries.map((entry) =>
      supabase
        .from("memory_entries")
        .update({
          location: entry.locationInput.trim() || null,
          content: entry.contentInput.trim() || null
        })
        .eq("memory_entry_id", entry.memory_entry_id)
    );
    await Promise.all(updates);
    await supabase
      .from("memories")
      .update({
        is_completed: true,
        thumbnail_entry_id: thumbnailId
      })
      .eq("memory_id", memory_id);
    router.push("/");
    setLoading(false);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ paddingBottom: 16 }}
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>사진별로 기록해주세요</Text>
              <Text style={styles.subtitle}>빈칸으로 두셔도 좋아요</Text>
            </View>

            <FlatList
              ref={listRef}
              data={entries}
              horizontal
              pagingEnabled
              snapToInterval={ITEM_WIDTH + ITEM_TOTAL_MARGIN}
              decelerationRate="fast"
              contentContainerStyle={styles.flatListContent}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item.memory_entry_id)}
              renderItem={({ item, index }) => {
                const isThumbnail = item.memory_entry_id === thumbnailId;
                const isCurrent = index === currentIndex;

                return (
                  <View style={styles.itemContainer}>
                    <Pressable
                      onPress={() => {
                        if (isCurrent) {
                          setViewerUri(item.image_url);
                          setViewerVisible(true);
                        } else {
                          if (index < currentIndex) scrollOneStep(-1);
                          else scrollOneStep(1);
                        }
                      }}
                    >
                      <Image
                        source={{ uri: item.image_thumb_url || item.image_url }}
                        style={styles.image}
                      />
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

                    {/* ✅ 현재 카드일 때만 — 레이아웃 비영향 보더 오버레이 */}
                    {isCurrent && <View pointerEvents="none" style={styles.activeOverlay} />}
                  </View>
                );
              }}
              onMomentumScrollEnd={(e) => {
                const contentOffset = e.nativeEvent.contentOffset.x;
                const newIndex = Math.round(contentOffset / (ITEM_WIDTH + ITEM_TOTAL_MARGIN));
                if (newIndex !== currentIndex) setCurrentIndex(newIndex);
              }}
            />

            <View style={styles.pagination}>
              {entries.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentIndex ? styles.dotActive : styles.dotInactive
                  ]}
                />
              ))}
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>내가 있는 곳</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  ref={locationInputRef}
                  style={styles.input}
                  placeholder="장소를 입력해주세요"
                  placeholderTextColor="#C3C3C3"
                  value={entries[currentIndex]?.locationInput}
                  onChangeText={(text) => {
                    const updated = [...entries];
                    updated[currentIndex].locationInput = text;
                    setEntries(updated);
                  }}
                  onFocus={() => {
                    setTimeout(() => {
                      locationInputRef.current?.measure((x, y, w, h, pageX, pageY) => {
                        scrollViewRef.current?.scrollTo({ y: pageY - 150, animated: true });
                      });
                    }, 200);
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
                  ref={contentInputRef}
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
                  onFocus={() => {
                    setTimeout(() => {
                      contentInputRef.current?.measure((x, y, w, h, pageX, pageY) => {
                        scrollViewRef.current?.scrollTo({ y: pageY - 150, animated: true });
                      });
                    }, 200);
                  }}
                />
              </View>
            </View>
          </ScrollView>
        </View>

        <View style={styles.footerWrapper}>
          <TouchableOpacity onPress={handleUpdate} style={styles.footerButton}>
            <Text style={styles.footerText}>완료</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={viewerVisible}
        transparent
        statusBarTranslucent
        onRequestClose={() => setViewerVisible(false)}
      >
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
            <TouchableOpacity
              style={styles.viewerCloseBelow}
              onPress={() => setViewerVisible(false)}
            >
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#fff"
  },
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
    paddingHorizontal: FLATLIST_PADDING,
  },

  // 컨테이너에는 더 이상 보더를 주지 않음 (수축 방지)
  itemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    marginHorizontal: ITEM_HORIZONTAL_MARGIN,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#eee",
    position: "relative",
  },

  // ✅ 선택(현재) 카드용 보더 — 레이아웃에 영향 없는 오버레이
  activeOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 3,
    borderColor: "#5B8DEF",
    borderRadius: 20,
    pointerEvents: "none",
  },

  // 이미지가 모서리까지 꽉 차도록 컨테이너와 동일한 radius 사용
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 20, // ← 컨테이너와 동일
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
  inputSection: {
    paddingHorizontal: 20,
    paddingTop: 12
  },
  label: {
    fontFamily: "Pretendard-Medium",
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
    color: "#333333"
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
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center"
  },
  viewerPanel: {
    width: Math.min(width * 0.9, 420),
    height: Math.min(height * 0.85, 720),
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)"
  },
  viewerImageWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  viewerImage: {
    width: "100%",
    height: "100%"
  },
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
