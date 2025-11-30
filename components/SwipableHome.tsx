import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import React, {
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { router, useFocusEffect } from "expo-router";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3; // 화면의 30% 스와이프하면 카메라 열림

interface SwipeableHomeProps {
  children: React.ReactNode;
}

export interface SwipeableHomeRef {
  resetCamera: () => void;
}

const SwipeableHome = forwardRef<SwipeableHomeRef, SwipeableHomeProps>(
  ({ children }, ref) => {
  const translateX = useSharedValue(0);
  const cameraOpacity = useSharedValue(0);
  const [showCamera, setShowCamera] = useState(false);
  const isGestureActive = useSharedValue(false);

  const openCamera = () => {
    router.push("/camera"); // 카메라 화면으로 이동
  };

  const resetCamera = useCallback(() => {
    translateX.value = 0;
    cameraOpacity.value = 0;
    setShowCamera(false);
  }, []);

  useImperativeHandle(ref, () => ({
    resetCamera,
  }));

  useFocusEffect(
    useCallback(() => {
      return () => {
        // 화면을 떠날 때 카메라 비활성화
        resetCamera();
      };
    }, [resetCamera])
  );

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      isGestureActive.value = true;
    },
    onActive: (event) => {
      // 오른쪽으로만 스와이프 가능 (왼쪽으로 당기기)
      if (event.translationX > 0) {
        translateX.value = event.translationX;
      }
    },
    onEnd: (event) => {
      isGestureActive.value = false;

      // 임계값을 넘으면 카메라 열기
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH, {
          damping: 20,
          stiffness: 90,
        });
        runOnJS(openCamera)();
      } else {
        // 원래 위치로 복귀
        translateX.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const cameraStyle = useAnimatedStyle(() => {
    return {
      opacity: cameraOpacity.value,
    };
  });

  return (
    <View style={styles.container}>
      {showCamera && (
        <Animated.View style={[StyleSheet.absoluteFill, cameraStyle]}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            active={showCamera} 
          />
        </Animated.View>
      )}

      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
});

SwipeableHome.displayName = 'SwipeableHome';

export default SwipeableHome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
