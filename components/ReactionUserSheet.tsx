import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from "@gorhom/bottom-sheet";
import React, { forwardRef, useCallback, useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
    const snapPoints = useMemo(() => ["55%"], []);

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
                style={[styles.tabItem, isSelected && styles.tabItemSelected]}
                onPress={() => onSelectTab(tab.key)}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    isSelected && styles.tabTextSelected,
                  ]}
                >
                  {tab.label}
                </Text>
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
        <View style={styles.tabBarDivider} />
      </View>
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
  tabBarWrapper: {
    paddingTop: 25,
    paddingBottom: 10,
    paddingLeft: 24,
    paddingRight: 0,
    backgroundColor: "#fff",
  },
  tabBarScroll: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 24,
    gap: 8,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#F2F2F2",
  },
  tabItemSelected: {
    backgroundColor: "#0D0D0D",
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
    color: "#FFFFFF",
  },
  tabBarDivider: {
    height: 1,
    backgroundColor: "#F2F2F2",
    marginTop: 10,
    marginRight: -24,
  },
  userListContent: {
    paddingBottom: 40,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
    marginRight: 12,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
    marginRight: 12,
  },
  nickname: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 16,
    color: "#333",
  },
  emptyContainer: {
    paddingTop: 32,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 14,
    color: "#C3C3C3",
  },
});
