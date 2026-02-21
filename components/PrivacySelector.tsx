import { CheckIcon } from "@/components/icons/CheckIcon";
import { FriendsIcon } from "@/components/icons/FriendsIcon";
import { GlobeIcon } from "@/components/icons/GlobeIcon";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type VisibilityOption = "public" | "friends";

interface OptionItem {
  key: VisibilityOption;
  IconComponent: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  description: string;
}

const OPTIONS: OptionItem[] = [
  {
    key: "public",
    IconComponent: GlobeIcon,
    title: "전체 공개",
    description: "누구나 내 피드를 보고 팔로우할 수 있어요.",
  },
  {
    key: "friends",
    IconComponent: FriendsIcon,
    title: "친구 공개",
    description: "내가 설정한 친구들만 볼 수 있어요.",
  },
];

interface Props {
  value: VisibilityOption | null;
  onChange: (value: VisibilityOption) => void;
}

export default function PrivacySelector({ value, onChange }: Props) {
  return (
    <View style={styles.optionList}>
      {OPTIONS.map((option) => {
        const isSelected = value === option.key;
        const IconComponent = option.IconComponent;

        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[
              styles.optionCard,
              isSelected && styles.optionCardSelected,
            ]}
          >
            <View
              style={[
                styles.checkbox,
                isSelected && styles.checkboxSelected,
              ]}
            >
              {isSelected && <CheckIcon size={16} color="#FFFFFF" />}
            </View>

            <View style={styles.optionIcon}>
              <IconComponent />
            </View>

            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDesc}>{option.description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  optionList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 19,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#F2F2F2",
  },
  optionCardSelected: {
    backgroundColor: "#F0F5FF",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 17,
  },
  checkboxSelected: {
    backgroundColor: "#5B8DEF",
    borderColor: "#5B8DEF",
  },
  optionIcon: {
    width: 30,
    height: 30,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18.9,
    letterSpacing: -0.42,
  },
  optionDesc: {
    fontFamily: "Pretendard-Regular",
    fontSize: 13,
    color: "#626262",
    letterSpacing: -0.39,
  },
});
