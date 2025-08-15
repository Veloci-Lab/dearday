// // CalendarWithEntries.horizontal.tsx
// import { useAuthStore } from '@/utils/authStore';
// import { supabase } from '@/utils/supabase';
// import { Feather } from "@expo/vector-icons";
// import { router } from 'expo-router';
// import React, { useEffect, useMemo, useState } from 'react';
// import {
//   Dimensions,
//   FlatList,
//   Pressable,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import { Calendar, DateObject } from 'react-native-calendars';
// import { todayString } from 'react-native-calendars/src/expandableCalendar/commons';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

// type DayData = { memory_id: string; thumb?: string };
// type PhotoMap = Record<string, DayData>;
// type EntryRow = { memory_entry_id: string; image_url: string | null; entry_index: number };

// // 월 시작/끝 (onMonthChange의 'YYYY-MM-01' 사용)
// function monthRangeFromDateString(monthDateString: string) {
//   const [y, m] = monthDateString.split('-').map(Number);
//   const start = `${y}-${String(m).padStart(2, '0')}-01`;
//   const last = new Date(y, m, 0).getDate();
//   const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
//   return { start, end };
// }

// // 해당 월: 유저의 memories + 썸네일 맵
// async function fetchMonthMap(start: string, end: string, profileId?: string): Promise<PhotoMap> {
//   let q = supabase
//     .from('memories')
//     .select('memory_id, date, thumbnail_entry_id')
//     .eq('profile_id', profileId)
//     .eq('is_completed', true)
//     .gte('date', start)
//     .lte('date', end);

//   const { data: memories, error: memErr } = await q;
//   if (memErr) throw memErr;
//   if (!memories?.length) return {};

//   const ids = memories.map((m: any) => m.thumbnail_entry_id).filter(Boolean) as string[];
//   let entryMap = new Map<string, string | null>();
//   if (ids.length) {
//     const { data: entries } = await supabase
//       .from('memory_entries')
//       .select('memory_entry_id, image_url')
//       .in('memory_entry_id', ids);
//     entryMap = new Map((entries ?? []).map((e: any) => [e.memory_entry_id, e.image_url]));
//   }

//   const map: PhotoMap = {};
//   for (const m of memories) {
//     map[m.date] = {
//       memory_id: m.memory_id,
//       thumb: m.thumbnail_entry_id ? entryMap.get(m.thumbnail_entry_id) ?? undefined : undefined,
//     };
//   }
//   return map;
// }

// // 특정 memory의 모든 entries
// async function fetchEntries(memoryId: string): Promise<EntryRow[]> {
//   const { data, error } = await supabase
//     .from('memory_entries')
//     .select('memory_entry_id, image_url, entry_index')
//     .eq('memory_id', memoryId)
//     .eq('is_selected', true)
//     .order('entry_index', { ascending: true });
//   if (error) throw error;
//   return (data ?? []) as EntryRow[];
// }

// export default function CalendarScreen() {
//   const profileId = useAuthStore((s) => s.profileId);
//   const insets = useSafeAreaInsets();
//   const today = new Date();
//   const initialMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

//   const [currentMonth, setCurrentMonth] = useState(initialMonth);
//   const [monthMap, setMonthMap] = useState<PhotoMap>({});
//   const [loading, setLoading] = useState(true);
//   const [selectedDate, setSelectedDate] = useState<string | null>(todayString);
//   const [entries, setEntries] = useState<EntryRow[]>([]);
//   const [entriesLoading, setEntriesLoading] = useState(false);

//   // selectedDate, entries, monthMap가 이미 있음
//   const hasPhotosForSelectedDate = useMemo(() => {
//     if (!selectedDate) return false;

//     // 1) entries에 이미지가 하나라도 있으면 true
//     const hasInEntries = (entries ?? []).some(e => !!e.image_url);
//     if (hasInEntries) return true;

//     // 2) fallback: monthMap의 썸네일 신호
//     return !!monthMap[selectedDate]?.thumb;
//   }, [selectedDate, entries, monthMap]);


