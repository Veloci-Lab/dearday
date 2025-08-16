// // IncompleteMemoriesScreen.tsx
// import { useAuthStore } from "@/utils/authStore";
// import { supabase } from '@/utils/supabase';
// import { Feather } from "@expo/vector-icons";
// import { router, useNavigation } from 'expo-router';
// import React, { useEffect, useMemo, useState } from 'react';
// import { Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View, Alert } from 'react-native';
// import { Swipeable } from 'react-native-gesture-handler';

// type MemoryRow = {
//   memory_id: string;
//   date: string; // YYYY-MM-DD
// };

// type EntryRow = {
//   memory_entry_id: string;
//   memory_id: string;
//   image_url: string | null;
//   entry_index: number;
// };

// type Card = {
//   memory_id: string;
//   date: string;      // YYYY-MM-DD
//   weekday: string;   // 화요일
//   images: string[];  // 썸네일들
// };

// export default function IncompleteMemoriesScreen() {
//   const navigation = useNavigation();
//   const { profileId } = useAuthStore();
//   const [cards, setCards] = useState<Card[]>([]);
//   const [loading, setLoading] = useState(true);

//   // 썸네일 너비 계산: 3.5장 보이기
//   const { itemSize, gap, pad } = useMemo(() => {
//     const screenW = Dimensions.get('window').width;
//     const pad = 0;
//     const gap = 8;
//     const visible = 4;
//     const itemSize = (screenW - pad * 2 - gap * (visible - 1)) / visible;
//     return { itemSize, gap, pad };
//   }, []);

//   useEffect(() => {
//     navigation.setOptions({
//       headerLeft: () => (
//         <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
//           <Feather name="chevron-left" size={24} color="#000" />
//         </Pressable>
//       ),
//       headerTitle: () => (
//         <View style={{ alignItems: "center" }}>
//           <Text style={ styles.Moments }>Moments</Text>
//           <Text style={ styles.pendingPics }>기록을 기다리는 사진들</Text>
//         </View>
//       ),
//       headerTitleAlign: "center",
//     });
//   }, [navigation]);

//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       try {
//         // 1) 미완료 메모리 목록
//         let memQ = supabase
//           .from('memories')
//           .select('memory_id, date')
//           .eq('profile_id', profileId)
//           .eq('is_completed', false)
//           .order('date', { ascending: false });

//         const { data: memories, error: memErr } = await memQ as unknown as {
//           data: MemoryRow[] | null; error: any
//         };
//         if (memErr) throw memErr;
//         const list = memories ?? [];

//         if (list.length === 0) {
//           setCards([]);
//           return;
//         }

//         // 2) 해당 메모리들의 이미지 엔트리
//         const memoryIds = list.map(m => m.memory_id);
//         const { data: entries, error: entErr } = await supabase
//           .from('memory_entries')
//           .select('memory_entry_id, memory_id, image_url, entry_index')
//           .in('memory_id', memoryIds)
//           .not('image_url', 'is', null)
//           .order('memory_id', { ascending: true })
//           .order('entry_index', { ascending: true }) as unknown as {
//             data: EntryRow[] | null; error: any
//           };
//         if (entErr) throw entErr;

//         // 3) 메모리별로 묶기
//         const byMem = new Map<string, string[]>();
//         (entries ?? []).forEach(e => {
//           if (!e.image_url) return;
//           const arr = byMem.get(e.memory_id) ?? [];
//           arr.push(e.image_url);
//           byMem.set(e.memory_id, arr);
//         });

//         const cards: Card[] = list.map(m => ({
//           memory_id: m.memory_id,
//           date: m.date,
//           weekday: weekdayLabel(m.date),
//           images: byMem.get(m.memory_id) ?? [],
//         }));

//         setCards(cards);
//       } catch (e) {
//         console.error('load incomplete memories error:', e);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [profileId]);

//   const monthOf = (d: string) => Number(d.slice(5, 7));

