import { useAuthStore } from "@/utils/authStore";
import { supabase } from "@/utils/supabase";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Photo = {
  id: string;
  image_url: string;
  created_at: string;
  memo?: string;
};

type GroupedPhotos = {
  [monthKey: string]: Photo[];
};

export default function RecordScreen() {
  // 테스트용: profileId 하드코딩
  const TEST_MODE = true;
  const TEST_PROFILE_ID = "102";
  
  const storeProfileId = useAuthStore((state) => state.profileId);
  const profileId = TEST_MODE ? TEST_PROFILE_ID : storeProfileId;
  
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const { width: screenWidth } = Dimensions.get("window");

  // 그리드 계산 (4열)
  const HORIZONTAL_PADDING = 13;
  const GAP = 5;
  const COLUMNS = 4;
  const itemWidth = (screenWidth - HORIZONTAL_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      console.log("Fetching photos for profile:", profileId);

      const { data, error } = await supabase
        .from("photos")
        .select("id, image_url, created_at, memo")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      
      console.log("Fetched photos:", data?.length);
      setPhotos(data || []);
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setLoading(false);
    }
  };

  // 월별 그룹화
  const groupPhotosByMonth = (): GroupedPhotos => {
    const grouped: GroupedPhotos = {};

    photos.forEach((photo) => {
      const date = new Date(photo.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(photo);
    });

    return grouped;
  };

  // 월 이름 변환
  const getMonthName = (monthKey: string): string => {
    const [year, month] = monthKey.split("-");
    const monthNames = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];
    return monthNames[parseInt(month) - 1];
  };

  const groupedPhotos = groupPhotosByMonth();
  const sortedMonths = Object.keys(groupedPhotos).sort().reverse();

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5B8DEF" />
        <Text style={{ marginTop: 10 }}>Loading photos for profile {profileId}...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>my dearday</Text>
        </View>

        {/* 디버그 정보 */}
        {/* {TEST_MODE && (
          <View style={{ padding: 13, backgroundColor: "#FFF3CD" }}>
            <Text style={{ fontSize: 12 }}>
              🧪 TEST MODE - Profile ID: {profileId} - Photos: {photos.length}
            </Text>
          </View>
        )} */}

        {/* 월별 사진 그리드 */}
        {sortedMonths.map((monthKey) => (
          <View key={monthKey} style={styles.monthSection}>
            <Text style={styles.monthTitle}>{getMonthName(monthKey)}</Text>
            <View style={styles.grid}>
              {groupedPhotos[monthKey].map((photo) => (
                <Pressable
                  key={photo.id}
                  style={[styles.photoCard, { width: itemWidth, height: itemWidth }]}
                  onPress={() => {
                    console.log("Photo pressed:", photo.id);
                  }}
                >
                  <Image
                    source={{ uri: photo.image_url }}
                    style={styles.photoImage}
                  />
                  {photo.memo && (
                    <View style={styles.memoIcon}>
                      <Text style={styles.memoIconText}>📝</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {photos.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>아직 사진이 없습니다</Text>
            <Text style={styles.emptySubText}>
              DearDay에 사진을 추가해보세요!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  header: {
    height: 62,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Pretendard-Bold",
    color: "#0D0D0D",
  },
  monthSection: {
    marginBottom: 24,
    paddingHorizontal: 13,
  },
  monthTitle: {
    color: "#0D0D0D",
    fontFamily: "Pretendard-Bold",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 20,
    letterSpacing: -0.51,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  photoCard: {
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  memoIcon: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 8,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  memoIconText: {
    fontSize: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Pretendard-SemiBold",
    color: "#666",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    fontFamily: "Pretendard-Regular",
    color: "#999",
  },
});