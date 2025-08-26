// import { useAuthStore } from '@/utils/authStore';
// import { supabase } from '@/utils/supabase';
// import { Feather } from "@expo/vector-icons";
// import { router } from 'expo-router';
// import React, { useEffect, useMemo, useRef, useState } from 'react';
// import {
//   AppState,
//   Dimensions,
//   FlatList,
//   Image,
//   Pressable,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import { Calendar } from 'react-native-calendars';
// import { todayString } from 'react-native-calendars/src/expandableCalendar/commons';

// const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// const CAL_HEIGHT = SCREEN_HEIGHT * 0.45;

// type DayData = { memory_id: string; thumb?: string };
// type PhotoMap = Record<string, DayData>;
// type EntryRow = { memory_entry_id: string; image_url: string | null; entry_index: number };

// function monthRangeFromDateString(monthDateString: string) {
//   const [y, m] = monthDateString.split('-').map(Number);
//   const start = `${y}-${String(m).padStart(2, '0')}-01`;
//   const last = new Date(y, m, 0).getDate();
//   const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
//   return { start, end };
// }

// async function fetchMonthMap(start: string, end: string, profileId?: string): Promise<PhotoMap> {
//   let q = supabase.from('memories').select('memory_id, date, thumbnail_entry_id').eq('profile_id', profileId).eq('is_completed', true).gte('date', start).lte('date', end);
//   const { data: memories, error: memErr } = await q;
//   if (memErr) throw memErr;
//   if (!memories?.length) return {};
//   const ids = memories.map((m: any) => m.thumbnail_entry_id).filter(Boolean) as string[];
//   let entryMap = new Map<string, string | null>();
//   if (ids.length) {
//     const { data: entries } = await supabase.from('memory_entries').select('memory_entry_id, image_url').in('memory_entry_id', ids);
//     entryMap = new Map((entries ?? []).map((e: any) => [e.memory_entry_id, e.image_url]));
//   }
//   const map: PhotoMap = {};
//   for (const m of memories) {
//     map[m.date] = { memory_id: m.memory_id, thumb: m.thumbnail_entry_id ? entryMap.get(m.thumbnail_entry_id) ?? undefined : undefined };
//   }
//   return map;
// }

// async function fetchEntries(memoryId: string): Promise<EntryRow[]> {
//   const { data, error } = await supabase.from('memory_entries').select('memory_entry_id, image_url, entry_index').eq('memory_id', memoryId).eq('is_selected', true).order('entry_index', { ascending: true });
//   if (error) throw error;
//   return (data ?? []) as EntryRow[];
// }

// const getTodayLocal = () => {
//   const d = new Date();
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, '0');
//   const day = String(d.getDate()).padStart(2, '0');
//   return `${y}-${m}-${day}`;
// };

// export default function CalendarScreen() {
//   const profileId = useAuthStore((s) => s.profileId);
//   const [todayISO, setTodayISO] = useState(getTodayLocal());
//   const today = new Date();
//   const initialMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
//   const [currentMonth, setCurrentMonth] = useState(initialMonth);
//   const [monthMap, setMonthMap] = useState<PhotoMap>({});
//   const [selectedDate, setSelectedDate] = useState<string | null>(todayString);
//   const [entries, setEntries] = useState<EntryRow[]>([]);
//   const calRef = useRef<any>(null);

//   useEffect(() => {
//     if (profileId === undefined) return;
//     const { start, end } = monthRangeFromDateString(currentMonth);
//     (async () => {
//       const map = await fetchMonthMap(start, end, profileId ?? undefined);
//       setMonthMap(map);
//       const pick = map[todayISO] ? todayISO : Object.keys(map).sort()[0] ?? null;
//       if (pick) {
//         setSelectedDate(pick);
//         setEntries(await fetchEntries(map[pick].memory_id));
//       } else {
//         setSelectedDate(null);
//         setEntries([]);
//       }
//     })().catch(console.error);
//   }, [currentMonth, profileId, todayISO]);

//   useEffect(() => {
//     const sub = AppState.addEventListener('change', (state) => { if (state === 'active') setTodayISO(getTodayLocal()); });
//     const t = setInterval(() => { const now = getTodayLocal(); if (now !== todayISO) setTodayISO(now); }, 60 * 1000);
//     return () => { sub.remove(); clearInterval(t); };
//   }, [todayISO]);

//   const onSelectDay = async (ds: string) => {
//     setSelectedDate(ds);
//     const info = monthMap[ds];
//     if (info?.memory_id) setEntries(await fetchEntries(info.memory_id));
//     else setEntries([]);
//   };

