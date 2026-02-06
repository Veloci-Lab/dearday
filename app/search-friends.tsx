import { supabase } from "@/utils/supabase";
import { Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

/* ====== SVG 아이콘 ====== */
const SearchIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
      stroke="#A0A0A0"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19 19L14.65 14.65"
      stroke="#A0A0A0"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CloseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M15 5L5 15"
      stroke="#A0A0A0"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5 5L15 15"
      stroke="#A0A0A0"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/* ====== 타입 ====== */
interface SearchResult {
  profile_id: number;
  nickname: string;
  avatar_url: string | null;
}

type RequestStatus = "none" | "pending" | "accepted" | "sending";

/* ====== 친구 요청 확인 팝업 ====== */
function FriendRequestPopup({
  visible,
  profile,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  profile: SearchResult | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!profile) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.popupOverlay} onPress={onCancel}>
        <Pressable style={styles.popupContainer} onPress={() => {}}>
          {/* 프로필 카드 */}
          <View style={styles.popupProfileCard}>
            <View style={styles.popupAvatar}>
              {profile.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.popupAvatarImage}
                />
              ) : null}
            </View>
            <Text style={styles.popupProfileName}>{profile.nickname}</Text>
          </View>

          {/* 텍스트 영역 */}
          <View style={styles.popupTextArea}>
            <Text style={styles.popupTitle}>친구 요청</Text>
            <Text style={styles.popupDescription}>
              {profile.nickname}님에게 친구 요청을 보낼까요?
            </Text>
          </View>

          {/* 버튼 영역 */}
          <View style={styles.popupButtonRow}>
            <Pressable style={styles.popupCancelButton} onPress={onCancel}>
              <Text style={styles.popupCancelButtonText}>취소</Text>
            </Pressable>
            <Pressable style={styles.popupConfirmButton} onPress={onConfirm}>
              <Text style={styles.popupConfirmButtonText}>친구 요청하기</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ====== 검색 결과 아이템 ====== */
function SearchResultItem({
  profile,
  status,
  onRequest,
}: {
  profile: SearchResult;
  status: RequestStatus;
  onRequest: (profile: SearchResult) => void;
}) {
  const isDisabled = status !== "none";

  const buttonStyle = isDisabled
    ? styles.statusButtonGray
    : styles.requestButton;
  const textStyle = isDisabled
    ? styles.statusButtonTextWhite
    : styles.requestButtonText;

  const label = (() => {
    switch (status) {
      case "accepted":
        return "친구";
      case "pending":
        return "친구 요청됨";
      case "sending":
        return "요청 중...";
      default:
        return "친구 요청";
    }
  })();

  return (
    <View style={styles.resultItem}>
      <View style={styles.resultInfo}>
        <View style={styles.avatarPlaceholder}>
          {profile.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatarImage}
            />
          ) : null}
        </View>
        <Text style={styles.resultName}>{profile.nickname}</Text>
      </View>
      <Pressable
        style={buttonStyle}
        onPress={() => onRequest(profile)}
        disabled={isDisabled}
      >
        <Text style={textStyle}>{label}</Text>
      </Pressable>
    </View>
  );
}

