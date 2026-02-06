import { supabase } from "@/utils/supabase";
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
const BackArrow = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 12H5"
      stroke="#0D0D0D"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 19L5 12L12 5"
      stroke="#0D0D0D"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

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

/* ====== 헤더 ====== */
function SearchHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top + 18 }]}>
      <View style={styles.headerContent}>
        <Pressable style={styles.headerIconWrapper} onPress={onBack}>
          <BackArrow />
        </Pressable>
        <Text style={styles.headerTitle}>친구 찾기</Text>
        <View style={styles.headerSpacer} />
      </View>
    </View>
  );
}

/* ====== 친구 요청 확인 팝업 ====== */
interface FriendRequestPopupProps {
  visible: boolean;
  profile: SearchResult | null;
  onCancel: () => void;
  onConfirm: () => void;
}

function FriendRequestPopup({
  visible,
  profile,
  onCancel,
  onConfirm,
}: FriendRequestPopupProps) {
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
  const getButtonStyle = () => {
    switch (status) {
      case "accepted":
        return styles.statusButtonGray;
      case "pending":
        return styles.statusButtonGray;
      case "sending":
        return styles.statusButtonGray;
      default:
        return styles.requestButton;
    }
  };

  const getButtonTextStyle = () => {
    switch (status) {
      case "accepted":
        return styles.statusButtonTextWhite;
      case "pending":
        return styles.statusButtonTextWhite;
      case "sending":
        return styles.statusButtonTextWhite;
      default:
        return styles.requestButtonText;
    }
  };

  const getButtonLabel = () => {
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
  };

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
        style={getButtonStyle()}
        onPress={() => onRequest(profile)}
        disabled={status !== "none"}
      >
        <Text style={getButtonTextStyle()}>{getButtonLabel()}</Text>
      </Pressable>
    </View>
  );
}

/* ====== 친구 찾기 화면 ====== */
export default function SearchFriendsScreen({
  onBack,
}: {
  onBack: () => void;
}) {
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

  /* ── 내 프로필 ID 가져오기 ── */
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

      const { data: sentFollows } = await supabase
        .from("follows")
        .select("followee_profile_id, status")
        .eq("follower_profile_id", myProfileId)
        .in("followee_profile_id", profileIds);

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
        } else if (f.status === "pending") {
          if (!map[f.follower_profile_id]) {
            map[f.follower_profile_id] = "pending";
          }
        }
      });

      setRelationMap(map);
    } catch (err) {
      console.error("검색 오류:", err);
    } finally {
      setIsSearching(false);
    }
  };

  /* ── 친구 요청 버튼 클릭 → 팝업 열기 ── */
  const handleRequestPress = (profile: SearchResult) => {
    setSelectedProfile(profile);
    setPopupVisible(true);
  };

  /* ── 팝업에서 확인 → 실제 요청 보내기 ── */
  const handleConfirmRequest = async () => {
    if (!myProfileId || !selectedProfile) return;

    const targetProfileId = selectedProfile.profile_id;
    setPopupVisible(false);
    setSelectedProfile(null);

    // 즉시 UI 업데이트
    setRelationMap((prev) => ({ ...prev, [targetProfileId]: "sending" }));

    const { error } = await supabase.from("follows").insert({
      follower_profile_id: myProfileId,
      followee_profile_id: targetProfileId,
      status: "pending",
    });

    if (error) {
      setRelationMap((prev) => {
        const next = { ...prev };
        delete next[targetProfileId];
        return next;
      });
      Alert.alert("오류", "친구 요청에 실패했어요.");
    } else {
      setRelationMap((prev) => ({ ...prev, [targetProfileId]: "pending" }));
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
      <SearchHeader onBack={onBack} />

      {/* 헤더 아래 구분선 */}
      <View style={styles.headerDivider} />

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
            paddingBottom: Math.max(insets.bottom, 20),
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

  /* 헤더 */
  headerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FEFEFE",
  },
  headerContent: {
    width: 342,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.51,
    color: "#0D0D0D",
    textAlign: "center",
  },
  headerIconWrapper: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 24,
  },
  headerDivider: {
    height: 1,
    backgroundColor: "#F2F2F2",
  },

  /* 검색바 */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 16,
    paddingBottom: 12,
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

  /* 검색 결과 아이템 */
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  resultInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8E8E8",
    overflow: "hidden",
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  resultName: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 16,
    lineHeight: 22,
    color: "#0D0D0D",
  },

  /* 친구 요청 버튼 (기본) */
  requestButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#4190FF",
  },
  requestButtonText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    lineHeight: 18,
    color: "#FFFFFF",
  },

  /* 친구 요청됨 / 친구 버튼 (회색) */
  statusButtonGray: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#C3C3C3",
  },
  statusButtonTextWhite: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    lineHeight: 18,
    color: "#FFFFFF",
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
    padding: 20,
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
