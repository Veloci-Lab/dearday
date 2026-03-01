import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import React, { forwardRef, useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export interface ReactionUser {
  id: number;
  nickname: string;
  profileImageUrl?: string | null;
  emojiId?: number;
}

export interface ReactionTab {
  key: string; // 'all' | emojiId string
  label: string; // '전체' | emoji character
  count: number;
}

interface ReactionUserSheetProps {
  onClose: () => void;
  tabs: ReactionTab[];
  selectedTab: string;
  onSelectTab: (key: string) => void;
  users: ReactionUser[];
}

const ReactionUserSheet = forwardRef<BottomSheet, ReactionUserSheetProps>(
  (
    {
      onClose,
      tabs = [],
      selectedTab = "all",
      onSelectTab = () => {},
      users = [],
    },
    ref,
  ) => {
    const snapPoints = useMemo(() => ["45%"], []);

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
          onClose();
        }
      },
      [onClose],
    );

    const TabBar = (
      <>
        <View style={styles.tabBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarScroll}
          >
            {tabs.map((tab) => {
              const isSelected = selectedTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[
                    styles.tabItem,
                    { backgroundColor: isSelected ? "#F2F2F2" : "#FFFFFF" },
                    tab.key === "all" && { gap: 0, paddingLeft: 8 },
                  ]}
                  onPress={() => onSelectTab(tab.key)}
                >
                  {tab.key === "all" ? (
                    <Text
                      style={[
                        styles.tabLabel,
                        isSelected && styles.tabTextSelected,
                      ]}
                    >
                      전체
                    </Text>
                  ) : (
                    <Image
                      source={
                        tab.label.startsWith("http")
                          ? { uri: tab.label }
                          : {
                              uri: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/emoji/${tab.label}`,
                            }
                      }
                      style={{
                        width: 20,
                        height: 20,
                        marginRight: 4,
                        borderRadius: 4,
                      }}
                      resizeMode="contain"
                      cachePolicy="disk"
                    />
                  )}
                  <Text
                    style={[
                      styles.tabCount,
                      isSelected && styles.tabTextSelected,
                    ]}
                  >
                    {tab.count}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <View style={styles.tabBarDivider} />
      </>
    );

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
        <BottomSheetFlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.userListContent}
          ListHeaderComponent={TabBar}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>리액션한 사용자가 없습니다</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.userRow}>
              {item.profileImageUrl ? (
                <Image
                  source={{ uri: item.profileImageUrl }}
                  style={styles.profileImage}
                  cachePolicy="disk"
                />
              ) : (
                <View style={styles.profilePlaceholder} />
              )}
              <Text style={styles.nickname}>{item.nickname}</Text>
            </View>
          )}
        />
      </BottomSheet>
    );
  },
);

ReactionUserSheet.displayName = "ReactionUserSheet";

export default ReactionUserSheet;

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
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
  tabBarWrapper: {
    paddingBottom: 10,
    paddingLeft: 24,
    backgroundColor: "#fff",
  },
  tabBarScroll: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 24,
    gap: 5,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
    paddingLeft: 6,
    paddingRight: 8,
    paddingHorizontal: 8,
    justifyContent: "flex-end",
    gap: 6,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  tabItemSelected: {
    // backgroundColor는 inline style에서 처리
  },
  tabLabel: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 16,
    color: "#0D0D0D",
    marginRight: 4,
  },
  tabCount: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 16,
    color: "#0D0D0D",
  },
  tabTextSelected: {
    color: "#0D0D0D",
  },
  tabBarDivider: {
    height: 1,
    backgroundColor: "#F2F2F2",
    marginRight: -24,
  },
  userListContent: {
    paddingBottom: 20,
    gap: 15,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
    marginRight: 12,
  },
  profilePlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E0E0E0",
    marginRight: 10,
  },
  nickname: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    color: "#333",
  },
  emptyContainer: {
    paddingTop: 20,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 14,
    color: "#C3C3C3",
  },
});
