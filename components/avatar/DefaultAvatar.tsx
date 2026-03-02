import React from "react";
import { View } from "react-native";
import Svg, { Circle, ClipPath, Defs, Path, Rect } from "react-native-svg";

interface Props {
  size?: number;
  style?: object;
}

export default function DefaultAvatar({ size = 100, style }: Props) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Defs>
          <ClipPath id="clip0_4407_25952">
            <Rect width="100" height="100" fill="white" />
          </ClipPath>
        </Defs>
        <Rect
          x="0.5"
          y="0.5"
          width="99"
          height="99"
          rx="49.5"
          fill="#C3C3C3"
          stroke="#F2F2F2"
        />
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M49.5 67C63.6794 67 76.907 72.6438 88.0801 82.3975C78.909 93.1668 65.2537 100 50 100C34.5114 100 20.6694 92.956 11.498 81.8984C22.5482 72.4517 35.5644 67 49.5 67Z"
          fill="#FEFEFE"
        />
        <Circle cx="49.5" cy="40.5" r="18.5" fill="#FEFEFE" />
        <Rect
          x="0.5"
          y="0.5"
          width="99"
          height="99"
          rx="49.5"
          stroke="#F2F2F2"
        />
      </Svg>
    </View>
  );
}