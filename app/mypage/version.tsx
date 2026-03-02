import { commonHeaderOptions } from "@/styles/common";
import * as Application from "expo-application";
import { router, useNavigation } from "expo-router";
import { useEffect } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Path, Svg } from "react-native-svg";

export default function VersionScreen() {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({
      ...commonHeaderOptions,
      headerTitle: () => <Text style={styles.headerTitle}>버전 정보</Text>,
      headerLeft: () => (
        <Pressable onPress={() => router.replace("/settings")}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12.5659 19.4344C12.8783 19.7468 12.8783 20.2533 12.5659 20.5657C12.2535 20.8782 11.7469 20.8782 11.4345 20.5657L3.43451 12.5657C3.12209 12.2533 3.12209 11.7468 3.43451 11.4344L11.4345 3.43436C11.7469 3.12194 12.2535 3.12194 12.5659 3.43436C12.8783 3.74678 12.8783 4.25331 12.5659 4.56573L5.93157 11.2L19.9998 11.2C20.4416 11.2 20.7998 11.5582 20.7998 12C20.7998 12.4419 20.4416 12.8 19.9998 12.8L5.93157 12.8L12.5659 19.4344Z"
              fill="#0D0D0D"
            />
          </Svg>
        </Pressable>
      ),
    });
  }, [navigation]);

  const appVersion = Application.nativeApplicationVersion;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoRow}>
          <Image
            source={require("@/assets/images/icon_with_text.png")}
            style={styles.logoImg}
            accessible
            accessibilityLabel="Dearday 로고"
          />
        </View>
        <Text style={styles.versionText}>현재 버전: {appVersion}</Text>
        <Text style={styles.updateText}>최신 버전을 사용하고 있습니다.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontFamily: "Pretendard-Bold",
    fontSize: 17,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    borderTopWidth: 2,
    borderTopColor: "#f2f2f2",
  },
  content: { padding: 30, alignItems: "center" },
  logoRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  logoImg: { height: 30, resizeMode: "contain" },
  logoLabel: {
    fontFamily: "Pretendard-Bold",
    fontSize: 26,
    color: "#5B8DEF",
  },
  versionText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
  },
  updateText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 14,
    color: "#929292",
  },
});
