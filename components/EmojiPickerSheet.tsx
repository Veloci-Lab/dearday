import { supabase } from "@/utils/supabase";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// 이모지 영역 좌우 패딩 13px, 5개 배치, gap 계산
const EMOJI_AREA_PADDING = 13;
const EMOJI_COUNT_PER_ROW = 5;
// 피그마 비율 유지: 72.8px 기준, 내부 패딩 6px 6.8px 7.238px 6px
const DEARDAY_EMOJI_SIZE =
  (SCREEN_WIDTH - EMOJI_AREA_PADDING * 2) / EMOJI_COUNT_PER_ROW;
const DEARDAY_EMOJI_PADDING = {
  top: 6,
  right: 6.8,
  bottom: 7.238,
  left: 6,
};
// 실제 이미지 크기 = 버튼 크기 - 패딩
const DEARDAY_IMAGE_SIZE =
  DEARDAY_EMOJI_SIZE - DEARDAY_EMOJI_PADDING.left - DEARDAY_EMOJI_PADDING.right;

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
export interface EmojiOption {
  emojiId: number;
  emoji: string; // 유니코드 이모지 또는 이미지 URL
  name: string;
  isCustom?: boolean; // Dearday 커스텀 이모지 여부
  imageUrl?: string; // 커스텀 이모지 이미지 URL
}

interface EmojiPickerSheetProps {
  onSelectEmoji: (emoji: EmojiOption) => void;
  onClose?: () => void;
}

/* ====== 기본 이모지 목록 (자주 사용한 이모지 - 임시) ====== */
const DEFAULT_EMOJIS: EmojiOption[] = [
  { emojiId: 101, emoji: "👍", name: "최고" },
  { emojiId: 102, emoji: "🥹", name: "감동" },
  { emojiId: 103, emoji: "😀", name: "웃음" },
  { emojiId: 104, emoji: "🥺", name: "애교" },
  { emojiId: 105, emoji: "💀", name: "해골" },
  { emojiId: 106, emoji: "😭", name: "울음" },
];

/* ====== 메인 컴포넌트 ====== */
const EmojiPickerSheet = forwardRef<BottomSheet, EmojiPickerSheetProps>(
  ({ onSelectEmoji, onClose }, ref) => {
    const snapPoints = useMemo(() => ["55%"], []);
    const [searchText, setSearchText] = useState("");
    const [deardayEmojis, setDeardayEmojis] = useState<EmojiOption[]>([]);

    // Supabase에서 Dearday 커스텀 이모지 불러오기
    useEffect(() => {
      const fetchDeardayEmojis = async () => {
        try {
          const { data, error } = await supabase
            .from("emojis")
            .select("emoji_id, value, name")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

          if (error) {
            console.error("이모지 로드 오류:", error);
            return;
          }

          if (data) {
            const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const emojis: EmojiOption[] = data.map((item) => {
              const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/emoji/${item.value}`;
              return {
                emojiId: item.emoji_id,
                emoji: item.value,
                name: item.name,
                isCustom: true,
                imageUrl,
              };
            });
            // 로그: 이모지 목록, 이미지 URL, 크기 정보
            console.log();
            console.log("[Dearday Emoji] Loaded:", emojis);
            console.log(
              "[Dearday Emoji] DEARDAY_EMOJI_SIZE:",
              DEARDAY_EMOJI_SIZE,
              "DEARDAY_IMAGE_SIZE:",
              DEARDAY_IMAGE_SIZE,
            );
            setDeardayEmojis(emojis);
          }
        } catch (error) {
          console.error("이모지 fetch 오류:", error);
        }
      };

      fetchDeardayEmojis();
    }, []);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      [],
    );

    const handleSheetChanges = useCallback(
      (index: number) => {
        if (index === -1) {
          onClose?.();
          setSearchText("");
        }
      },
      [onClose],
    );

    const handleClear = () => {
      setSearchText("");
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onChange={handleSheetChanges}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        handleStyle={styles.handleContainer}
      >
        <BottomSheetView style={styles.contentContainer}>
          {/* 검색바 (양옆 24px 패딩) */}
          <View style={styles.searchBarWrapper}>
            <View style={styles.searchContainer}>
              <SearchIcon />
              <BottomSheetTextInput
                style={styles.searchInput}
                placeholder="이모지 찾기"
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
          </View>

          {/* 이모지 영역 (양옆 13px 패딩) */}
          <ScrollView
            style={styles.emojiScrollView}
            contentContainerStyle={styles.emojiScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Dearday 섹션 */}
            <View style={styles.emojiSection}>
              <Text style={styles.sectionTitle}>Dearday</Text>
              <View style={styles.deardayGrid}>
                {deardayEmojis.map((emojiOption) => {
                  // 각 이모지 렌더링 시 로그
                  console.log("[Dearday Emoji Render]", {
                    emojiId: emojiOption.emojiId,
                    imageUrl: emojiOption.imageUrl,
                    buttonSize: DEARDAY_EMOJI_SIZE,
                    imageSize: DEARDAY_IMAGE_SIZE,
                  });
                  return (
                    <Pressable
                      key={emojiOption.emojiId}
                      style={styles.deardayEmojiButton}
                      onPress={() => onSelectEmoji(emojiOption)}
                    >
                      <Image
                        source={{ uri: emojiOption.imageUrl }}
                        style={styles.deardayEmojiImage}
                        resizeMode="contain"
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 자주 사용한 이모지 섹션 */}
            <View style={styles.emojiSection}>
              <Text style={styles.sectionTitle}>자주 사용한 이모지</Text>
              <View style={styles.emojiGrid}>
                {DEFAULT_EMOJIS.map((emojiOption) => (
                  <Pressable
                    key={emojiOption.emojiId}
                    style={styles.emojiButton}
                    onPress={() => onSelectEmoji(emojiOption)}
                  >
                    <Text style={styles.emojiText}>{emojiOption.emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

EmojiPickerSheet.displayName = "EmojiPickerSheet";

export default EmojiPickerSheet;

/* ====== 스타일 ====== */
const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleContainer: {
    paddingTop: 7,
    paddingBottom: 14,
  },
  handleIndicator: {
    width: 64,
    height: 5,
    borderRadius: 20,
    backgroundColor: "#F2F2F2",
  },
  contentContainer: {
    flex: 1,
  },
  searchBarWrapper: {
    paddingHorizontal: 24,
  },

  /* 검색바 */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
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

  /* 이모지 스크롤 영역 */
  emojiScrollView: {
    flex: 1,
    marginTop: 19,
  },
  emojiScrollContent: {
    paddingHorizontal: EMOJI_AREA_PADDING,
    paddingBottom: 40,
  },

  /* 섹션 */
  emojiSection: {
    gap: 10,
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18.9,
    letterSpacing: -0.42,
    color: "#929292",
  },

  /* Dearday 커스텀 이모지 그리드 */
  deardayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  deardayEmojiButton: {
    width: DEARDAY_EMOJI_SIZE,
    height: DEARDAY_EMOJI_SIZE,
    paddingTop: DEARDAY_EMOJI_PADDING.top,
    paddingRight: DEARDAY_EMOJI_PADDING.right,
    paddingBottom: DEARDAY_EMOJI_PADDING.bottom,
    paddingLeft: DEARDAY_EMOJI_PADDING.left,
    justifyContent: "center",
    alignItems: "center",
  },
  deardayEmojiImage: {
    width: DEARDAY_IMAGE_SIZE,
    height: DEARDAY_IMAGE_SIZE,
  },

  /* 일반 이모지 그리드 */
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  emojiButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiText: {
    fontSize: 32,
  },
});
