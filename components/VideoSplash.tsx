import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

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

  useEffect(() => {
    console.log("VideoSplash 마운트!");
  }, []);

  return (
    <View style={styles.container}>
      <Video
        source={{ uri: `${SUPABASE_URL}/storage/v1/object/public/videos/splash.mp4`}}
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
});