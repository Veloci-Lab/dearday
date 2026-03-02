import DefaultAvatar from "@/components/avatar/DefaultAvatar";
import { commonHeaderOptions } from "@/styles/common";
import { useAuthStore } from "@/utils/authStore";
import { Image } from "expo-image";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Path, Svg } from "react-native-svg";
import { supabase } from "../utils/supabase";

type Notification = {
  notification_id: string;
  type: "follow_request" | "follow" | "emoji" | "follow_back";
  created_at: string;
  is_read: boolean;
  actor: {
    profile_id: number;
    uid: string;
    nickname: string;
    avatar_url: string;
  };
  entity?: {
    answer_id: string;
    photo_url: string;
  };
  emoji?: string;
};

type NotificationItemProps = {
  item: Notification;
  onConfirm: (item: Notification) => void;
  onDelete: (item: Notification) => void;
  onFollowBack: (item: Notification) => void;
  onSwipeDelete: (item: Notification) => void;
  openId: string | null;
  setOpenId: (id: string | null) => void;
};

export function formatNotificationDate(createdAt: string) {
  const created = new Date(createdAt);
  const now = new Date();

  // 날짜 단위 비교를 위해 시/분/초 제거
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfCreated = new Date(
    created.getFullYear(),
    created.getMonth(),
    created.getDate(),
  );

  const diffMs = startOfToday.getTime() - startOfCreated.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "오늘";
  return `${diffDays}일 전`;
}

function NotificationItem({
  item,
  onConfirm,
  onDelete,
  onFollowBack,
  onSwipeDelete,
  openId,
  setOpenId,
}: NotificationItemProps & {
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  const GAP = -9;
  const ACTION_WIDTH = 96;
  const MAX_SWIPE = -(ACTION_WIDTH - GAP);
  const THRESHOLD = -ACTION_WIDTH / 2;

  const translateX = useSharedValue(0);

  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

  // 다른 아이템이 열리면 자동으로 닫힘
  // console.log('Notification item:', item.type, item.emoji)

  useEffect(() => {
    if (openId !== item.notification_id) {
      translateX.value = withTiming(0);
    }
  }, [openId]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      runOnJS(setOpenId)(item.notification_id);
    })
    .onUpdate((e) => {
      translateX.value = Math.max(MAX_SWIPE, Math.min(0, e.translationX));
    })
    .onEnd(() => {
      if (translateX.value < THRESHOLD) {
        translateX.value = withTiming(MAX_SWIPE);
        runOnJS(setOpenId)(item.notification_id);
      } else {
        translateX.value = withTiming(0);
        runOnJS(setOpenId)(null);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const blockWallStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.outerSpacing}>
      <View style={styles.maskContainer}>
        {/* 뒤 액션 */}
        <View style={styles.rightActions}>
          <Pressable
            style={styles.deleteAction}
            onPress={() => onSwipeDelete(item)}
          >
            <Image
              source={require("@/assets/images/icons/trash.png")}
              style={{ width: 24, height: 24, marginRight: 24 }}
            />
          </Pressable>
        </View>
        <Animated.View style={[styles.blockWall, blockWallStyle]} />

        {/* 카드 */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.cardWrapper, animatedStyle]}>
            {!item.is_read && <View style={styles.unreadDot} />}
            <View style={styles.item}>
              {item.actor.avatar_url ?(
                <Image
                  source={{ uri: item.actor.avatar_url }}
                  style={styles.avatar}
                />
                ) : <DefaultAvatar size={36}/>
              }
              <View style={styles.content}>
                <Text
                  style={[styles.text, item.is_read && { color: "#929292" }]}
                >
                  <Text style={styles.bold}>
                    {item.actor ? item.actor.nickname : "알 수 없음"}
                  </Text>
                  {renderMessage(item.type)}
                  {item.type === "emoji" && item.emoji && (
                    <Image
                      source={{ uri: `${SUPABASE_URL}/storage/v1/object/public/emoji/${item.emoji}`}}
                      style={{ width: 20, height: 20, marginLeft: 4}}
                      cachePolicy={"disk"}
                    />
                  )}
                </Text>
                <Text style={styles.time}>
                  {formatNotificationDate(item.created_at)}
                </Text>
              </View>
              {renderAction(item, onConfirm, onDelete, onFollowBack)}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

function renderMessage(
  type: Notification["type"]
) {
  switch (type) {
    // case "follow_request":
    //   return "님이 팔로우 요청을 보냈어요.";
    // case "follow_back":
    //   return "님이 팔로우 요청을 보냈어요.";
    // case "follow":
    //   return "님이 나를 팔로우하기 시작했어요.";
    case "emoji":
      return "님이 회원님의 사진에 반응했어요.";
  }
}

function renderAction(
  item: Notification,
  onConfirm: (item: Notification) => void,
  onDelete: (item: Notification) => void,
  onFollowBack: (item: Notification) => void,
) {
  switch (item.type) {
    // case "follow_request":
    //   return (
    //     <View style={styles.actions}>
    //       <Pressable style={styles.confirm} onPress={() => onConfirm(item)}>
    //         <Text style={styles.confirmText}>확인</Text>
    //       </Pressable>

    //       <Pressable style={styles.delete} onPress={() => onDelete(item)}>
    //         <Text style={styles.deleteText}>삭제</Text>
    //       </Pressable>
    //     </View>
    //   );

    // case "follow_back":
    //   return (
    //     <Pressable
    //       style={[
    //         styles.confirm,
    //         {
    //           width: 109,
    //           height: 35,
    //           alignItems: "center",
    //           justifyContent: "center",
    //         },
    //       ]}
    //     >
    //       <Text style={styles.confirmText}>맞팔로우 하기</Text>
    //     </Pressable>
    //   );

    // case "follow":
    //   return (
    //     <View style={styles.following}>
    //       <Text style={styles.followingText}>팔로잉 중</Text>
    //     </View>
    //   );
    case "emoji":
      return item.entity?.photo_url ? (
        <Image
          source={{ uri: item.entity.photo_url }}
          style={{ width: 60, height: 60, borderRadius: 12 }}
        />
      ) : (
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 12,
            backgroundColor: "#ccc", // 회색 대체
          }}
        />
      );
  }
}

