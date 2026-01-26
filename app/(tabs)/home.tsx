import PhotoFrame from "@/components/PhotoFrame";
import Popup from "@/components/Popup";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";
import ViewShot from "react-native-view-shot";

/* ------ 헤더 아이콘 SVG ------- */
const CalendarIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <G clipPath="url(#clip0_calendar)">
      <Rect
        x={1}
        y={1}
        width={18}
        height={18}
        rx={4}
        stroke="black"
        strokeWidth={2}
      />
      <Path
        d="M12.6665 2V5.33333"
        stroke="#0D0D0D"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.33301 2V5.33333"
        stroke="#0D0D0D"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2 8L18 8"
        stroke="#0D0D0D"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
    <Defs>
      <ClipPath id="clip0_calendar">
        <Rect width={20} height={20} fill="white" />
      </ClipPath>
    </Defs>
  </Svg>
);

const NotificationIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12.43 1.82812C14.5328 1.82812 16.2844 2.39457 17.4427 3.97656C18.5393 5.4746 18.9544 7.69827 18.9544 10.623C18.9544 12.242 19.3677 13.5406 19.9212 14.5352C20.2517 15.129 20.5392 15.6605 20.7171 16.1045C20.8719 16.4909 21.075 17.1082 20.8265 17.708C20.5428 18.3917 19.8832 18.6122 19.4456 18.7012C18.9739 18.797 18.3682 18.8193 17.679 18.8193H16.1497C16.033 19.5 15.7781 20.2763 15.3011 20.9736C14.5579 22.0597 13.3114 22.9014 11.4515 22.9014C9.59166 22.9012 8.34489 22.0598 7.60186 20.9736C7.12491 20.2763 6.8709 19.5 6.7542 18.8193H5.26299C4.57379 18.8193 3.96807 18.797 3.49639 18.7012C3.05874 18.6121 2.39909 18.3917 2.11553 17.708C1.86703 17.1083 2.07013 16.4909 2.2249 16.1045C2.40277 15.6605 2.6903 15.129 3.0208 14.5352C3.57428 13.5406 3.98755 12.2421 3.9876 10.623C3.98763 7.69835 4.40274 5.4746 5.49932 3.97656C6.65758 2.39454 8.40923 1.82817 10.512 1.82812H12.43ZM8.79717 18.8193C8.88863 19.1644 9.03405 19.5257 9.25225 19.8447C9.64321 20.4162 10.2878 20.9012 11.4515 20.9014C12.6153 20.9014 13.2596 20.4161 13.6507 19.8447C13.869 19.5256 14.0153 19.1644 14.1067 18.8193H8.79717ZM10.512 3.82812C8.76557 3.82817 7.75422 4.28184 7.1126 5.1582C6.40977 6.11868 5.98763 7.79251 5.9876 10.623C5.98755 12.5963 5.48017 14.228 4.76787 15.5078C4.45399 16.0718 4.24132 16.4749 4.11358 16.7744C4.37229 16.8039 4.74168 16.8193 5.26299 16.8193H17.679C18.2003 16.8193 18.5697 16.8038 18.8284 16.7744C18.7007 16.4749 18.488 16.0718 18.1741 15.5078C17.4619 14.228 16.9544 12.5963 16.9544 10.623C16.9544 7.79238 16.5323 6.11866 15.8294 5.1582C15.1877 4.28188 14.1765 3.82812 12.43 3.82812H10.512Z"
      fill="#0D0D0D"
    />
    <Rect x={13} y={1.00098} width={7} height={7} rx={3.5} fill="#4190FF" />
  </Svg>
);

const SettingsIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
    <Path
      d="M10.9961 6.72034C13.0077 6.72034 14.7031 8.42616 14.7031 10.6119C14.7031 12.7977 13.0076 14.5035 10.9961 14.5035C8.98462 14.5034 7.2891 12.7976 7.28906 10.6119C7.28906 8.42622 8.98459 6.72043 10.9961 6.72034Z"
      stroke="#0D0D0D"
      strokeWidth={2}
    />
    <Path
      d="M6.75861 1.14479L5.16945 2.10459C4.7101 2.38202 4.55162 2.97256 4.81033 3.4427L5.30682 4.34492C5.47354 4.64789 5.4719 5.01551 5.30246 5.31698L3.72699 8.12023C3.54992 8.43529 3.21664 8.63029 2.85523 8.63029H2C1.44772 8.63029 1 9.078 1 9.63029V11.5878C1 12.1401 1.44772 12.5878 2 12.5878H2.8579C3.21788 12.5878 3.55008 12.7813 3.7277 13.0944L5.31056 15.8847C5.48247 16.1878 5.48425 16.5585 5.31527 16.8632L4.80474 17.7837C4.543 18.2556 4.70293 18.8501 5.16613 19.127L6.75533 20.0771C7.2415 20.3677 7.87178 20.1969 8.14471 19.7006L8.58709 18.8961C8.76283 18.5765 9.09863 18.3779 9.46335 18.3779H12.5167C12.8783 18.3779 13.2117 18.5731 13.3887 18.8884L13.8506 19.7113C14.1265 20.2028 14.7539 20.3693 15.2372 20.0793L16.8297 19.1236C17.2892 18.8478 17.4496 18.2589 17.1935 17.7882L16.6996 16.8805C16.5364 16.5807 16.5375 16.2183 16.7024 15.9194L18.2483 13.1179C18.4243 12.7991 18.7596 12.6011 19.1238 12.6011H20C20.5523 12.6011 21 12.1533 21 11.6011V9.63029C21 9.078 20.5523 8.63029 20 8.63029H19.1221C18.7588 8.63029 18.4241 8.43329 18.2478 8.11568L16.6952 5.3192C16.5271 5.01641 16.5277 4.6482 16.6966 4.3459L17.1926 3.45865C17.4557 2.98789 17.2981 2.39326 16.8364 2.11459L15.2286 1.14423C14.7439 0.851731 14.1133 1.01947 13.8381 1.51411L13.4008 2.29985C13.2243 2.61696 12.8899 2.81357 12.527 2.81357H9.46006C9.09709 2.81357 8.76261 2.61689 8.58617 2.29969L8.14949 1.51467C7.87422 1.0198 7.24333 0.852031 6.75861 1.14479Z"
      stroke="black"
      strokeWidth={2}
    />
  </Svg>
);

const DotIcon = () => (
  <Svg width={2} height={2} viewBox="0 0 2 2" fill="none">
    <Circle cx={1} cy={1} r={1} fill="#0D0D0D" />
  </Svg>
);

const VerticalLine = () => (
  <Svg width={1} height={11} viewBox="0 0 1 11" fill="none">
    <Path d="M0.5 0.5V10.5" stroke="#84AAF2" strokeLinecap="round" />
  </Svg>
);

const UploadIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
      stroke="#FEFEFE"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7 8L12 3L17 8"
      stroke="#FEFEFE"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 15V3"
      stroke="#FEFEFE"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ArrowIcon = () => (
  <Svg width={17} height={17} viewBox="0 0 17 17" fill="none">
    <Path
      d="M4.94297 12.2656C4.67709 12.5256 4.67719 12.9534 4.9432 13.2133C5.2007 13.4649 5.61195 13.4648 5.86938 13.2132L10.5703 8.61796C10.6536 8.53707 10.7196 8.44089 10.7647 8.33494C10.8098 8.229 10.833 8.11538 10.833 8.00063C10.833 7.88588 10.8098 7.77227 10.7647 7.66632C10.7196 7.56038 10.6536 7.46419 10.5703 7.38331L5.86934 2.78569C5.61198 2.534 5.2007 2.53398 4.94333 2.78565C4.67769 3.0454 4.67767 3.4728 4.94328 3.73257L9.30593 7.99932L4.94297 12.2656Z"
      fill="#929292"
    />
  </Svg>
);

