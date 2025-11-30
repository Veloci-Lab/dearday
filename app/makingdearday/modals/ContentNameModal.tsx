import React, { useState } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface ContentNameModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}

export default function ContentNameModal({
  visible,
  onCancel,
  onConfirm,
}: ContentNameModalProps) {
  const [name, setName] = useState("");

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim());
      setName("");
    }
  };

  const handleCancel = () => {
    setName("");
    onCancel();
  };

  const isNameValid = name.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* 상단 컨텐츠 영역 */}
          <View style={styles.contentSection}>
            <Text style={styles.title}>콘텐츠 이름</Text>

            <TextInput
              style={[styles.input, isNameValid && styles.inputActive]}
              placeholder="이름을 입력해주세요"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              autoFocus={true}
            />

            <Text style={styles.hint}>나중에도 수정할 수 있어요.</Text>
          </View>

          {/* 버튼 영역 */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                !isNameValid && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              activeOpacity={0.7}
              disabled={!isNameValid}
            >
              <Text
                style={[
                  styles.confirmButtonText,
                  !isNameValid && styles.confirmButtonTextDisabled,
                ]}
              >
                추가하기
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  contentSection: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 12,
    alignSelf: "stretch",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
  },
  inputActive: {
    borderColor: "#5B8DEF",
  },
  hint: {
    fontSize: 13,
    color: "#999",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 40,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5B8DEF",
  },
  confirmButton: {
    flex: 1,
    height: 40,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#5B8DEF",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  confirmButtonTextDisabled: {
    color: "#999",
  },
});