//   function confirmDelete(memory_id: string) {
//     Alert.alert("삭제할까요?", "이 날짜의 미완성 기록을 삭제합니다.", [
//       { text: "취소", style: "cancel" },
//       {
//         text: "삭제",
//         style: "destructive",
//         onPress: async () => {
//           const { error } = await supabase.from("memories").delete().eq("memory_id", memory_id);
//           if (!error) {
//             setCards(prev => prev.filter(c => c.memory_id !== memory_id));
//           } else {
//             Alert.alert("삭제 실패", "잠시 후 다시 시도해 주세요.");
//           }
//         },
//       },
//     ]);
//   }

//   return (
//     <>
//       {loading ? (
//         <View style={styles.center}>
//           <Text>불러오는 중…</Text>
//         </View>
//       ) : cards.length === 0 ? (
//         <View style={styles.emptyWrap}>
//           <View style={styles.emptyCircle}>
//             <Image
//               source={require('@/assets/images/logo_blue.png')}
//               style={{ width: 28, height: 28, resizeMode: 'contain' }}
//             />
//           </View>
//           <Text style={styles.emptyText}>기록 안 된 항목이 없어요.</Text>
//         </View>
//       ) : (
//         // <FlatList
//         //   data={cards}
//         //   keyExtractor={(c) => c.memory_id}
//         //   contentContainerStyle={{ padding: 0 }}
//         //   renderItem={({ item }) => (
//         //     <MemoryCard item={item} itemSize={itemSize} gap={gap} pad={pad} />
//         //   )}
//         //   ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
//         // />
//         <FlatList
//           data={cards}
//           keyExtractor={(c) => c.memory_id}
//           contentContainerStyle={{ paddingBottom: 24 }}
//           // ✅ 월 헤더/구분선만 추가된 부분
//           renderItem={({ item, index }) => {
//             const curM  = monthOf(item.date);
//             const prevM = index > 0 ? monthOf(cards[index - 1].date) : -1;
//             const nextM = index < cards.length - 1 ? monthOf(cards[index + 1].date) : -1;

//             const showMonthHeader = index === 0 || curM !== prevM;
//             const isLastInMonth   = index === cards.length - 1 || curM !== nextM;

//             return (
//               <View>
//                 {showMonthHeader && (
//                   <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff' }}>
//                     <Text style={{ fontSize: 14, fontWeight: '700', color: '#1C1C1E' }}>{`${curM}월`}</Text>
//                   </View>
//                 )}

//                 <Swipeable
//                   overshootRight={false}
//                   renderRightActions={() => (
//                     <Pressable
//                       onPress={() => confirmDelete(item.memory_id)}
//                       style={styles.swipeDelete}
//                     >
//                       <Feather name="trash-2" size={20} color="#fff" />
//                     </Pressable>
//                   )}
//                 >
//                   <MemoryCard item={item} itemSize={itemSize} gap={gap} pad={pad} />
//                 </Swipeable>

//                 {/* 같은 달: 얇은 1px / 다음 달로 넘어갈 때: 8px 높이 섹션 간격 */}
//                 {isLastInMonth ? (
//                   <View style={{ height: 8, backgroundColor: '#F7F7F8' }} />
//                 ) : (
//                   <View style={{ height: 1, backgroundColor: '#EFEFF0' }} />
//                 )}
//               </View>
//             );
//           }}
//         />
//       )}
//     </>
//   );
// }

// /* ---------- 카드 컴포넌트 ---------- */
// function MemoryCard({ item, itemSize, gap, pad }: { item: Card; itemSize: number; gap: number; pad: number }) {
//   const dateLabel = item.date.replaceAll('-', '.');
//   const weekday = item.weekday.toUpperCase().slice(0, 3); // FRI, MON 같은 형식

//   const onEdit = () => {
//     router.push(`/today/${item.memory_id}`);
//   };

//   const MAX = 4;
//   const images = item.images;
//   const remain = Math.max(0, images.length - MAX);
//   const display = images.length > 0 ? images.slice(0, MAX) : new Array(MAX).fill(null);

