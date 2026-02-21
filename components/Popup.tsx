import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

// 색상 변수
const Colors = {
  black100: "#0D0D0D",
  black40: "#929292",
  black20: "#C3C3C3",
  black10: "#F2F2F2",
  black00: "#FEFEFE",
  primary30: "#5B8DEF",
  white: "#FFFFFF",
  danger: "#F08080",
};

/* ---- 아이콘 ---- */
const WarningIcon = () => (
  <Svg width={30} height={30} viewBox="0 0 30 30" fill="none">
    <Circle cx={15} cy={15} r={13} stroke="#5B8DEF" strokeWidth={2} />
    <Path
      d="M15 7.36523L15 17.4912"
      stroke="#5B8DEF"
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Circle cx={15} cy={21.8711} r={1.5} fill="#5B8DEF" />
  </Svg>
);

/* ---- 타입 정의 ---- */
type PopupVariant =
  | "input"
  | "success"
  | "alert"
  | "confirm"
  | "profileConfirm";

interface ProfileInfo {
  avatarUrl?: string | null;
  name: string;
}

interface PopupProps {
  visible: boolean;
  variant?: PopupVariant;
  title: string;

  // input 전용
  placeholder?: string;
  helperText?: string;

  // success 전용
  successMessage?: string;
  submitAnotherText?: string;

  // alert / confirm / profileConfirm 공용
  description?: string;

  // profileConfirm 전용
  profileInfo?: ProfileInfo;

  // alert 전용
  icon?: "warning" | React.ReactNode;

  // 버튼 텍스트
  cancelText?: string;
  submitText?: string;
  homeText?: string;

  // 액션 버튼 색상 (confirm / profileConfirm 용)
  submitButtonColor?: string;

  // 콜백
  onCancel: () => void;
  onSubmit: (text: string) => void;
  onGoHome?: () => void;
}

type PopupState = "input" | "success";