//   const selectedDateLabel = useMemo(() => {
//     if (!selectedDate) return '';
//     const [y, m, d] = selectedDate.split('-');
//     return `${y}.${m}.${d}`;
//   }, [selectedDate]);

//   const selectedMemoryId = selectedDate ? monthMap[selectedDate]?.memory_id : undefined;
//   const hasPhotosForSelectedDate = useMemo(() => {
//     if (!selectedDate) return false;
//     return (entries ?? []).some(e => !!e.image_url) || !!monthMap[selectedDate]?.thumb;
//   }, [selectedDate, entries, monthMap]);

//   const goThisMonth = () => {
//     const now = new Date();
//     const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
//     calRef.current?.setDate(todayISO);
//     setCurrentMonth(thisMonth);
//     onSelectDay(todayISO);
//   };

//   const CAL_PAD_H = 16;
//   const H_GAP = 6;  // 가로 간격
//   const V_GAP = 0;  // 세로 간격
//   const totalGap = H_GAP * 6;
//   const cellWidth = (Dimensions.get('window').width - CAL_PAD_H * 2 - totalGap) / 7;
//   const RED = '#FF4D3D';

//   return (
//     <View style={{ flex: 1, backgroundColor: "#fff" }}>
//       {/* 달력을 View로 감싸고 높이 지정 */}
//       <View style={{ height: CAL_HEIGHT }}>
//         <Calendar
//           ref={calRef}
//           key={`cal-${currentMonth}`}
//           hideArrows
//           renderHeader={(date: any) => {
//             const [yy, mm] = currentMonth.split('-').map(Number);
//             const monthLabel = `${yy}년 ${mm}월`;

//             const goPrev = () => {
//               const d = new Date(currentMonth);
//               d.setMonth(d.getMonth() - 1);
//               const nextStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
//               setCurrentMonth(nextStr);
//             };
//             const goNext = () => {
//               const d = new Date(currentMonth);
//               d.setMonth(d.getMonth() + 1);
//               const nextStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
//               setCurrentMonth(nextStr);
//             };

//             return (
//               <View style={[styles.headerRow, { paddingHorizontal: CAL_PAD_H, alignSelf: 'stretch', width: '100%' }]}>
//                 <View style={styles.headerLeftGroup}>
//                   <TouchableOpacity onPress={goPrev} hitSlop={10}>
//                     <Feather name="chevron-left" size={22} color="#111" />
//                   </TouchableOpacity>
//                   <Text style={styles.monthLabel}>{monthLabel}</Text>
//                   <TouchableOpacity onPress={goNext} hitSlop={10}>
//                     <Feather name="chevron-right" size={22} color="#111" />
//                   </TouchableOpacity>
//                 </View>
//                 <TouchableOpacity onPress={goThisMonth} hitSlop={6}>
//                   <Image
//                     source={require("@/assets/images/icons/TODAY.png")}
//                     style={styles.todayIcon}
//                   />
//                 </TouchableOpacity>
//               </View>
//             );
//           }}
//           current={currentMonth}
//           enableSwipeMonths
//           onMonthChange={(m) => setCurrentMonth(m.dateString.slice(0, 7) + '-01')}
//           theme={{
//             textDayHeaderFontSize: 11,
//             textSectionTitleColor: '#8E8E93',
//             textDayHeaderFontFamily: 'Pretendard-SemiBold',
//             textMonthFontFamily: 'Pretendard-Bold',
//             textDayFontFamily: 'Pretendard-Regular',
//             'stylesheet.calendar.main': {
//                 week: {
//                   marginTop: 2,
//                   marginBottom: 2,
//                   flexDirection: 'row',
//                   justifyContent: 'space-around',
//                 },
//               },
//           }}
//           dayComponent={({ date, state, onPress }) => {
//             const ds = date.dateString;
//             const data = monthMap[ds];
//             const uri = data?.thumb;
//             const isSelected = ds === selectedDate;
//             const isToday = ds === todayISO;
//             const hasPhoto = !!uri;
//             const textStyle = [styles.dayNumber, hasPhoto ? styles.dayOnPhoto : styles.dayDefault, state === 'disabled' && styles.dayDisabled, isSelected && { color: RED }];
//             return (
//               <Pressable onPress={() => { onPress?.(date); onSelectDay(ds); }} style={{ paddingHorizontal: H_GAP / 2 }}>
//                 <View style={[{ width: cellWidth, height: cellWidth, borderRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' }, hasPhoto ? styles.bgHasPhoto : styles.bgNoPhoto, isSelected && { borderWidth: 2, borderColor: RED }]}>
//                   {hasPhoto && <Image source={{ uri }} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.75 }} />}
//                   {isToday && <View style={styles.todayDot} />}
//                   <View style={{ padding: 6 }}><Text style={textStyle}>{date.day}</Text></View>
//                 </View>
//               </Pressable>
//             );
//           }}
//         />
//       </View>
//       <View style={{ height: 1, backgroundColor: "#EFEFF0" }} />

