import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// 색상 변수
const Colors = {
  black100: "#0D0D0D",
  black40: "#929292",
  black20: "#C3C3C3",
  black10: "#F2F2F2",
  black00: "#FEFEFE",
  primary30: "#5B8DEF",
  white: "#FFFFFF",
};

interface PopupProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  helperText?: string;
  cancelText?: string;
  submitText?: string;
  successMessage?: string;
  submitAnotherText?: string;
  homeText?: string;
  onCancel: () => void;
  onSubmit: (text: string) => void;
  onGoHome?: () => void;
}

type PopupState = "input" | "success";

const Popup: React.FC<PopupProps> = ({
  visible,
  title,
  placeholder = "",
  helperText,
  cancelText = "취소",
  submitText = "투고하기",
  successMessage = "질문이 잘 전달됐어요!",
  submitAnotherText = "다른 질문 투고하기",
  homeText = "홈으로",
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

  const renderInputState = () => (
    <>
      {/* 텍스트 영역 */}
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

      {/* 버튼 영역 */}
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

  const renderSuccessState = () => (
    <>
      {/* 텍스트 영역 */}
      <View style={styles.textArea}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.successMessage}>{successMessage}</Text>
      </View>

      {/* 버튼 영역 */}
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

  return (
    // none, fade, slide 중에서 결정 가능!
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {popupState === "input" ? renderInputState() : renderSuccessState()}
        </View>
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
  textArea: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 15,
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
    marginTop: -10, // gap 15에서 5로 조정
  },
  successMessage: {
    color: Colors.black100,
    fontFamily: "Pretendard",
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 20,
  },
  buttonArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  cancelButton: {
    width: 134,
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
    width: 134,
    height: 40,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  homeButton: {
    width: 134,
    height: 40,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: Colors.primary30,
  },
  submitButtonText: {
    color: Colors.white,
    fontFamily: "Pretendard",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default Popup;