/* ------ 홈 헤더 ------- */
function HomeHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top + 18 }]}>
      <View style={styles.headerContent}>
        <View style={styles.logo} />
        <View style={styles.rightIcons}>
          <Pressable onPress={() => console.log("캘린더")}>
            <CalendarIcon />
          </Pressable>
          <Pressable onPress={() => {
              console.log("알림");
              router.push("/notifications");
            }}>
            <NotificationIcon />
          </Pressable>
          <Pressable onPress={() => {
              console.log("설정");
              router.push("/settings");
            }}>
            <SettingsIcon />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/* ------ 날짜 Pill ------- */
function DatePill() {
  const today = new Date();
  const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][today.getDay()];
  const dateString = `${today.getFullYear()}년 ${
    today.getMonth() + 1
  }월 ${today.getDate()}일 (${dayOfWeek})`;
  const dearDayCount = 4; // TODO: 실제 계산 로직

  return (
    <View style={styles.datePillContainer}>
      <View style={styles.datePill}>
        <Text style={styles.dateText}>{dateString}</Text>
        <DotIcon />
        <View style={styles.dearDayContainer}>
          <Text style={styles.dearDayLabel}>DAY</Text>
          <Text style={styles.dearDayCount}>{dearDayCount}</Text>
        </View>
      </View>
    </View>
  );
}

/* ------ 오늘의 질문 섹션 ------- */
function QuestionSection() {
  const question = "오늘 찍은 사진 중\n가장 마음에 드는  사진은 뭔가요?";

  return (
    <View style={styles.questionSection}>
      <VerticalLine />
      <Text style={styles.questionLabel}>오늘의 질문</Text>
      <Text style={styles.questionText}>{question}</Text>
      <Text style={styles.questionHint}>사진을 통해 답변해주세요!</Text>
    </View>
  );
}

/* ------ 버튼 섹션 ------- */
interface ButtonSectionProps {
  onSendQuestion: () => void;
  onUploadPhoto: () => void;
  showUploadButton: boolean; // 추가
}

function ButtonSection({
  onSendQuestion,
  onUploadPhoto,
  showUploadButton,
}: ButtonSectionProps) {
  return (
    <View style={styles.buttonSection}>
      {/* 사진 선택 전에만 보임 */}
      {showUploadButton && (
        <Pressable style={styles.uploadButton} onPress={onUploadPhoto}>
          <UploadIcon />
          <Text style={styles.uploadButtonText}>오늘의 사진 올리기</Text>
        </Pressable>
      )}

      {/* 질문 보내기는 항상 보임 */}
      <Pressable style={styles.sendQuestionButton} onPress={onSendQuestion}>
        <Text style={styles.sendQuestionText}>질문 보내기</Text>
        <ArrowIcon />
      </Pressable>
    </View>
  );
}