//       <View style={{ flex: 1 }}>
//         <ScrollView>
//           {hasPhotosForSelectedDate && (
//             <View style={[styles.bottomHeader, { justifyContent: 'center' }]}>
//               <TouchableOpacity style={styles.dateChip} onPress={() => selectedMemoryId && router.push(`/day/${selectedMemoryId}`)}>
//                 <Text style={styles.dateChipText}>{selectedDateLabel}</Text>
//                 <Feather name="chevron-right" size={14} color="#3577FF" />
//               </TouchableOpacity>
//             </View>
//           )}
//           {selectedDate && (
//             <FlatList
//               data={entries.filter((e) => !!e.image_url)}
//               keyExtractor={(it) => it.memory_entry_id}
//               numColumns={3}
//               scrollEnabled={false}
//               columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
//               ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
//               contentContainerStyle={{ paddingVertical: 12, paddingBottom: 24 }}
//               renderItem={({ item }) => (
//                 <View style={{ flex: 1 }}>
//                   <View style={styles.gridItem}>
//                     <Image source={{ uri: item.image_url as string }} style={{ width: '100%', height: '100%' }} />
//                   </View>
//                 </View>
//               )}
//             />
//           )}
//         </ScrollView>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   headerRow: {
//     paddingTop: 6,
//     paddingBottom: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//   },
//   headerLeftGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
//   monthLabel: { 
//     fontFamily: 'Pretendard-Bold',
//     fontSize: 18, 
//     color: '#111' 
//   },
//   todayIcon: { // 아이콘 스타일 추가
//     width: 70,
//     height: 28,
//     resizeMode: 'contain',
//   },
//   bgHasPhoto: { backgroundColor: '#00000010' },
//   bgNoPhoto: { backgroundColor: 'transparent' },
//   dayNumber: { 
//     fontFamily: 'Pretendard-Regular',
//     fontSize: 14, 
//   },
//   dayDefault: { color: '#222' },
//   dayOnPhoto: { color: '#fff', textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
//   dayDisabled: { color: '#c9c9c9' },
//   todayDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D3D' },
//   bottomHeader: {
//     paddingHorizontal: 16,
//     paddingTop: 10,
//     paddingBottom: 6,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   dateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#EAF1FF', borderRadius: 16 },
//   dateChipText: { 
//     fontFamily: 'Pretendard-Bold',
//     color: '#3577FF', 
//   },
//   gridItem: { width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#EDEEF0' },
// });

// app/(tabs)/calendar.tsx
import { useAuthStore } from '@/utils/authStore';
import { supabase } from '@/utils/supabase';
import { Feather } from "@expo/vector-icons";
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { todayString } from 'react-native-calendars/src/expandableCalendar/commons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CAL_HEIGHT = SCREEN_HEIGHT * 0.45;

type DayData = { memory_id: string; thumb?: string };
type PhotoMap = Record<string, DayData>;
// ✅ 수정: EntryRow 타입에 image_thumb_url 추가
type EntryRow = { memory_entry_id: string; image_url: string | null; image_thumb_url: string | null; entry_index: number };
// ✅ 수정: 썸네일 맵에 사용될 타입 추가
type ThumbEntry = { image_url: string | null; image_thumb_url: string | null };

function monthRangeFromDateString(monthDateString: string) {
  const [y, m] = monthDateString.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { start, end };
}