//   // 가로 리스트: 3.5장 보이도록 계산
//   const { itemSize, gap, pad } = useMemo(() => {
//     const screenW = Dimensions.get('window').width;
//     const pad = 16;
//     const gap = 8;
//     const visible = 3.5;
//     const itemSize = (screenW - pad * 2 - gap * (visible - 1)) / visible;
//     return { itemSize, gap, pad };
//   }, []);

//   // 월 변경 → 월 데이터 로드
//   useEffect(() => {
//     // profileId가 아직 없으면 스킵 (세션 로딩 중)
//     if (profileId === undefined) return;

//     const { start, end } = monthRangeFromDateString(currentMonth);
//     (async () => {
//       const map = await fetchMonthMap(start, end, profileId ?? undefined);
//       setMonthMap(map);

//       const todayStr = new Date().toISOString().slice(0, 10);
//       const pick = map[todayStr] ? todayStr : Object.keys(map).sort()[0] ?? null;
//       if (pick) {
//         setSelectedDate(pick);
//         setEntries(await fetchEntries(map[pick].memory_id));
//       } else {
//         setSelectedDate(null);
//         setEntries([]);
//       }
//     })().catch(console.error);
//   }, [currentMonth, profileId]);

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

//   return (
//     <View style={{ flex: 1, backgroundColor: "#fff" }}>
//       <Calendar
//         style={{paddingVertical: 16}}
//         renderHeader={(date) => {
//           const monthLabel = date.toString('yyyy년 M월');

//           // 이전 달로 이동하는 함수
//           const goToPreviousMonth = () => {
//             const newDate = new Date(date);
//             newDate.setMonth(newDate.getMonth() - 1);
//             setCurrentMonth(newDate.toISOString().slice(0, 10));
//           };
          
//           // 다음 달로 이동하는 함수
//           const goToNextMonth = () => {
//             const newDate = new Date(date);
//             newDate.setMonth(newDate.getMonth() + 1);
//             setCurrentMonth(newDate.toISOString().slice(0, 10));
//           };

//           return (
//             // 이 View가 모든 요소를 감싸고 정렬을 제어합니다.
//             <View style={styles.calendarHeaderContainer}>
//               <TouchableOpacity onPress={goToPreviousMonth} hitSlop={10}>
//                 <Feather name="chevron-left" size={24} color="#5B8DEF" />
//               </TouchableOpacity>
//               <Text style={styles.monthLabel}>{monthLabel}</Text>
//               <TouchableOpacity onPress={goToNextMonth} hitSlop={10}>
//                 <Feather name="chevron-right" size={24} color="#5B8DEF" />
//               </TouchableOpacity>
//             </View>
//           );
//         }}
//         current={currentMonth}
//         enableSwipeMonths
//         onMonthChange={(m) => setCurrentMonth(m.dateString)}
//         dayComponent={({ date, state, onPress }: { date: DateObject; state: '' | 'disabled' | 'today'; onPress?: (d: DateObject) => void; }) => {
//           const ds = date.dateString;
//           const data = monthMap[ds];
//           const uri = data?.thumb;
//           const disabled = state === 'disabled';
//           const isSelected = ds === selectedDate;

//           // 화면 폭을 7등분 → 한 칸 크기
//           // const cellWidth = Dimensions.get('window').width / 7;
//           // const THUMB = cellWidth; // 셀을 이미지로 꽉 채움

//           const gap = 4; // 칸 사이 간격
//           const totalGap = gap * 6; // 7칸이면 사이가 6개
//           const cellWidth = (Dimensions.get('window').width - totalGap) / 7;
//           const THUMB = cellWidth;
//           const RADIUS = 8;

