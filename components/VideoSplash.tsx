import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

export default function VideoSplash({ onFinish }: { onFinish: () => void }) {
  const hasFinished = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasFinished.current) {
        hasFinished.current = true;
        onFinish();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Video
        source={require("@/assets/videos/splash.mp4")}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish && !hasFinished.current) {
            hasFinished.current = true;
            onFinish();
          }
        }}
        onError={() => {
          // 비디오 로드 실패해도 넘어감
          if (!hasFinished.current) {
            hasFinished.current = true;
            onFinish();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
});