async function fetchMonthMap(start: string, end: string, profileId?: string): Promise<PhotoMap> {
  let q = supabase.from('memories').select('memory_id, date, thumbnail_entry_id').eq('profile_id', profileId).eq('is_completed', true).gte('date', start).lte('date', end);
  const { data: memories, error: memErr } = await q;
  if (memErr) throw memErr;
  if (!memories?.length) return {};
  const ids = memories.map((m: any) => m.thumbnail_entry_id).filter(Boolean) as string[];
  
  // ✅ 수정: 썸네일 맵 타입 지정
  let entryMap = new Map<string, ThumbEntry>();
  if (ids.length) {
    // ✅ 수정: image_thumb_url 필드 추가
    const { data: entries } = await supabase.from('memory_entries').select('memory_entry_id, image_url, image_thumb_url').in('memory_entry_id', ids);
    entryMap = new Map((entries ?? []).map((e: any) => [e.memory_entry_id, { image_url: e.image_url, image_thumb_url: e.image_thumb_url }]));
  }
  
  const map: PhotoMap = {};
  for (const m of memories) {
    const entry = entryMap.get(m.thumbnail_entry_id);
    // ✅ 수정: 썸네일 URL 우선 사용
    map[m.date] = { memory_id: m.memory_id, thumb: m.thumbnail_entry_id ? (entry?.image_thumb_url || entry?.image_url) ?? undefined : undefined };
  }
  return map;
}

