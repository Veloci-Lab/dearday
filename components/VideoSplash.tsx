import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

export default function VideoSplash({ onFinish }: { onFinish: () => void }) {
  const hasFinished = useRef(false);

  const player = useVideoPlayer(
    `${SUPABASE_URL}/storage/v1/object/public/videos/splash_fixed.mp4`,
    (player) => {
      player.loop = false;
      player.play();
    },
  );

  useEffect(() => {
    console.log("VideoSplash 마운트!");

    // 개발 모드에서는 즉시 스킵
    if (__DEV__) {
      onFinish();
      return;
    }

    const timer = setTimeout(() => {
      if (!hasFinished.current) {
        hasFinished.current = true;
        onFinish();
      }
    }, 5000);

    const subscription = player.addListener("playingChange", (payload) => {
      // 재생이 끝나면 isPlaying이 false로 바뀌고 position이 duration에 도달
      if (!payload.isPlaying && !hasFinished.current) {
        const position = player.currentTime;
        const duration = player.duration;
        if (duration > 0 && Math.abs(position - duration) < 0.5) {
          hasFinished.current = true;
          clearTimeout(timer);
          onFinish();
        }
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
