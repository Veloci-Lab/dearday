// app/(tabs)/mypage.tsx
import { StyleSheet, Text, View } from "react-native";

export default function MypageScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>마이 페이지</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
});