/* ------ 홈 화면 ------- */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const HomeGradient = require("@/assets/images/backgrounds/home_gradient.png");
  const viewShotRef = useRef<ViewShot>(null);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleSubmitQuestion = (text: string) => {
    console.log("제출된 질문:", text);
    // TODO: API 호출
  };

  const handleClosePopup = () => {
    setIsPopupVisible(false);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("갤러리 접근 권한이 필요해요!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // 공유하기 - 화면 캡쳐 후 공유
  const handleShare = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        alert("이 기기에서는 공유 기능을 사용할 수 없어요.");
        return;
      }

      if (viewShotRef.current?.capture) {
        const uri = await viewShotRef.current.capture();
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "오늘의 질문 공유하기",
        });
      }
    } catch (error) {
      console.error("공유 실패:", error);
      alert("공유에 실패했어요. 다시 시도해주세요.");
    }
  };

  // 편집하기 - 이미지 다시 선택
  const handleEdit = () => {
    handlePickImage();
  };

  const TAB_BAR_HEIGHT = 72;
  const TAB_BAR_BOTTOM_OFFSET = Math.max(insets.bottom, 8) + 10;
  const GAP_FROM_TABBAR = 32;

  const paddingBottom =
    TAB_BAR_BOTTOM_OFFSET + TAB_BAR_HEIGHT + GAP_FROM_TABBAR;

  return (
    <View style={styles.container}>
      <Image
        source={HomeGradient}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={[styles.content, { paddingBottom }]}>
        <HomeHeader />
        <ViewShot
          ref={viewShotRef}
          options={{ format: "png", quality: 1 }}
          style={styles.captureArea}
        >
          <DatePill />
          <QuestionSection />
          <View style={styles.centerContent}>
            {selectedImage ? (
              <PhotoFrame
                imageUri={selectedImage}
                onShare={handleShare}
                onEdit={handleEdit}
              />
            ) : (
              <View style={styles.logoPlaceholder} />
            )}
          </View>
        </ViewShot>
        <ButtonSection
          onSendQuestion={() => setIsPopupVisible(true)}
          onUploadPhoto={handlePickImage}
          showUploadButton={!selectedImage} // 사진 없을 때만 버튼 보임
        />
      </View>
      <Popup
        visible={isPopupVisible}
        title="질문 보내기"
        helperText="디어데이에 올라오면 좋을 것 같은 질문을 공유해주세요!"
        cancelText="취소"
        submitText="투고하기"
        onCancel={handleClosePopup}
        onSubmit={handleSubmitQuestion}
        onGoHome={handleClosePopup}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
  },

  // 헤더 스타일
  headerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    width: "100%",
    maxWidth: 342,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#5B8DEF",
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },

  // 날짜 Pill 스타일
  datePillContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  datePill: {
    flexDirection: "row",
    height: 40,
    paddingHorizontal: 15,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    borderRadius: 20,
    backgroundColor: "rgba(254, 254, 254, 0.40)",
  },
  dateText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 14,
    lineHeight: 18.9,
    letterSpacing: -0.42,
    color: "#0D0D0D",
    textAlign: "center",
  },
  dearDayContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dearDayLabel: {
    fontFamily: "Pretendard",
    fontSize: 14,
    lineHeight: 18.9,
    letterSpacing: -0.42,
    color: "#0D0D0D",
    textAlign: "center",
  },
  dearDayCount: {
    fontFamily: "Pretendard-Bold",
    fontSize: 14,
    lineHeight: 18.9,
    letterSpacing: -0.42,
    color: "#5B8DEF",
    textAlign: "center",
  },

  // 오늘의 질문 섹션
  questionSection: {
    alignItems: "center",
    marginTop: 15,
    gap: 15,
  },
  questionLabel: {
    fontFamily: "Pretendard",
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: -0.51,
    color: "#5B8DEF",
  },
  questionText: {
    fontFamily: "HakgyoansimBadasseugi-L",
    fontSize: 24,
    fontWeight: "300",
    letterSpacing: -1.2,
    color: "#0D0D0D",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0.5,
    // React Native에서는 text-stroke 대신 이렇게 처리
  },
  questionHint: {
    fontFamily: "Pretendard",
    fontSize: 12,
    letterSpacing: -0.36,
    color: "#626262",
    textAlign: "center",
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(91, 141, 239, 0.2)",
  },

  // 버튼 섹션
  buttonSection: {
    marginTop: "auto",
    alignItems: "center",
    gap: 15,
  },
  uploadButton: {
    flexDirection: "row",
    height: 50,
    paddingLeft: 20,
    paddingRight: 22,
    paddingVertical: 8,
    alignItems: "center",
    gap: 12,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#F2F2F2",
    backgroundColor: "#5B8DEF",
  },
  uploadButtonText: {
    fontFamily: "Pretendard-Bold",
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: -0.51,
    color: "#FEFEFE",
    textAlign: "center",
  },
  sendQuestionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sendQuestionText: {
    fontFamily: "Pretendard",
    fontSize: 13,
    letterSpacing: -0.39,
    color: "#929292",
  },

  // questionSection에서 logoPlaceholder 제거하고 여기로 이동
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  captureArea: {
    flex: 1,
    overflow: "hidden",
  },
  captureBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
});
