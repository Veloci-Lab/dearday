import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import { StyleSheet, View } from "react-native";

export default function VideoSplash({
  onFinish,
}: {
  onFinish: () => void;
}) {
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

          if (status.didJustFinish) {
            onFinish();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
});