/* ====== 친구 찾기 화면 ====== */
export default function SearchFriendsScreen() {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [relationMap, setRelationMap] = useState<Record<number, RequestStatus>>(
    {},
  );
  const [isSearching, setIsSearching] = useState(false);
  const [myProfileId, setMyProfileId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 팝업 상태
  const [popupVisible, setPopupVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<SearchResult | null>(
    null,
  );

  /* ── 내 프로필 ID ── */
  useEffect(() => {
    const fetchMyProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("profile_id")
        .eq("uid", user.id)
        .single();

      if (data) setMyProfileId(data.profile_id);
    };
    fetchMyProfile();
  }, []);

  /* ── 자동 포커스 ── */
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  /* ── 검색 (디바운스 400ms) ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = searchText.trim();
    if (!query) {
      setResults([]);
      setRelationMap({});
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchProfiles(query);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText, myProfileId]);

  const searchProfiles = async (query: string) => {
    if (!myProfileId) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("profile_id, nickname, avatar_url")
        .ilike("nickname", `%${query}%`)
        .neq("profile_id", myProfileId)
        .eq("is_deleted", false)
        .limit(20);

      if (error || !data) {
        setResults([]);
        return;
      }

      setResults(data);

      const profileIds = data.map((p) => p.profile_id);
      if (profileIds.length === 0) {
        setRelationMap({});
        return;
      }

      // 내가 보낸 요청
      const { data: sentFollows } = await supabase
        .from("follows")
        .select("followee_profile_id, status")
        .eq("follower_profile_id", myProfileId)
        .in("followee_profile_id", profileIds);

      // 내가 받은 요청
      const { data: receivedFollows } = await supabase
        .from("follows")
        .select("follower_profile_id, status")
        .eq("followee_profile_id", myProfileId)
        .in("follower_profile_id", profileIds);

      const map: Record<number, RequestStatus> = {};

      sentFollows?.forEach((f: any) => {
        if (f.status === "accepted") {
          map[f.followee_profile_id] = "accepted";
        } else if (f.status === "pending") {
          map[f.followee_profile_id] = "pending";
        }
      });

      receivedFollows?.forEach((f: any) => {
        if (f.status === "accepted") {
          map[f.follower_profile_id] = "accepted";
        } else if (f.status === "pending" && !map[f.follower_profile_id]) {
          map[f.follower_profile_id] = "pending";
        }
      });

      setRelationMap(map);
    } catch (err) {
      console.error("검색 오류:", err);
    } finally {
      setIsSearching(false);
    }
  };

  /* ── 친구 요청 버튼 → 팝업 열기 ── */
  const handleRequestPress = (profile: SearchResult) => {
    setSelectedProfile(profile);
    setPopupVisible(true);
  };

  /* ── 팝업 확인 → 요청 보내기 ── */
  const handleConfirmRequest = async () => {
    if (!myProfileId || !selectedProfile) return;

    const targetId = selectedProfile.profile_id;
    setPopupVisible(false);
    setSelectedProfile(null);

    setRelationMap((prev) => ({ ...prev, [targetId]: "sending" }));

    const { error } = await supabase.from("follows").insert({
      follower_profile_id: myProfileId,
      followee_profile_id: targetId,
      status: "pending",
    });

    if (error) {
      setRelationMap((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
      Alert.alert("오류", "친구 요청에 실패했어요.");
    } else {
      setRelationMap((prev) => ({ ...prev, [targetId]: "pending" }));
    }
  };

  /* ── 팝업 취소 ── */
  const handleCancelPopup = () => {
    setPopupVisible(false);
    setSelectedProfile(null);
  };

  /* ── 검색어 초기화 ── */
  const handleClear = () => {
    setSearchText("");
    setResults([]);
    setRelationMap({});
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "친구 찾기" }} />
      {/* 검색바 */}
      <View style={styles.searchContainer}>
        <SearchIcon />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="친구 찾기"
          placeholderTextColor="#A0A0A0"
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <Pressable onPress={handleClear} hitSlop={8}>
            <CloseIcon />
          </Pressable>
        )}
      </View>

      {/* 검색 결과 */}
      {isSearching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color="#4190FF" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.profile_id)}
          contentContainerStyle={{
            paddingTop: 28,
            paddingBottom: Math.max(insets.bottom, 20),
            alignSelf: "center",
            width: 342,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <SearchResultItem
              profile={item}
              status={relationMap[item.profile_id] ?? "none"}
              onRequest={handleRequestPress}
            />
          )}
          ListEmptyComponent={
            searchText.trim().length > 0 && !isSearching ? (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>검색 결과가 없어요</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* 친구 요청 확인 팝업 */}
      <FriendRequestPopup
        visible={popupVisible}
        profile={selectedProfile}
        onCancel={handleCancelPopup}
        onConfirm={handleConfirmRequest}
      />
    </View>
  );
}

/* ====== 스타일 ====== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  /* 검색바 */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Pretendard",
    fontSize: 16,
    lineHeight: 22,
    color: "#0D0D0D",
    padding: 0,
  },

  /* 검색 결과 리스트 아이템 */
  resultItem: {
    width: 342,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  resultInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8E8E8",
    overflow: "hidden",
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  resultName: {
    height: 23,
    justifyContent: "center",
    fontFamily: "Pretendard-SemiBold",
    fontSize: 16,
    lineHeight: 23,
    color: "#0D0D0D",
  },

  /* 친구 요청 버튼 (파란 #5B8DEF) */
  requestButton: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#5B8DEF",
    justifyContent: "center",
    alignItems: "center",
  },
  requestButtonText: {
    fontFamily: "Pretendard",
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: -0.39,
    color: "#FFFFFF",
    textAlign: "center",
  },

  /* 요청됨 / 친구 버튼 (회색 #C3C3C3) */
  statusButtonGray: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#C3C3C3",
    justifyContent: "center",
    alignItems: "center",
  },
  statusButtonTextWhite: {
    fontFamily: "Pretendard",
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: -0.39,
    color: "#FFFFFF",
    textAlign: "center",
  },

  /* 빈 상태 */
  centerContainer: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: "Pretendard",
    fontSize: 15,
    lineHeight: 20,
    color: "#A0A0A0",
  },

  /* ====== 팝업 ====== */
  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  popupContainer: {
    width: 315,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    alignItems: "center",
    gap: 15,
  },

  /* 프로필 카드 */
  popupProfileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    alignSelf: "stretch",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  popupAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8E8E8",
    overflow: "hidden",
  },
  popupAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  popupProfileName: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15,
    lineHeight: 20,
    color: "#0D0D0D",
  },

  /* 텍스트 영역 */
  popupTextArea: {
    alignSelf: "stretch",
    gap: 5,
  },
  popupTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: -0.51,
    color: "#0D0D0D",
  },
  popupDescription: {
    fontFamily: "Pretendard",
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.39,
    color: "#929292",
  },

  /* 버튼 영역 */
  popupButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  popupCancelButton: {
    width: 134,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#5B8DEF",
  },
  popupCancelButtonText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15,
    lineHeight: 20,
    color: "#5B8DEF",
  },
  popupConfirmButton: {
    width: 134,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#5B8DEF",
  },
  popupConfirmButtonText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15,
    lineHeight: 20,
    color: "#FFFFFF",
  },
});