//           return (
//             <Pressable onPress={() => { onPress?.(date); onSelectDay(ds); }} style={styles.cell}>
//               {uri ? (
//                 <Image source={{ uri }} style={[{ width: THUMB, height: THUMB, borderRadius: RADIUS }, styles.shadow]} />
//               ) : (
//                 <View style={{ width: THUMB, height: THUMB, borderRadius: RADIUS }} />
//               )}
//               <View style={styles.dayNumberWrap}>
//                 <Text style={[styles.dayNumber, uri && styles.dayNumberOnImage, disabled && styles.dayDisabled]}>
//                   {date.day}
//                 </Text>
//               </View>
//               {isSelected && <View style={styles.selectedRing} />}
//             </Pressable>
//           );
//         }}
//         // theme={{
//         //   textMonthFontSize: 20,
//         //   textDayHeaderFontSize: 12,
//         //   todayTextColor: '#3b82f6',
//         // }}
//       />
//       <View style={{ height: 1, backgroundColor: "#F2F2F2" }} />

//       <View>
//         {/* 하단 헤더: 날짜 + 상세보기 버튼 */}
//         {hasPhotosForSelectedDate && (
//           <View style={[styles.bar, { paddingHorizontal: pad }]}>
//             <Text style={styles.dateTitle}>{selectedDateLabel}</Text>
//             {selectedMemoryId && (
//               <Pressable onPress={() => router.push(`/day/${selectedMemoryId}`)} hitSlop={8}>
//                 <Feather name="chevron-right" size={20} color="black" />
//               </Pressable>
//             )}
//           </View>
//         )}
//         {/* 가로 스크롤: 3.5장 보이기 */}
//         {selectedDate && (
//           <FlatList
//             data={entries.filter((e) => !!e.image_url)}
//             keyExtractor={(it) => it.memory_entry_id}
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             ItemSeparatorComponent={() => <View style={{ width: gap }} />}
//             contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 24 }}
//             renderItem={({ item }) => (
//               <View style={{ width: itemSize }}>
//                 <View style={{ width: '100%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden' }}>
//                   <Image source={{ uri: item.image_url as string }} style={{ width: '100%', height: '100%' }} />
//                 </View>
//               </View>
//             )}
//           />
//         )}
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   cell: {
//     paddingVertical: 6,
//     alignItems: 'center',
//     justifyContent: 'center',
//     position: 'relative',
//   },
//   dayNumberWrap: { position: 'absolute', left: 6, bottom: 4 },
//   dayNumber: { fontSize: 14, fontWeight: '600', color: '#222' },
//   dayNumberOnImage: {
//     color: '#fff',
//     textShadowColor: 'rgba(0,0,0,0.45)',
//     textShadowOffset: { width: 0, height: 1 },
//     textShadowRadius: 2,
//   },
//   dayDisabled: { color: '#c9c9c9' },
//   selectedRing: {
//     // position: 'absolute',
//     // width: 44,
//     // height: 44,
//     // borderRadius: 22,
//     // borderWidth: 2,
//     // borderColor: '#3b82f6',
//   },
//   bar: {
//     marginTop: 8,
//     marginBottom: 8,
//     flexDirection: 'row',
//     gap: 8,
//     alignItems: 'center',
//     // justifyContent: 'space-between',
//   },
//   dateTitle: { fontSize: 24, fontWeight: '700' },
//   link: { fontSize: 14, color: '#3b82f6', fontWeight: '600' },
//   shadow: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
// });

// CalendarWithEntries.horizontal.tsx
import { useAuthStore } from '@/utils/authStore';
import { supabase } from '@/utils/supabase';
import { Feather } from "@expo/vector-icons";
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateObject } from 'react-native-calendars';
import { todayString } from 'react-native-calendars/src/expandableCalendar/commons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DayData = { memory_id: string; thumb?: string };
type PhotoMap = Record<string, DayData>;
type EntryRow = { memory_entry_id: string; image_url: string | null; entry_index: number };

// 월 시작/끝 (onMonthChange의 'YYYY-MM-01' 사용)
function monthRangeFromDateString(monthDateString: string) {
  const [y, m] = monthDateString.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { start, end };
}