const Popup: React.FC<PopupProps> = ({
  visible,
  variant = "input",
  title,

  // input
  placeholder = "",
  helperText,

  // success
  successMessage = "질문이 잘 전달됐어요!",
  submitAnotherText = "다른 질문 투고하기",

  // alert / confirm / profileConfirm
  description,
  profileInfo,
  icon,

  // 버튼
  cancelText = "취소",
  submitText = "투고하기",
  homeText = "홈으로",

  // 스타일
  submitButtonColor,

  // 콜백
  onCancel,
  onSubmit,
  onGoHome,
}) => {
  const [inputText, setInputText] = useState("");
  const [popupState, setPopupState] = useState<PopupState>("input");

  const isSubmitEnabled = inputText.trim().length > 0;

  const handleSubmit = () => {
    if (isSubmitEnabled) {
      onSubmit(inputText);
      setPopupState("success");
    }
  };

  const handleSubmitAnother = () => {
    setInputText("");
    setPopupState("input");
  };

  const handleCancel = () => {
    setInputText("");
    setPopupState("input");
    onCancel();
  };

  const handleGoHome = () => {
    setInputText("");
    setPopupState("input");
    onGoHome?.();
  };

  /* ---- 프로필 헤더 ---- */
  const renderProfileHeader = () => {
    if (!profileInfo) return null;
    return (
      <View style={styles.profileHeader}>
        {profileInfo.avatarUrl ? (
          <Image
            source={{ uri: profileInfo.avatarUrl }}
            style={styles.profileAvatar}
            cachePolicy="disk"
          />
        ) : (
          <View style={styles.profileAvatarPlaceholder} />
        )}
        <Text style={styles.profileName}>{profileInfo.name}</Text>
      </View>
    );
  };

  /* ---- 아이콘 렌더링 ---- */
  const renderIcon = () => {
    if (!icon) return null;
    if (icon === "warning") return <WarningIcon />;
    return <>{icon}</>;
  };

  /* ===============================
     variant: input (기존)
     =============================== */
  const renderInputState = () => (
    <>
      <View style={styles.textArea}>
        <Text style={styles.title}>{title}</Text>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={placeholder}
          placeholderTextColor={Colors.black40}
          multiline
          textAlignVertical="top"
        />
        {helperText && <Text style={styles.helperText}>{helperText}</Text>}
      </View>

      <View style={styles.buttonArea}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>{cancelText}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: isSubmitEnabled
                ? Colors.primary30
                : Colors.black20,
            },
          ]}
          onPress={handleSubmit}
          disabled={!isSubmitEnabled}
        >
          <Text style={styles.submitButtonText}>{submitText}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  /* ===============================
     variant: success (기존)
     =============================== */
  const renderSuccessState = () => (
    <>
      <View style={styles.textArea}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.successMessage}>{successMessage}</Text>
      </View>

      <View style={styles.buttonArea}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleSubmitAnother}
        >
          <Text style={styles.cancelButtonText}>{submitAnotherText}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
          <Text style={styles.submitButtonText}>{homeText}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  /* ===============================
     variant: alert (이미지 1)
     아이콘 + 타이틀 + 설명 + 단일 버튼
     =============================== */
  const renderAlert = () => (
    <>
      <View style={styles.alertBody}>
        {renderIcon()}
        <Text style={styles.alertTitle}>{title}</Text>
        {description && (
          <Text style={styles.alertDescription}>{description}</Text>
        )}
      </View>

      <View style={styles.buttonAreaFull}>
        <TouchableOpacity
          style={[
            styles.fullButton,
            { backgroundColor: submitButtonColor || Colors.primary30 },
          ]}
          onPress={handleGoHome}
        >
          <Text style={styles.submitButtonText}>{homeText}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  /* ===============================
     variant: confirm (이미지 2/3 프로필 없이)
     타이틀 + 설명 + 취소/액션 버튼
     =============================== */
  const renderConfirm = () => {
    const actionColor = submitButtonColor || Colors.primary30;

    return (
      <>
        <View style={styles.textArea}>
          <Text style={styles.title}>{title}</Text>
          {description && (
            <Text style={styles.confirmDescription}>{description}</Text>
          )}
        </View>

        <View style={styles.buttonArea}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: actionColor }]}
            onPress={() => {
              onSubmit("");
            }}
          >
            <Text style={styles.submitButtonText}>{submitText}</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  /* ===============================
     variant: profileConfirm (이미지 2, 3)
     프로필 헤더 + 타이틀 + 설명 + 취소/액션 버튼
     =============================== */
  const renderProfileConfirm = () => {
    const actionColor = submitButtonColor || Colors.primary30;

    return (
      <>
        {renderProfileHeader()}

        <View style={styles.textAreaWithProfile}>
          <Text style={styles.title}>{title}</Text>
          {description && (
            <Text style={styles.confirmDescription}>{description}</Text>
          )}
        </View>

        <View style={styles.buttonArea}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: actionColor }]}
            onPress={() => {
              onSubmit("");
            }}
          >
            <Text style={styles.submitButtonText}>{submitText}</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  /* ---- 메인 렌더링 ---- */
  const renderContent = () => {
    switch (variant) {
      case "alert":
        return renderAlert();
      case "confirm":
        return renderConfirm();
      case "profileConfirm":
        return renderProfileConfirm();
      case "input":
      case "success":
      default:
        return popupState === "input"
          ? renderInputState()
          : renderSuccessState();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>{renderContent()}</View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: 315,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 15,
    backgroundColor: Colors.white,
    borderRadius: 16,
  },

  /* ---- 공통 텍스트 영역 ---- */
  textArea: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 15,
    alignSelf: "stretch",
  },
  textAreaWithProfile: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 8,
    alignSelf: "stretch",
  },
  title: {
    color: Colors.black100,
    fontFamily: "Pretendard",
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 20,
    letterSpacing: -0.51,
  },

  /* ---- input variant ---- */
  input: {
    width: 283,
    height: 65,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.black10,
    backgroundColor: Colors.black00,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Pretendard",
    fontSize: 15,
    color: Colors.black100,
  },
  helperText: {
    alignSelf: "stretch",
    color: Colors.black40,
    fontFamily: "Pretendard",
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: -0.39,
    marginTop: -10,
  },

  /* ---- success variant ---- */
  successMessage: {
    color: Colors.black100,
    fontFamily: "Pretendard",
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 20,
  },

  /* ---- alert variant ---- */
  alertBody: {
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    alignSelf: "stretch",
    paddingVertical: 8,
  },
  alertTitle: {
    color: Colors.black100,
    fontFamily: "Pretendard",
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 22,
    letterSpacing: -0.51,
    textAlign: "center",
  },
  alertDescription: {
    color: Colors.black40,
    fontFamily: "Pretendard",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    textAlign: "center",
  },

  /* ---- confirm variant ---- */
  confirmDescription: {
    color: Colors.black40,
    fontFamily: "Pretendard",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    letterSpacing: -0.42,
  },

  /* ---- profileConfirm variant ---- */
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    alignSelf: "stretch",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.black10,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.black20,
  },
  profileAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.black20,
  },
  profileName: {
    color: Colors.black100,
    fontFamily: "Pretendard",
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
  },

  /* ---- 버튼 영역 ---- */
  buttonArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  buttonAreaFull: {
    alignSelf: "stretch",
  },
  cancelButton: {
    flex: 1,
    height: 40,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary30,
    backgroundColor: Colors.white,
  },
  cancelButtonText: {
    color: Colors.primary30,
    fontFamily: "Pretendard",
    fontSize: 15,
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    height: 40,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  homeButton: {
    flex: 1,
    height: 40,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: Colors.primary30,
  },
  fullButton: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  submitButtonText: {
    color: Colors.white,
    fontFamily: "Pretendard",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default Popup;
