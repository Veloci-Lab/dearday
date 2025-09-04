// app/pending.tsx
import { useAuthStore } from "@/utils/authStore";
import { supabase } from '@/utils/supabase';
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

type MemoryRow = {
  memory_id: string;
  date: string;
};

type EntryRow = {
  memory_id: string;
  image_url: string | null;
  image_thumb_url: string | null;
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

  const fetchIncompleteMemories = useCallback(async () => {
    try {
      const { data: memories } = await supabase.from('memories').select('memory_id, date').eq('profile_id', profileId).eq('is_completed', false).order('date', { ascending: false });
      const list = (memories as MemoryRow[]) ?? [];
      if (list.length === 0) {
        setCards([]);
        return;
      }

      const memoryIds = list.map(m => m.memory_id);
      const { data: entries } = await supabase.from('memory_entries').select('memory_id, image_url, image_thumb_url').in('memory_id', memoryIds).not('image_url', 'is', null).order('entry_index', { ascending: true });

      const byMem = new Map<string, string[]>();
      (entries as EntryRow[] ?? []).forEach(e => {
        const imageUrl = e.image_thumb_url || e.image_url;
        if (!imageUrl) return;
        const arr = byMem.get(e.memory_id) ?? [];
        arr.push(imageUrl);
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
  }, [profileId]);

  useEffect(() => {
    navigation.setOptions({
      headerShadowVisible: false, // 그림자 제거
      // ✅ 헤더 자체의 스타일은 제거하거나 비워둡니다.
      headerStyle: {
        backgroundColor: '#fff',
      },
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
      headerRightContainerStyle: { paddingRight: 13 }, // 홈 화면과 동일한 여백
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      if(profileId) {
        fetchIncompleteMemories();
      }
    }, [profileId, fetchIncompleteMemories])
  );

  const monthOf = (d: string) => Number(d.slice(5, 7));

  async function confirmDelete(memory_id: string) {
    Alert.alert("삭제할까요?", "이 날짜의 미완성 기록과 모든 사진이 영구적으로 삭제됩니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제", style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.rpc('delete_memory_and_entries', {
              memory_id_to_delete: memory_id
            });
            if (error) throw error;
            setCards(prev => prev.filter(c => c.memory_id !== memory_id));
          } catch (error: any) {
            console.error("삭제 RPC 실패:", error);
            Alert.alert("삭제 실패", `데이터베이스에서 항목을 삭제하지 못했습니다.\n\n오류: ${error.message}`);
          }
        },
      },
    ]);
  }

  // ✅ 1. 모든 return 내용을 View로 감싸고 styles.container를 적용합니다.
  return (
    <View style={styles.container}>
      {loading ? ( <View style={styles.center}><Text>불러오는 중…</Text></View> )
      : cards.length === 0 ? ( <View style={styles.emptyWrap}>
          <Image 
            source={require('@/assets/images/empty_logo.png')} 
            style={{ width: 60, height: 45, resizeMode: 'contain' }} 
          />
          <Text style={styles.emptyText}>기록되지 않은 사진이 없어요!</Text>
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
    </View>
  );
}

// ... MemoryCard, weekdayLabel ... (이하 생략)
function MemoryCard({ item }: { item: Card }) {
  const dateLabel = item.date.replaceAll('-', '.');
  const weekday = `(${item.weekday.slice(0, 1)})`;

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
const styles = StyleSheet.create({
  // ✅ 2. container 스타일을 새로 추가하거나 수정합니다.
  container: {
    flex: 1,
    backgroundColor: "#fff", // 기본 배경색
    borderTopWidth: 2,
    borderTopColor: '#f2f2f2',
  },
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  monthHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 16,
    backgroundColor: '#fff'
  },
  monthHeaderText: {
    fontFamily: "Pretendard-Bold",
    fontSize: 16,
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
    color: '#111' 
  },
  cardWeekday: { 
    fontFamily: "Pretendard-Medium",
    fontSize: 16, 
    color: '#111', 
  },
  imageRowContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  thumbBox: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F3F8',
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
    fontSize: 16 },
  emptyWrap: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: "#FEFEFE"
  },
  emptyText: { 
    marginTop: 13,
    fontFamily: "Pretendard-Regular",
    color: '#0d0d0d', 
    fontSize: 15, 
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
    color: "#5B8DEF" },
  pendingPics: { 
    fontFamily: "Pretendard-Regular",
    fontSize: 12, 
    color: "#929292", 
    marginTop: -1 }
});