// 해당 월: 유저의 memories + 썸네일 맵
async function fetchMonthMap(start: string, end: string, profileId?: string): Promise<PhotoMap> {
  let q = supabase
    .from('memories')
    .select('memory_id, date, thumbnail_entry_id')
    .eq('profile_id', profileId)
    .eq('is_completed', true)
    .gte('date', start)
    .lte('date', end);

  const { data: memories, error: memErr } = await q;
  if (memErr) throw memErr;
  if (!memories?.length) return {};

  const ids = memories.map((m: any) => m.thumbnail_entry_id).filter(Boolean) as string[];
  let entryMap = new Map<string, string | null>();
  if (ids.length) {
    const { data: entries } = await supabase
      .from('memory_entries')
      .select('memory_entry_id, image_url')
      .in('memory_entry_id', ids);
    entryMap = new Map((entries ?? []).map((e: any) => [e.memory_entry_id, e.image_url]));
  }

  const map: PhotoMap = {};
  for (const m of memories) {
    map[m.date] = {
      memory_id: m.memory_id,
      thumb: m.thumbnail_entry_id ? entryMap.get(m.thumbnail_entry_id) ?? undefined : undefined,
    };
  }
  return map;
}

// 특정 memory의 모든 entries
async function fetchEntries(memoryId: string): Promise<EntryRow[]> {
  const { data, error } = await supabase
    .from('memory_entries')
    .select('memory_entry_id, image_url, entry_index')
    .eq('memory_id', memoryId)
    .eq('is_selected', true)
    .order('entry_index', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EntryRow[];
}

export default function CalendarScreen() {
  const profileId = useAuthStore((s) => s.profileId);
  const insets = useSafeAreaInsets();
  const todayISO = new Date().toISOString().slice(0, 10);

  const today = new Date();
  const initialMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [monthMap, setMonthMap] = useState<PhotoMap>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(todayString);
  const [entries, setEntries] = useState<EntryRow[]>([]);

  // 월 변경 → 월 데이터 로드
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
  }, [currentMonth, profileId]);

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
    const hasInEntries = (entries ?? []).some(e => !!e.image_url);
    if (hasInEntries) return true;
    return !!monthMap[selectedDate]?.thumb;
  }, [selectedDate, entries, monthMap]);

  const goThisMonth = () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    setCurrentMonth(thisMonth);
    setSelectedDate(todayISO);
    const m = monthMap[todayISO];
    if (m?.memory_id) fetchEntries(m.memory_id).then(setEntries).catch(()=>{});
  };

  // 캘린더 셀 크기(패딩/간격 고려)
  const CAL_PAD_H = 16; // Calendar style의 paddingHorizontal 값과 동일
  const GAP = 6;
  const totalGap = GAP * 6;
  const cellWidth = (Dimensions.get('window').width - CAL_PAD_H * 2 - totalGap) / 7;

  // 테마 색
  const RED = '#FF4D3D';

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Calendar
        style={{ paddingVertical: 8, paddingHorizontal: CAL_PAD_H }}
        renderHeader={(date: any) => {
          const monthLabel = date.toString('yyyy년 M월');

          // XDate API 사용 (← 달 전환 안 되던 문제 해결)
          const goPrev = () => {
            const prev = date.clone().addMonths(-1, true);
            setCurrentMonth(prev.toString('yyyy-MM-01'));
          };
          const goNext = () => {
            const next = date.clone().addMonths(1, true);
            setCurrentMonth(next.toString('yyyy-MM-01'));
          };

          return (
            <View style={styles.headerRow}>
              {/* 왼쪽: 〈 월 〉 묶음 */}
              <View style={styles.headerLeftGroup}>
                <TouchableOpacity onPress={goPrev} hitSlop={10}>
                  <Feather name="chevron-left" size={22} color="#111" />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{monthLabel}</Text>
                <TouchableOpacity onPress={goNext} hitSlop={10}>
                  <Feather name="chevron-right" size={22} color="#111" />
                </TouchableOpacity>
              </View>

              {/* 오른쪽: TODAY */}
              <TouchableOpacity onPress={goThisMonth} style={styles.todayPill} hitSlop={6}>
                <Text style={styles.todayPillText}>TODAY</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        current={currentMonth}
        enableSwipeMonths
        onMonthChange={(m) => setCurrentMonth(m.dateString)}
        theme={{
          textDayHeaderFontSize: 11,
          textSectionTitleColor: '#8E8E93',
        }}
        dayComponent={({
          date,
          state,
          onPress,
        }: {
          date: DateObject;
          state: '' | 'disabled' | 'today';
          onPress?: (d: DateObject) => void;
        }) => {
          const ds = date.dateString;
          const data = monthMap[ds];
          const uri = data?.thumb;
          const disabled = state === 'disabled';
          const isSelected = ds === selectedDate;
          const isToday = ds === todayISO;
          const hasPhoto = !!uri;

          // 텍스트 색 결정
          const baseText = hasPhoto ? styles.dayOnPhoto : styles.dayDefault;
          const textStyle = [
            styles.dayNumber,
            baseText,
            disabled && styles.dayDisabled,
            isSelected && { color: RED }, // 선택 시 붉은 숫자
          ];

          return (
            <Pressable
              onPress={() => { onPress?.(date); onSelectDay(ds); }}
              style={{ paddingVertical: 6, paddingHorizontal: GAP / 2 }}
            >
              <View
                style={[
                  { width: cellWidth, height: cellWidth, borderRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' },
                  // 사진 유무에 따른 배경
                  hasPhoto ? styles.bgHasPhoto : styles.bgNoPhoto,
                  // 선택 시 붉은 테두리
                  isSelected && { borderWidth: 2, borderColor: RED, backgroundColor: 'transparent' },
                ]}
              >
                {/* 사진 배경 (반투명) */}
                {hasPhoto && (
                  <Image
                    source={{ uri }}
                    style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.82 }}
                  />
                )}

                {/* 오늘 마커(작은 원) */}
                {isToday && <View style={styles.todayDot} />}

                {/* 날짜 숫자 */}
                <View style={{ padding: 6 }}>
                  <Text style={textStyle}>{date.day}</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <View style={{ height: 1, backgroundColor: "#EFEFF0" }} />

      {/* 하단: 날짜 캡슐 + 3열 그리드(첫 목업 스타일) */}
      <View>
        {hasPhotosForSelectedDate && (
          <View style={styles.bottomHeader}>
            <View style={styles.dateChip}>
              <Text style={styles.dateChipText}>{selectedDateLabel}</Text>
              <Feather name="chevron-right" size={14} color="#3577FF" />
            </View>
            {selectedMemoryId && (
              <Pressable onPress={() => router.push(`/day/${selectedMemoryId}`)} hitSlop={8}>
                <Text style={styles.link}>상세보기</Text>
              </Pressable>
            )}
          </View>
        )}

        {selectedDate && (
          <FlatList
            data={entries.filter((e) => !!e.image_url)}
            keyExtractor={(it) => it.memory_entry_id}
            numColumns={3}
            columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ paddingVertical: 12, paddingBottom: 24 }}
            renderItem={({ item }) => (
              <View style={{ flex: 1 }}>
                <View style={styles.gridItem}>
                  <Image source={{ uri: item.image_url as string }} style={{ width: '100%', height: '100%' }} />
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Header */
  headerRow: {
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // 왼쪽 묶음 / 오른쪽 TODAY 분리
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthLabel: { fontSize: 18, fontWeight: '700', color: '#111' },
  todayPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F2F5FF',
  },
  todayPillText: { color: '#3577FF', fontSize: 12, fontWeight: '700' },

  /* Day tile backgrounds */
  bgHasPhoto: { backgroundColor: '#00000010' }, // 사진 있을 때: 배경 투명(이미지 깔림)
  bgNoPhoto: { backgroundColor: 'transparent' }, // 사진 없을 때: 배경 없음

  /* Day number colors */
  dayNumber: { fontSize: 14, fontWeight: '700' },
  dayDefault: { color: '#222' },                  // 사진 없음 기본
  dayOnPhoto: {
    color: '#fff',                                // 사진 있으면 흰색
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dayDisabled: { color: '#c9c9c9' },

  /* Today marker */
  todayDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B7BBC3',
  },

  /* Bottom */
  bottomHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EAF1FF',
    borderRadius: 16,
  },
  dateChipText: { color: '#3577FF', fontWeight: '800' },
  link: { fontSize: 14, color: '#111' },

  gridItem: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EDEEF0',
  },
});