//   return (
//     <View style={styles.card}>
//       {/* 헤더 (날짜만 표시) */}
//       <View style={styles.cardHeader}>
//         <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
//           <Text style={styles.cardDate}>{dateLabel}</Text>
//           <Text style={styles.cardWeekday}> {weekday}</Text>
//         </View>
//         {/* 이 위치에 있던 화살표 버튼을 아래로 옮겼습니다. */}
//       </View>

//       {/* ✅ [수정] 이미지 목록과 화살표 버튼을 함께 묶는 새로운 View */}
//       <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//         {/* 이미지 가로 슬라이더가 공간을 차지하도록 flex: 1을 추가 */}
//         <View style={{ flex: 1 }}>
//           <FlatList
//             data={display}
//             keyExtractor={(_, idx) => String(idx)}
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             ItemSeparatorComponent={() => <View style={{ width: gap }} />}
//             renderItem={({ item: uri, index }) => (
//               <View style={{ width: itemSize, marginLeft: index === 0 ? 0 : pad }}>
//                 <View style={styles.thumbBoxSmall}>
//                   {uri ? (
//                     <Image source={{ uri }} style={styles.thumbImg} />
//                   ) : (
//                     <View style={styles.placeholder} />
//                   )}

//                   {index === MAX - 1 && remain > 0 && (
//                     <View style={styles.moreOverlay}>
//                       <Text style={styles.moreText}>{`+${remain}`}</Text>
//                     </View>
//                   )}
//                 </View>
//               </View>
//             )}
//           />
//         </View>

//         {/* 화살표 버튼을 이곳으로 이동 */}
//         <Pressable onPress={onEdit} style={styles.editBtn}>
//           <Feather name="arrow-right" size={20} color="#5B8DEF" />
//         </Pressable>
//       </View>
//     </View>
//   );
// }

// /* ---------- 유틸 ---------- */
// function weekdayLabel(yyyy_mm_dd: string) {
//   const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
//   const wd = new Date(y, m - 1, d).getDay();
//   return ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'][wd];
// }

// /* ---------- 스타일 ---------- */
// const styles = StyleSheet.create({
//   center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

//   card: {
//     backgroundColor: '#fff',
//     // borderBottomWidth: 1,
//     // borderBottomColor: '#E0E0E0',
//     padding: 16,
//   },

//   cardHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     marginBottom: 8,
//   },

//   cardDate: { fontSize: 16, fontWeight: '700' },
//   cardWeekday: { fontSize: 14, color: '#999', fontWeight: '500' },

//   editBtn: {
//     // backgroundColor: '#E75234',
//     // padding: 8,
//     // borderRadius: 8,
//     width: 40, height: 40,
//     borderRadius: 8,
//     backgroundColor: "#EFF3FF",
//     alignItems: "center", justifyContent: "center",
//     marginLeft: 12,
//   },

//   thumbBoxSmall: {
//     flex: 1,
//     aspectRatio: 1,
//     borderRadius: 8,
//     overflow: 'hidden',
//     backgroundColor: '#eee',
//   },

//   thumbImg: { width: '100%', height: '100%' },
//   placeholder: { flex: 1, backgroundColor: '#E7E9ED' },

//   moreOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "rgba(0,0,0,0.35)",
//     alignItems: "center", justifyContent: "center",
//   },
//   moreText: { color: "#fff", fontWeight: "800", fontSize: 16 },

//   emptyWrap: {
//     flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12
//   },

//   emptyCircle: {
//     width: 44, height: 44, borderRadius: 22,
//     alignItems: 'center', justifyContent: 'center',
//     backgroundColor: '#EFF3FF',
//   },

//   emptyText: { color: '#8E8E93', fontSize: 14, fontWeight: '600' },

//   swipeDelete: {
//     width: 72, height: '100%',
//     backgroundColor: '#D45A3E',
//     alignItems: 'center', justifyContent: 'center',
//   },
//   Moments: { 
//     fontFamily: "Pretendard-Bold",
//     fontSize: 18, 
//     //fontWeight: "700", 
//     color: "#5B8DEF" },
//   pendingPics: { 
//     fontFamily: "Pretendard-Regular",
//     fontSize: 12, 
//     color: "#929292", 
//     marginTop: 2 }
// });

