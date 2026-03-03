import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

serve(async (req) => {
  try {
    const { notification_id } = await req.json()

    console.log('[send-push] invoked:', notification_id)

    if (!notification_id) {
      return new Response('notification_id missing', { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    /* 1️⃣ 알림 조회 */
    const { data: notification, error } = await supabase
      .from('follow_notifications')
      .select(`
        notification_id,
        type,
        user_profile_id,
        actor:actor_profile_id (
          nickname
        )
      `)
      .eq('notification_id', notification_id)
      .single()

    if (error || !notification) {
      console.error(error)
      return new Response('notification not found', { status: 404 })
    }

    /* 2️⃣ Expo Push Token 조회 */
    const { data: tokens } = await supabase
      .from('notification_settings')
      .select(`expo_push_token, follow_enabled, emoji_enabled`)
      .eq('profile_id', notification.user_profile_id)

    if (!tokens || tokens.length === 0) {
      console.log('[send-push] no push tokens')
      console.log('[send-push] notification:', notification)
      return new Response('no push tokens', { status: 200 })
    }

    if (!tokens[0].follow_enabled && ['follow_request', 'follow', 'follow_allow'].includes(notification.type)) {
      console.log('[send-push] follow notifications disabled')
      console.log('[send-push] notification:', tokens[0].follow_enabled)
      return new Response('follow notifications disabled', { status: 200 })
    }

    if (notification.type === 'emoji' && !tokens[0].emoji_enabled) {
      console.log('[send-push] emoji notifications disabled')
      return new Response('emoji notifications disabled', { status: 200 })
    }

    /* 3️⃣ 메시지 생성 */
    const message = buildPushMessage(notification)
    const title = buildPushTitle(notification.type)

    /* 4️⃣ Expo Push payload */
    const payloads = tokens.map((t) => ({
      to: t.expo_push_token,
      sound: 'default',
      title: title,
      body: message,
      data: {
        notification_id: notification.notification_id,
        type: notification.type,
      },
    }))

    /* 5️⃣ 실제 푸시 전송 */
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloads),
    })

    const result = await res.json()
    console.log('[send-push] expo result:', result)

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('[send-push] error:', err)
    return new Response('internal error', { status: 500 })
  }
})

/* ---------------- helpers ---------------- */
function buildPushTitle(type: string): string {
  switch (type) {
    case 'emoji':
      return '알림 도착!🔔'
    case 'follow':
      return '새로운 팔로워'
    case 'follow_request':
      return '팔로우 요청'
    case 'follow_allow':
      return '팔로우 수락'
    default:
      return 'Dearday'
  }
}

function buildPushMessage(notification: any): string {
  const actor = notification.actor?.nickname ?? '알 수 없음'

  switch (notification.type) {
    case 'follow':
      return `${actor}님이 회원님을 팔로우하기 시작했습니다.`
    case 'follow_request':
      return `${actor}님이 회원님을 팔로우하고 싶어 해요. 확인해보세요.`
    case 'follow_allow':
      return `${actor}님이 팔로우 요청을 수락했어요. 이제 피드를 볼 수 있어요.`
    case 'emoji':
      return `${actor}님이 사진에 반응했어요.🤍`
    default:
      return `${actor}님의 새로운 알림`
  }
}
