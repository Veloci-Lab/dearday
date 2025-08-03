// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushNotification } from "../../../utils/sendPushNotification.ts";

Deno.serve(async (req: Request) => {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // UTC+9
  now.setSeconds(0, 0); // 초, 밀리초 제거
  const nowIso = now.toISOString();
  const todayDate = nowIso.split("T")[0]; // 'YYYY-MM-DD'
  const formattedTime = now.toTimeString().split(" ")[0]; // ex: '14:23:00'

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

  const { data: memoryEntries, error } = await supabaseClient
  .from("memory_entries")
  .select(
    "*, memories!inner(date, profile_id, profiles!inner(expo_push_token_ios, expo_push_token_android))"
  )
  .eq("memories.date", todayDate)
  .eq("is_from_noti", true)
  .eq("noti_scheduled_time", formattedTime)
  .is("noti_sent_at", null);

  if (error) {
    console.log(error);
    return new Response("Database error", { status: 500 });
  }

for (const memoryEntry of memoryEntries ?? []) {
  const iosToken = memoryEntry.memories.profiles.expo_push_token_ios;
  const androidToken = memoryEntry.memories.profiles.expo_push_token_android;
  const tokens = [iosToken, androidToken].filter(Boolean);

  let success = false;

  for (const token of tokens) {
    const result = await sendPushNotification(
      token,
      "지금을 기록할 시간이에요 📝",
      "오늘 하루 어땠나요?",
      {
        url: "/camera?memory_entry_id=" + memoryEntry.memory_entry_id
      }
    );

    if (result) success = true;
  }

  if (success) {
    await supabaseClient
      .from("memory_entries")
      .update({ noti_sent_at: new Date().toISOString() })
      .eq("memory_entry_id", memoryEntry.memory_entry_id);
  }
}


  return new Response(JSON.stringify({ data: {memoryEntries: memoryEntries}, error }), {
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
