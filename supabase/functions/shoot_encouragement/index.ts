// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { DateTime } from "npm:luxon";
import { sendPushNotification } from "../../../utils/sendPushNotification.ts";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    // 쓰기/발송 로그가 필요하면 SERVICE_ROLE_KEY 권장 (RLS 영향 받지 않음)
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  // 결과 집계용 카운터
  let processedUsers = 0;
  let timeMatchedUsers = 0;       // 현재 정각 템플릿이 존재했던 유저 수
  let notificationsInserted = 0;  // notifications insert 성공 수
  let pushAttempts = 0;
  let pushSuccesses = 0;
  let pushFailures = 0;
  let sentUpdates = 0;
  let insertErrors = 0;

  // 1) 알림 받을 수 있는 유저
  const { data: users, error: usersErr } = await supabase
    .from("profiles")
    .select("profile_id, timezone, expo_push_token_ios, expo_push_token_android")
    .eq("is_deleted", false)
    .eq("is_notif_enabled", true)
    .or("expo_push_token_ios.not.is.null,expo_push_token_android.not.is.null");

  if (usersErr) {
    return new Response(JSON.stringify({ error: usersErr.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  // 2) 템플릿 로딩
  const { data: templates, error: tmplErr } = await supabase
    .from("notification_templates")
    .select("template_id, time, title, body")
    .eq("is_deleted", false)
    .eq("kind", "shoot_encouragement");

  if (tmplErr) {
    return new Response(JSON.stringify({ error: tmplErr.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  for (const user of users ?? []) {
    processedUsers++;

    const tz = user.timezone || "UTC";
    const localNow = DateTime.now().setZone(tz);
    // 템플릿 time이 "HH:mm:ss" 형식이므로 정각으로 맞춰 비교
    const currentTime = localNow.startOf("hour").toFormat("HH:mm:ss");

    const candidates = (templates ?? []).filter((t) => t.time === currentTime);
    if (!candidates.length) continue; // 해당 정각 템플릿 없으면 스킵

    timeMatchedUsers++;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    // 1) notifications insert (정각 UTC로 저장)
    const { data: inserted, error: insertErr } = await supabase
      .from("notifications")
      .insert({
        profile_id: user.profile_id,
        template_id: chosen.template_id,
        scheduled_at: localNow.startOf("hour").toUTC().toISO(), // 정각(UTC)
      })
      .select("notification_id")
      .single();

    if (insertErr || !inserted) {
      insertErrors++;
      console.error("Insert failed:", insertErr?.message);
      continue;
    }
    notificationsInserted++;

    const notifId = inserted.notification_id;

    // 2) 푸시 발송 (두 플랫폼 토큰 모두 시도)
    const tokens = [user.expo_push_token_ios, user.expo_push_token_android].filter(Boolean) as string[];

    let anySuccess = false;
    for (const token of tokens) {
      pushAttempts++;
      try {
        const ok = await sendPushNotification(token, chosen.title, chosen.body, {
          url: "/camera?notification_id=" + notifId,
        });
        if (ok) {
          pushSuccesses++;
          anySuccess = true;
        } else {
          pushFailures++;
        }
      } catch (e) {
        pushFailures++;
        console.error("Push error:", e);
      }
    }

    // 3) 발송 성공 시 sent_at 업데이트
    if (anySuccess) {
      const { error: updErr } = await supabase
        .from("notifications")
        .update({ sent_at: new Date().toISOString() })
        .eq("notification_id", notifId);
      if (!updErr) sentUpdates++;
    }
  }

  return new Response(JSON.stringify({
    processedUsers,
    timeMatchedUsers,
    notificationsInserted,
    pushAttempts,
    pushSuccesses,
    pushFailures,
    sentUpdates,
    timestampUTC: new Date().toISOString(),
  }), { headers: { "Content-Type": "application/json" } });
});


/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/shoot_encouragement' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
