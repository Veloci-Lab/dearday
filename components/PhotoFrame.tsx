import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

/* ------ 아이콘 ------- */
const ShareIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 2.5L12 14.5M2.50472 12.1706L18.1479 2.17403C18.9123 1.68558 19.9042 2.28907 19.8218 3.19241L18.2029 20.9325C18.1098 21.9534 16.7876 22.2938 16.213 21.4448L12.1203 15.3967C11.9366 15.1252 11.6406 14.9507 11.3141 14.9215L2.99483 14.1764C1.95856 14.0836 1.62802 12.7308 2.50472 12.1706Z"
      stroke="#0D0D0D"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const EditIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M10 16.6666H17.5"
      stroke="#0D0D0D"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M13.75 2.91681C14.0815 2.58529 14.5312 2.39905 15 2.39905C15.2321 2.39905 15.462 2.44477 15.6765 2.53361C15.891 2.62245 16.0858 2.75266 16.25 2.91681C16.4142 3.08097 16.5444 3.27584 16.6332 3.49032C16.722 3.70479 16.7678 3.93467 16.7678 4.16681C16.7678 4.39896 16.722 4.62883 16.6332 4.84331C16.5444 5.05779 16.4142 5.25266 16.25 5.41681L5.83333 15.8335L2.5 16.6668L3.33333 13.3335L13.75 2.91681Z"
      stroke="#0D0D0D"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/* ------ Props ------- */
interface PhotoFrameProps {
  imageUri: string;
  onShare?: () => void;
  onEdit?: () => void;
}

/* ------ 컴포넌트 ------- */
export default function PhotoFrame({
  imageUri,
  onShare,
  onEdit,
}: PhotoFrameProps) {
  const { width: screenWidth } = useWindowDimensions();

  // 정사각형 크기 계산: 화면 너비 - 양쪽 패딩(24*2) - 액자 패딩(9.5*2)
  const HORIZONTAL_PADDING = 24;
  const FRAME_PADDING = 9.5;
  const imageSize = screenWidth - HORIZONTAL_PADDING * 2 - FRAME_PADDING * 2;

  return (
    <View style={styles.frameContainer}>
      <View style={styles.frame}>
        <Image
          source={{ uri: imageUri }}
          style={{
            width: imageSize,
            height: imageSize, // 정사각형
            borderRadius: 12,
          }}
          resizeMode="cover"
        />

        {/* 버튼 영역 */}
        <View style={styles.buttonContainer}>
          {/* 공유 버튼 */}
          {/* {onShare && (
            <Pressable
              style={styles.iconButton}
              onPress={() => {
                console.log("공유 버튼 클릭됨!");
                onShare?.();
              }}
            >
              <ShareIcon />
            </Pressable>
          )} */}

          {/* 편집 버튼 */}
          <Pressable style={styles.iconButton} onPress={onEdit}>
            <EditIcon />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frameContainer: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  frame: {
    padding: 9.5,
    borderRadius: 20,
    backgroundColor: "#FEFEFE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonContainer: {
    position: "absolute",
    right: 9.5 + 16, // 액자 패딩 + 버튼 마진
    bottom: 9.5 + 16,
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(254, 254, 254, 0.50)",
    justifyContent: "center",
    alignItems: "center",
  },
});
