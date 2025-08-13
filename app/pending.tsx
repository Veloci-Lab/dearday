// IncompleteMemoriesScreen.tsx
import { useAuthStore } from "@/utils/authStore";
import { supabase } from '@/utils/supabase';
import { Feather } from "@expo/vector-icons";
import { router, useNavigation } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

type MemoryRow = {
  memory_id: string;
  date: string; // YYYY-MM-DD
};

type EntryRow = {
  memory_entry_id: string;
  memory_id: string;
  image_url: string | null;
  entry_index: number;
};

type Card = {
  memory_id: string;
  date: string;      // YYYY-MM-DD
  weekday: string;   // 화요일
  images: string[];  // 썸네일들
};

export default function IncompleteMemoriesScreen() {
  const navigation = useNavigation();

  const { profileId } = useAuthStore();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  // 썸네일 너비 계산: 3.5장 보이기
  const { itemSize, gap, pad } = useMemo(() => {
    const screenW = Dimensions.get('window').width;
    const pad = 16;
    const gap = 8;
    const visible = 3.5;
    const itemSize = (screenW - pad * 2 - gap * (visible - 1)) / visible;
    return { itemSize, gap, pad };
  }, []);

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
      headerTitle: ""
    });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // 1) 미완료 메모리 목록
        let memQ = supabase
          .from('memories')
          .select('memory_id, date')
          .eq('profile_id', profileId)
          .eq('is_completed', false)
          .order('date', { ascending: false });

        const { data: memories, error: memErr } = await memQ as unknown as {
          data: MemoryRow[] | null; error: any
        };
        if (memErr) throw memErr;
        const list = memories ?? [];

        if (list.length === 0) {
          setCards([]);
          return;
        }

        // 2) 해당 메모리들의 이미지 엔트리
        const memoryIds = list.map(m => m.memory_id);
        const { data: entries, error: entErr } = await supabase
          .from('memory_entries')
          .select('memory_entry_id, memory_id, image_url, entry_index')
          .in('memory_id', memoryIds)
          .not('image_url', 'is', null)
          .order('memory_id', { ascending: true })
          .order('entry_index', { ascending: true }) as unknown as {
            data: EntryRow[] | null; error: any
          };
        if (entErr) throw entErr;

        // 3) 메모리별로 묶기
        const byMem = new Map<string, string[]>();
        (entries ?? []).forEach(e => {
          if (!e.image_url) return;
          const arr = byMem.get(e.memory_id) ?? [];
          arr.push(e.image_url);
          byMem.set(e.memory_id, arr);
        });

        const cards: Card[] = list.map(m => ({
          memory_id: m.memory_id,
          date: m.date,
          weekday: weekdayLabel(m.date),
          images: byMem.get(m.memory_id) ?? [],
        }));

        setCards(cards);
      } catch (e) {
        console.error('load incomplete memories error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profileId]);

  return (
    <>
      {loading ? (
        <View style={styles.center}>
          <Text>불러오는 중…</Text>
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.center}>
          <Text>기록 안 된 항목이 없어요.</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(c) => c.memory_id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <MemoryCard item={item} itemSize={itemSize} gap={gap} pad={pad} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </>
  );
}

/* ---------- 카드 컴포넌트 ---------- */
function MemoryCard({ item, itemSize, gap, pad }: { item: Card; itemSize: number; gap: number; pad: number }) {
  const dateLabel = `${item.date.replaceAll('-', '.')} ${item.weekday}`;

  const onCompose = () => {
    router.push(`/today/${item.memory_id}`);
  };

  const images = item.images;
  const display = images.length > 0 ? images : new Array(4).fill(null);

  return (
    <View style={styles.card}>
      {/* 헤더 */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{dateLabel}</Text>
        <Pressable onPress={onCompose} style={styles.cta}>
          <Text style={styles.ctaText}>지금 작성하기</Text>
        </Pressable>
      </View>

      {/* 썸네일 */}
      <FlatList
        data={display}
        keyExtractor={(_, idx) => String(idx)}
        horizontal
        showsHorizontalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ width: gap }} />}
        contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 12 }}
        renderItem={({ item: uri }) => (
          <View style={{ width: itemSize }}>
            <View style={styles.thumbBox}>
              {uri ? (
                <Image source={{ uri }} style={styles.thumbImg} />
              ) : (
                <View style={styles.placeholder} />
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

/* ---------- 유틸 ---------- */
function weekdayLabel(yyyy_mm_dd: string) {
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  const wd = new Date(y, m - 1, d).getDay();
  return ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'][wd];
}

/* ---------- 스타일 ---------- */
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  cardHeader: {
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardDate: { fontSize: 16, fontWeight: '700' },

  cta: {
    backgroundColor: '#F2F4F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  ctaText: { fontSize: 12, color: '#333', fontWeight: '600' },

  thumbBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  thumbImg: { width: '100%', height: '100%' },
  placeholder: { flex: 1, backgroundColor: '#E7E9ED' },
});