// IncompleteMemoriesScreen.tsx
import { useAuthStore } from "@/utils/authStore";
import { supabase } from '@/utils/supabase';
import { Feather } from "@expo/vector-icons";
import { router, useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

type MemoryRow = {
  memory_id: string;
  date: string;
};

type EntryRow = {
  memory_entry_id: string;
  memory_id: string;
  image_url: string | null;
  entry_index: number;
};

type Card = {
  memory_id: string;
  date: string;
  weekday: string;
  images: string[];
};

export default function IncompleteMemoriesScreen() {
  const navigation = useNavigation();
  const { profileId } = useAuthStore();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
          <Feather name="chevron-left" size={24} color="#000" />
        </Pressable>
      ),
      headerTitle: () => (
        <View style={{ alignItems: "center" }}>
           <Text style={ styles.Moments }>Moments</Text>
           <Text style={ styles.pendingPics }>기록을 기다리는 사진들</Text>
        </View>
      ),
      headerTitleAlign: "center",
    });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: memories } = await supabase.from('memories').select('memory_id, date').eq('profile_id', profileId).eq('is_completed', false).order('date', { ascending: false });
        const list = (memories as MemoryRow[]) ?? [];
        if (list.length === 0) { setCards([]); return; }

        const memoryIds = list.map(m => m.memory_id);
        const { data: entries } = await supabase.from('memory_entries').select('memory_id, image_url').in('memory_id', memoryIds).not('image_url', 'is', null).order('entry_index', { ascending: true });
        
        const byMem = new Map<string, string[]>();
        (entries as EntryRow[] ?? []).forEach(e => {
          if (!e.image_url) return;
          const arr = byMem.get(e.memory_id) ?? [];
          arr.push(e.image_url);
          byMem.set(e.memory_id, arr);
        });

        const cardsData: Card[] = list.map(m => ({
          memory_id: m.memory_id,
          date: m.date,
          weekday: weekdayLabel(m.date),
          images: byMem.get(m.memory_id) ?? [],
        }));
        setCards(cardsData);
      } catch (e) {
        console.error('load incomplete memories error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profileId]);

  const monthOf = (d: string) => Number(d.slice(5, 7));

  function confirmDelete(memory_id: string) {
    Alert.alert("삭제할까요?", "이 날짜의 미완성 기록을 삭제합니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제", style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("memories").delete().eq("memory_id", memory_id);
          if (!error) {
            setCards(prev => prev.filter(c => c.memory_id !== memory_id));
          } else {
            Alert.alert("삭제 실패", "잠시 후 다시 시도해 주세요.");
          }
        },
      },
    ]);
  }

  return (
    <>
      {loading ? ( <View style={styles.center}><Text>불러오는 중…</Text></View> )
      : cards.length === 0 ? ( <View style={styles.emptyWrap}>
          <View style={styles.emptyCircle}><Image source={require('@/assets/images/logo_blue.png')} style={{ width: 28, height: 28, resizeMode: 'contain' }} /></View>
          <Text style={styles.emptyText}>기록 안 된 항목이 없어요.</Text>
        </View> )
      : (
        <FlatList
          data={cards}
          keyExtractor={(c) => c.memory_id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item, index }) => {
            const curM  = monthOf(item.date);
            const prevM = index > 0 ? monthOf(cards[index - 1].date) : -1;
            const isLastInMonth = index === cards.length - 1 || curM !== monthOf(cards[index + 1].date);
            const showMonthHeader = index === 0 || curM !== prevM;

            return (
              <View>
                {showMonthHeader && (
                  <View style={styles.monthHeader}>
                    <Text style={styles.monthHeaderText}>{`${curM}월`}</Text>
                  </View>
                )}
                <Swipeable
                  overshootRight={false}
                  renderRightActions={() => (
                    <Pressable onPress={() => confirmDelete(item.memory_id)} style={styles.swipeDelete}>
                      <Feather name="trash-2" size={20} color="#fff" />
                    </Pressable>
                  )}
                >
                  <MemoryCard item={item} />
                </Swipeable>
                {isLastInMonth ? <View style={{ height: 8, backgroundColor: '#F7F7F8' }} /> : <View style={{ height: 1, backgroundColor: '#EFEFF0' }} />}
              </View>
            );
          }}
        />
      )}
    </>
  );
}

