import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const Colors = {
  primary30: "#5B8DEF",
  black40: "#929292",
  white: "#FFFFFF",
};

interface ToggleOption {
  key: string;
  label: string;
}

interface ToggleProps {
  options: ToggleOption[];
  activeKey: string;
  onChangeKey: (key: string) => void;
}

const Toggle: React.FC<ToggleProps> = ({ options, activeKey, onChangeKey }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [itemLayouts, setItemLayouts] = useState<
    { x: number; width: number }[]
  >([]);

  const activeIndex = options.findIndex((o) => o.key === activeKey);

  // 아이템 레이아웃 측정
  const handleItemLayout = (index: number, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setItemLayouts((prev) => {
      const next = [...prev];
      next[index] = { x, width };
      return next;
    });
  };

  // 슬라이드 애니메이션
  useEffect(() => {
    if (itemLayouts.length === options.length && itemLayouts[activeIndex]) {
      Animated.spring(slideAnim, {
        toValue: itemLayouts[activeIndex].x,
        useNativeDriver: true,
        damping: 20,
        stiffness: 250,
        mass: 0.8,
      }).start();
    }
  }, [activeIndex, itemLayouts]);

  const indicatorWidth = itemLayouts[activeIndex]?.width ?? 0;

  return (
    <View style={styles.container}>
      {/* 슬라이딩 인디케이터 */}
      {indicatorWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: indicatorWidth,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />
      )}

      {/* 탭 아이템 */}
      {options.map((option, index) => {
        const isActive = option.key === activeKey;
        return (
          <Pressable
            key={option.key}
            style={styles.item}
            onLayout={(e) => handleItemLayout(index, e)}
            onPress={() => onChangeKey(option.key)}
          >
            <Text style={[styles.text, isActive && styles.textActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 2,
    borderRadius: 15,
    backgroundColor: "rgba(254, 254, 254, 0.5)",
    alignSelf: "center",
  },
  indicator: {
    position: "absolute",
    top: 2,
    bottom: 2,
    borderRadius: 13,
    backgroundColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 13,
  },
  text: {
    fontFamily: "Pretendard",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 19,
    letterSpacing: -0.42,
    color: Colors.black40,
    textAlign: "center",
  },
  textActive: {
    fontFamily: "Pretendard-SemiBold",
    fontWeight: "600",
    color: Colors.primary30,
  },
});

export default Toggle;
