// components/PhotoGallery.tsx
import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import MasonryGrid from "@/components/masonry/MasonryGrid";
import { dailyUserSeed } from "@/components/masonry/seed";
import type { FeedItem } from "@/components/masonry/types";

export type HomePhoto = {
  id: string;
  categoryId?: string;
  category?: string;
  imageUrl: string;
  memo?: string;
  isRecorded: boolean;
  createdAt: string;
};

export default function PhotoGallery() {
  const router = useRouter();
  const { profileId } = useAuthStore();

  const [photos, setPhotos] = useState<HomePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supabase에서 사진 불러오기
  useEffect(() => {
    async function fetchPhotos() {
      if (!profileId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: photosError } = await supabase
          .from("photos")
          .select(
            `
            id,
            category_id,
            image_url,
            memo,
            created_at,
            categories (name)
          `
          )
          .eq("profile_id", profileId)
          .order("created_at", { ascending: false });

        if (photosError) throw photosError;

        const mappedPhotos: HomePhoto[] = (data || []).map((item: any) => ({
          id: item.id,
          categoryId: item.category_id,
          category: item.categories?.name,
          imageUrl: item.image_url,
          memo: item.memo,
          isRecorded: !!item.memo,
          createdAt: item.created_at,
        }));

        setPhotos(mappedPhotos);
      } catch (err) {
        console.error("Error fetching photos:", err);
        setError(
          err instanceof Error ? err.message : "사진을 불러오는데 실패했습니다."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchPhotos();
  }, [profileId]);

  // HomePhoto → FeedItem 변환
  const feedItems: FeedItem[] = useMemo(
    () =>
      photos.map((p) => ({
        id: p.id,
        imageUrl: p.imageUrl,
        dateISO: p.category || "", // 카테고리를 dateISO 자리에 표시
        place: p.isRecorded ? "기록" : "", // 기록 여부 표시
      })),
    [photos]
  );

  const handlePressItem = (item: FeedItem) => {
    router.push({ pathname: "/photo/[id]", params: { id: item.id } });
  };

  // 로딩 상태
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#5B8DEF" />
      </View>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ color: "#FF3B30", textAlign: "center" }}>{error}</Text>
      </View>
    );
  }

  // 사진이 없는 경우
  if (photos.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#8E8E93", fontSize: 16 }}>
          아직 사진이 없어요
        </Text>
      </View>
    );
  }

  return (
    <MasonryGrid
      items={feedItems}
      gap={6}
      padding={16}
      options={{
        seed: dailyUserSeed(profileId ?? "anon"),
        initialOrder: ["L1", "L2", "L3", "L4", "L5"],
        noConsecutive: true,
        allowed: ["L1", "L2", "L3", "L4", "L5"],
      }}
      onPressItem={handlePressItem}
      backgroundColor="#F3F5F7"
    />
  );
}
