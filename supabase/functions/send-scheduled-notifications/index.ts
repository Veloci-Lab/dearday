// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { DateTime } from "npm:luxon@3.4.4";
import { sendPushNotification } from "../../../utils/sendPushNotification.ts";

Deno.serve(async (req: Request) => {
  const nowUTC = DateTime.utc().startOf("minute").toISO(); // ex: '2025-08-05T09:48:00.000Z'

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    // Create client with Auth context of the user that called the function.
    // This way your row-level-security (RLS) policies are applied.
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    }
  );

  const { data: notifications, error } = await supabaseClient
  .from("notifications")
  .select(`
    notification_id,
    memory_id,
    scheduled_at,
    sent_at,
    memories:memory_id (
      profile_id,
      profiles:profile_id (
        expo_push_token_ios,
        expo_push_token_android,
        is_deleted
      )
    )
  `)
  .eq("scheduled_at", nowUTC)
  .is("sent_at", null); 

  if (error) {
    console.error("❌ 알림 조회 실패:", error.message);
    return new Response("알림 조회 실패", { status: 500 });
  }

  const valid = (notifications ?? []).filter(
  (n) => n.memories?.profiles?.is_deleted === false
);

for (const notification of valid) {
    const iosToken = notification.memories.profiles.expo_push_token_ios;
    const androidToken = notification.memories.profiles.expo_push_token_android;
    const tokens = [iosToken, androidToken].filter(Boolean);
    
    let success = false;
    
    for (const token of tokens) {
      const result = await sendPushNotification(
        token,
        "지금을 기록할 시간이에요 📝",
        "오늘 하루 어땠나요?",
        {
          url: "/camera?memory_id=" + notification.memory_id + "&notification_id=" + notification.notification
        }
      );

      if (result) success = true;
    }

    if (success) {
      await supabaseClient
        .from("notifications")
        .update({ sent_at: new Date().toISOString() })
        .eq("notification_id", notification.notification_id);
    }
  }

  return new Response(JSON.stringify({ data: {nowUTC:nowUTC, notifications: notifications, valid: valid}, error }), {
    headers: { "Content-Type": "application/json" },
  });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-scheduled-notifications' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/