async function fetchEntries(memoryId: string): Promise<EntryRow[]> {
  // ✅ 수정: image_thumb_url 필드 추가
  const { data, error } = await supabase.from('memory_entries').select('memory_entry_id, image_url, image_thumb_url, entry_index').eq('memory_id', memoryId).eq('is_selected', true).order('entry_index', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EntryRow[];
}

const getTodayLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function CalendarScreen() {
  const profileId = useAuthStore((s) => s.profileId);
  const [todayISO, setTodayISO] = useState(getTodayLocal());
  const today = new Date();
  const initialMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [monthMap, setMonthMap] = useState<PhotoMap>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(todayString);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const calRef = useRef<any>(null);

  useEffect(() => {
    if (profileId === undefined) return;
    const { start, end } = monthRangeFromDateString(currentMonth);
    (async () => {
      const map = await fetchMonthMap(start, end, profileId ?? undefined);
      setMonthMap(map);
      const pick = map[todayISO] ? todayISO : Object.keys(map).sort()[0] ?? null;
      if (pick) {
        setSelectedDate(pick);
        setEntries(await fetchEntries(map[pick].memory_id));
      } else {
        setSelectedDate(null);
        setEntries([]);
      }
    })().catch(console.error);
  }, [currentMonth, profileId, todayISO]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') setTodayISO(getTodayLocal()); });
    const t = setInterval(() => { const now = getTodayLocal(); if (now !== todayISO) setTodayISO(now); }, 60 * 1000);
    return () => { sub.remove(); clearInterval(t); };
  }, [todayISO]);

  const onSelectDay = async (ds: string) => {
    setSelectedDate(ds);
    const info = monthMap[ds];
    if (info?.memory_id) setEntries(await fetchEntries(info.memory_id));
    else setEntries([]);
  };

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-');
    return `${y}.${m}.${d}`;
  }, [selectedDate]);

  const selectedMemoryId = selectedDate ? monthMap[selectedDate]?.memory_id : undefined;
  const hasPhotosForSelectedDate = useMemo(() => {
    if (!selectedDate) return false;
    return (entries ?? []).some(e => !!e.image_url) || !!monthMap[selectedDate]?.thumb;
  }, [selectedDate, entries, monthMap]);

  const goThisMonth = () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    calRef.current?.setDate(todayISO);
    setCurrentMonth(thisMonth);
    onSelectDay(todayISO);
  };

  const CAL_PAD_H = 16;
  const H_GAP = 6;
  const totalGap = H_GAP * 6;
  const cellWidth = (Dimensions.get('window').width - CAL_PAD_H * 2 - totalGap) / 7;
  const RED = '#FF4D3D';

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ height: CAL_HEIGHT }}>
        <Calendar
          ref={calRef}
          key={`cal-${currentMonth}`}
          hideArrows
          renderHeader={(date: any) => {
            const [yy, mm] = currentMonth.split('-').map(Number);
            const monthLabel = `${yy}년 ${mm}월`;

            const goPrev = () => {
              const d = new Date(currentMonth);
              d.setMonth(d.getMonth() - 1);
              const nextStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
              setCurrentMonth(nextStr);
            };
            const goNext = () => {
              const d = new Date(currentMonth);
              d.setMonth(d.getMonth() + 1);
              const nextStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
              setCurrentMonth(nextStr);
            };

            return (
              <View style={[styles.headerRow, { paddingHorizontal: CAL_PAD_H, alignSelf: 'stretch', width: '100%' }]}>
                <View style={styles.headerLeftGroup}>
                  <TouchableOpacity onPress={goPrev} hitSlop={10}>
                    <Feather name="chevron-left" size={22} color="#111" />
                  </TouchableOpacity>
                  <Text style={styles.monthLabel}>{monthLabel}</Text>
                  <TouchableOpacity onPress={goNext} hitSlop={10}>
                    <Feather name="chevron-right" size={22} color="#111" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={goThisMonth} hitSlop={6}>
                  <Image
                    source={require("@/assets/images/icons/TODAY.png")}
                    style={styles.todayIcon}
                  />
                </TouchableOpacity>
              </View>
            );
          }}
          current={currentMonth}
          enableSwipeMonths
          onMonthChange={(m) => setCurrentMonth(m.dateString.slice(0, 7) + '-01')}
          theme={{
            textDayHeaderFontSize: 11,
            textSectionTitleColor: '#8E8E93',
            textDayHeaderFontFamily: 'Pretendard-SemiBold',
            textMonthFontFamily: 'Pretendard-Bold',
            textDayFontFamily: 'Pretendard-Regular',
            'stylesheet.calendar.main': {
                week: {
                  marginTop: 2,
                  marginBottom: 2,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                },
              },
          }}
          dayComponent={({ date, state, onPress }) => {
            const ds = date.dateString;
            const data = monthMap[ds];
            const uri = data?.thumb;
            const isSelected = ds === selectedDate;
            const isToday = ds === todayISO;
            const hasPhoto = !!uri;
            const textStyle = [styles.dayNumber, hasPhoto ? styles.dayOnPhoto : styles.dayDefault, state === 'disabled' && styles.dayDisabled, isSelected && { color: RED }];
            return (
              <Pressable onPress={() => { onPress?.(date); onSelectDay(ds); }} style={{ paddingHorizontal: H_GAP / 2 }}>
                <View style={[{ width: cellWidth, height: cellWidth, borderRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' }, hasPhoto ? styles.bgHasPhoto : styles.bgNoPhoto, isSelected && { borderWidth: 2, borderColor: RED }]}>
                  {hasPhoto && <Image source={{ uri }} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.75 }} />}
                  {isToday && <View style={styles.todayDot} />}
                  <View style={{ padding: 6 }}><Text style={textStyle}>{date.day}</Text></View>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
      <View style={{ height: 1, backgroundColor: "#EFEFF0" }} />

      <View style={{ flex: 1 }}>
        <ScrollView>
          {hasPhotosForSelectedDate && (
            <View style={[styles.bottomHeader, { justifyContent: 'center' }]}>
              <TouchableOpacity style={styles.dateChip} onPress={() => selectedMemoryId && router.push(`/day/${selectedMemoryId}`)}>
                <Text style={styles.dateChipText}>{selectedDateLabel}</Text>
                <Feather name="chevron-right" size={14} color="#3577FF" />
              </TouchableOpacity>
            </View>
          )}
          {selectedDate && (
            <FlatList
              data={entries.filter((e) => !!e.image_url)}
              keyExtractor={(it) => it.memory_entry_id}
              numColumns={3}
              scrollEnabled={false}
              columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              contentContainerStyle={{ paddingVertical: 12, paddingBottom: 24 }}
              renderItem={({ item }) => (
                <View style={{ flex: 1 }}>
                  <View style={styles.gridItem}>
                    {/* ✅ 수정: 썸네일 URL 우선 사용 */}
                    <Image source={{ uri: (item.image_thumb_url || item.image_url) as string }} style={{ width: '100%', height: '100%' }} />
                  </View>
                </View>
              )}
            />
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeftGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthLabel: { 
    fontFamily: 'Pretendard-Bold',
    fontSize: 18, 
    color: '#111' 
  },
  todayIcon: {
    width: 70,
    height: 28,
    resizeMode: 'contain',
  },
  bgHasPhoto: { backgroundColor: '#00000010' },
  bgNoPhoto: { backgroundColor: 'transparent' },
  dayNumber: { 
    fontFamily: 'Pretendard-Regular',
    fontSize: 14, 
  },
  dayDefault: { color: '#222' },
  dayOnPhoto: { color: '#fff', textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  dayDisabled: { color: '#c9c9c9' },
  todayDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D3D' },
  bottomHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#EAF1FF', borderRadius: 16 },
  dateChipText: { 
    fontFamily: 'Pretendard-Bold',
    color: '#3577FF', 
  },
  gridItem: { width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#EDEEF0' },
});