function EmptyNotifications() {
  return (
    <View style={styles.empty}>
      <View style={styles.centerBlock}>
        <Text style={styles.emptyText}>알림을 기다리고 있어요.</Text>
        <Image
          source={require("../assets/images/DD/ver_sad.png")}
          style={styles.character}
        />
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { profileId } = useAuthStore();

  const [openId, setOpenId] = useState<string | null>(null);

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("follow_notifications")
      .update({ is_read: true })
      .eq("user_profile_id", profileId)
      .eq("is_read", false);

    if (error) {
      console.error("[mark read error]", error);
      return;
    }

    // UI 반영
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );
  };

  useEffect(() => {
    navigation.setOptions({
      ...commonHeaderOptions,
      headerShown: true,
      headerShadowVisible: true,
      headerTitle: () => <Text style={styles.headerTitle}>알림</Text>,
      headerLeft: () => (
        <Pressable onPress={() => router.back()}>
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

  const fetchNotifications = async () => {
    console.log("[notifications] fetch start");

    const { data, error } = await supabase
      .from("follow_notifications")
      .select(
        `
        notification_id,
        type,
        is_read,
        created_at,
        emoji_value,
        entity_id,
        actor:actor_profile_id(
          profile_id,
          uid,
          nickname,
          avatar_url
        ),
        entity:entity_id(
          answer_id,
          photo_url
        )
      `,
      )
      .eq("user_profile_id", profileId)
      .eq("type", "emoji")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[notifications] error", error);
      return;
    }

    const normalized: Notification[] = (data ?? []).map((n: any) => ({
      notification_id: n.notification_id,
      type: n.type,
      is_read: n.is_read,
      created_at: n.created_at,
      actor: n.actor,
      emoji: n.emoji_value,
      entity: n.entity,
    }));

    console.log("[notifications] fetched length:", normalized.length);
    setNotifications(normalized);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);
  useFocusEffect(
    useCallback(() => {
      // 화면 들어올 때: 아무것도 안 함

      return () => {
        // 화면 나갈 때 실행
        markAllAsRead();
      };
    }, [])
  );

  const handleConfirmFollow = async (item: Notification) => {
    // 1) follow 상태 accepted
    const { error: followError } = await supabase
      .from("follows")
      .update({ status: "accepted" })
      .eq("follower_profile_id", item.actor.profile_id)
      .eq("followee_profile_id", profileId);

    if (followError) {
      console.error("[follow accept error]", followError);
      return;
    }

    // 2) 맞팔 여부 확인
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_profile_id", profileId)
      .eq("followee_profile_id", item.actor.profile_id)
      .eq("status", "accepted");

    const isReciprocal = (count ?? 0) > 0;

    // 3) 알림 type 분기
    const nextType = isReciprocal ? "follow" : "follow_back";

    await supabase
      .from("follow_notifications")
      .update({ type: nextType })
      .eq("notification_id", item.notification_id);

    if (nextType === "follow") {
      await supabase
        .from("follow_notifications")
        .update({ is_read: true })
        .eq("notification_id", item.notification_id);
    }

    // 4) UI 반영
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === item.notification_id
          ? { ...n, type: nextType, is_read: nextType === "follow" }
          : n,
      ),
    );
  };

  const handleDeleteFollow = async (item: Notification) => {
    // 1) notification 삭제
    const { error: notifError } = await supabase
      .from("follow_notifications")
      .delete()
      .eq("notification_id", item.notification_id);

    if (notifError) {
      console.error("[notification delete error]", notifError);
      return;
    }

    // 2) follow 삭제
    const { error: followError } = await supabase
      .from("follows")
      .delete()
      .eq("follower_profile_id", item.actor.profile_id)
      .eq("followee_profile_id", profileId);

    if (followError) {
      console.error("[follow delete error]", followError);
      return;
    }

    // 3) UI 반영
    setNotifications((prev) =>
      prev.filter((n) => n.notification_id !== item.notification_id),
    );
  };

  async function onFollowBack(item: Notification) {
    try {
      if (!item.actor?.profile_id) {
        console.error("[follow_back] actor profile_id missing", item);
        return;
      }

      const myProfileId = profileId;
      const targetProfileId = item.actor.profile_id;

      // 1) follows 테이블에 "내가 상대를 팔로우" pending 추가
      const { error: insertFollowError } = await supabase
        .from("follows")
        .insert({
          follower_profile_id: myProfileId,
          followee_profile_id: targetProfileId,
          status: "pending",
        });

      if (insertFollowError) {
        console.error("[follow_back] follows insert error", insertFollowError);
        return;
      }

      // 2) 내 알림 type을 follow로 변경
      const { error: updateMyNotifError } = await supabase
        .from("follow_notifications")
        .update({ type: "follow", is_read: true })
        .eq("notification_id", item.notification_id);

      if (updateMyNotifError) {
        console.error(
          "[follow_back] my notification update error",
          updateMyNotifError,
        );
        return;
      }

      // 3) 상대방에게 follow_request 알림 생성
      const { error: insertTargetNotifError } = await supabase
        .from("follow_notifications")
        .insert({
          user_profile_id: targetProfileId, // 상대방이 받음
          actor_profile_id: myProfileId, // 내가 행동한 사람
          type: "follow_request",
          entity_id: null,
          is_read: false,
        });

      if (insertTargetNotifError) {
        console.error(
          "[follow_back] target notification insert error",
          insertTargetNotifError,
        );
        return;
      }

      // 4) UI 즉시 반영
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === item.notification_id
            ? { ...n, type: "follow", is_read: true }
            : n,
        ),
      );

      console.log("[follow_back] success", {
        myProfileId,
        targetProfileId,
      });
    } catch (err) {
      console.error("[follow_back] unexpected error", err);
    }
  }

  const handleSwipeDelete = async (item: Notification) => {
    // 1. notification 삭제
    const { error } = await supabase
      .from("follow_notifications")
      .delete()
      .eq("notification_id", item.notification_id);

    if (error) {
      console.error("[swipe delete error]", error);
      return;
    }

    // 2. UI 즉시 반영
    setNotifications((prev) =>
      prev.filter((n) => n.notification_id !== item.notification_id),
    );

    // 3. 열려 있던 swipe 닫기
    setOpenId(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* content */}
      {notifications.length === 0 ? (
        <EmptyNotifications />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.notification_id}
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onConfirm={handleConfirmFollow}
              onDelete={handleDeleteFollow}
              onFollowBack={onFollowBack}
              onSwipeDelete={handleSwipeDelete}
              openId={openId}
              setOpenId={setOpenId}
            />
          )}
          style={{ flex: 1 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#EDEDED",
  },

  back: {
    fontSize: 22,
    lineHeight: 22,
  },

  headerTitle: {
    fontSize: 17,
    fontFamily: "Pretendard-Bold",
    fontWeight: "400",
    color: "#0D0D0D",
  },
  item: {
    flexDirection: "row",
    height: 78,
    paddingVertical: 7,
    paddingLeft: 9,
    paddingRight: 6,
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F2F2F2",
    backgroundColor: "#FEFEFE",
    zIndex: 3,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ddd",
  },

  content: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
    flexShrink: 1,
  },

  text: { 
    fontFamily: 'Pretendard-Regular',
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 20,
  },
  bold: { fontWeight: "700" },
  time: 
  { fontSize: 12, 
    color: "#929292", 
    marginTop: 4, 
    fontFamily: 'Pretendard-Regular',
    fontWeight: 400,
    lineHeight: 16
  },
  actions: {
    display: "flex",
    flexDirection: "row",
    gap: 10,
    height: 35,
  },

  confirm: {
    backgroundColor: "#4F7CFF",
    width: 56,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmText: { color: "#fff", fontSize: 15 },

  delete: {
    width: 56,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#C3C3C3",
    backgroundColor: "#FEFEFE",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteText: { color: "#929292", fontSize: 15 },

  rightAction: {
    marginRight: 5,
  },

  following: {
    backgroundColor: "#C3C3C3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
  },

  followingText: { color: "#FEFEFE", fontSize: 15 },

  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#ccc",
  },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  centerBlock: {
    alignItems: "center",
    transform: [{ translateY: -36 }],
  },

  character: {
    width: 118,
    height: 118,
    marginTop: 26,
  },

  emptyText: {
    marginTop: 16,
    fontFamily: "Pretendard-Regular",
    fontSize: 15,
    color: "#626262",
    fontWeight: "400",
    lineHeight: 20,
    letterSpacing: -0.45,
  },
  unreadDot: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#5B8DEF",
  },
  outerSpacing: {
    paddingHorizontal: 9,
    marginBottom: 7,
    overflow: "hidden",
  },
  maskContainer: {
    height: 78,
    backgroundColor: "#fff",
    overflow: "hidden",
    position: "relative",
  },
  cardWrapper: {
    height: 78,
    borderRadius: 20,
    zIndex: 2,
  },
  rightActions: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 96,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0,
  },
  blockWall: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 20, // 카드 radius와 동일
    backgroundColor: "#fff",
    zIndex: 1,
    pointerEvents: "none",
  },
  deleteAction: {
    width: 72,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  extraSpace: {
    width: 24,
    backgroundColor: "#D90000",
  },
});