function MemoryCard({ item }: { item: Card }) {
  const dateLabel = item.date.replaceAll('-', '.');
  const weekday = `(${item.weekday.slice(0, 1)})`; // (금)

  const onEdit = () => {
    router.push(`/today/${item.memory_id}`);
  };

  const MAX_IMAGES_SHOWN = 4;
  const images = item.images;
  const remain = Math.max(0, images.length - MAX_IMAGES_SHOWN);
  const displayImages = images.slice(0, MAX_IMAGES_SHOWN);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
          <Text style={styles.cardDate}>{dateLabel}</Text>
          <Text style={styles.cardWeekday}>{weekday}</Text>
        </View>
      </View>

      <View style={styles.imageRowContainer}>
        {displayImages.map((uri, index) => (
          <View key={index} style={styles.thumbBox}>
            <Image source={{ uri }} style={styles.thumbImg} />
            {index === MAX_IMAGES_SHOWN - 1 && remain > 0 && (
              <View style={styles.moreOverlay}>
                <Text style={styles.moreText}>{`+${remain}`}</Text>
              </View>
            )}
          </View>
        ))}
        {/* 사진이 4장보다 적을 때 빈 공간을 채웁니다. */}
        {Array.from({ length: MAX_IMAGES_SHOWN - displayImages.length }).map((_, i) => <View key={`placeholder-${i}`} style={styles.thumbBox} />)}
        
        <Pressable onPress={onEdit} style={[styles.thumbBox, styles.editBtn]}>
          <Feather name="arrow-right" size={24} color="#5B8DEF" />
        </Pressable>
      </View>
    </View>
  );
}

function weekdayLabel(yyyy_mm_dd: string) {
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  const wd = new Date(y, m - 1, d).getDay();
  return ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'][wd];
}

/* ✅ [수정] 스타일 전체 */
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  monthHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 16,
    backgroundColor: '#fff'
  },
  monthHeaderText: {
    fontFamily: "Pretendard-Bold",
    fontSize: 16,
    //fontWeight: '700',
    color: '#1C1C1E'
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardDate: { 
    fontFamily: "Pretendard-Medium",
    fontSize: 16, 
    //fontWeight: '700', 
    color: '#111' 
  },
  cardWeekday: { 
    fontFamily: "Pretendard-Medium",
    fontSize: 16, 
    color: '#111', 
    //fontWeight: '500' 
  },

  imageRowContainer: {
    flexDirection: 'row',
    gap: 8, // 각 아이템 사이의 간격
  },
  thumbBox: {
    flex: 1, // 5개의 아이템이 너비를 동일하게 나누어 가짐
    aspectRatio: 1, // 정사각형 비율 유지
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F3F8', // 빈 공간 배경색
  },
  thumbImg: { width: '100%', height: '100%' },
  editBtn: {
    backgroundColor: "#EFF3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center", justifyContent: "center",
  },
  moreText: { 
    fontFamily: "Pretendard-Regular", 
    color: "#fff", 
    //fontWeight: "800", 
    fontSize: 16 },
  emptyWrap: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12 
  },
  emptyCircle: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#EFF3FF' 
  },
  emptyText: { 
    color: '#8E8E93', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  swipeDelete: { 
    width: 72, 
    height: '100%', 
    backgroundColor: '#D45A3E', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  Moments: { 
    fontFamily: "Pretendard-Bold",
    fontSize: 18, 
    //fontWeight: "700", 
    color: "#5B8DEF" },
  pendingPics: { 
    fontFamily: "Pretendard-Regular",
    fontSize: 12, 
    color: "#929292", 
    marginTop: 2 }
});