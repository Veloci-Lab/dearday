// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { DateTime } from "npm:luxon";
import { sendPushNotification } from "../../../utils/sendPushNotification.ts";

Deno.serve(async (req: Request) => {
  // 0) 분 앵커 고정 (+ 문자열 포맷 통일)
  const nowUTC = DateTime.utc().startOf("minute");
  const nowISO = nowUTC.toISO({ suppressMilliseconds: true, includeOffset: true });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  // 1) 템플릿
  const { data: tpl, error: tplErr } = await supabaseClient
    .from("notification_templates")
    .select("title, body")
    .eq("kind", "bedtime")
    .eq("is_deleted", false)
    .maybeSingle();
  if (tplErr) return new Response("template error", { status: 500 });
  if (!tpl) return new Response("no template", { status: 200 });

  // 2) 대상 조회: lte(now)
  const { data: dueRows, error: dueErr } = await supabaseClient
    .from("profiles")
    .select("profile_id, next_bedtime_notif_at, timezone, expo_push_token_ios, expo_push_token_android")
    .eq("is_deleted", false)
    .eq("is_bedtime_notif_enabled", true)
    .not("sleep_time", "is", null)
    .or("expo_push_token_ios.not.is.null,expo_push_token_android.not.is.null")
    .lte("next_bedtime_notif_at", nowISO);

  if (dueErr) return new Response("query error", { status: 500 });
  if (!dueRows || dueRows.length === 0) return new Response(JSON.stringify({ now: nowISO, fetched: 0 }), { status: 200 });

  // 3) 집계
  let processedEq = 0;      // 지금 분(eq)으로 발송한 수
  let pushAttempted = 0;
  let pushSucceeded = 0;
  let invalidTokens = 0;
  let pushErrors = 0;
  let advancedTotal = 0;    // 다음 회차로 넘긴 총 수 (eq+lt 모두)

  // 4) 처리
  for (const row of dueRows) {
    // eq(now) 판단: 문자열이 아니라 millis로 비교
    const nextAt = DateTime.fromISO(row.next_bedtime_notif_at as string, { setZone: true }).toUTC();
    const isEq = nextAt.toMillis() === nowUTC.toMillis();

    if (isEq) {
      processedEq++;
      const tokens = [row.expo_push_token_ios, row.expo_push_token_android].filter(Boolean) as string[];

      let delivered = false;
      for (const token of tokens) {
        pushAttempted++;
        try {
          const res = await sendPushNotification(token, tpl.title, tpl.body, { url: "/today/-1" }); // TODO: 라우팅 조정
          if ((res as any)?.ok) {
            delivered = true;
          } else {
            const code = (res as any)?.error ?? "unknown";
            if (code === "DeviceNotRegistered" || code === "InvalidCredentials") {
              invalidTokens++;
              const field = token === row.expo_push_token_ios ? "expo_push_token_ios" : "expo_push_token_android";
              await supabaseClient.from("profiles").update({ [field]: null }).eq("profile_id", row.profile_id);
            }
            console.warn("push failed:", code, "profile:", row.profile_id);
          }
        } catch (e) {
          pushErrors++;
          console.error("push error:", e);
        }
      }
      if (delivered) pushSucceeded++;
    }

    // 5) 다음 회차로 갱신 (심플: 트리거 활용, 같은 값 UPDATE)
    // 트리거가 UPDATE OF sleep_time, timezone + "항상 재계산"이어야 함
    await supabaseClient
      .from("profiles")
      .update({ timezone: row.timezone }) // 같은 값이어도 SET에 들어가면 트리거 실행
      .eq("profile_id", row.profile_id);

    advancedTotal++;
  }

  const summary = {
    now: nowISO,
    fetched: dueRows.length,
    processedEq,
    pushAttempted,
    pushSucceeded,
    invalidTokens,
    pushErrors,
    advancedTotal,
  };

  console.log("bedtime summary:", summary);
  return new Response(JSON.stringify(summary), { status: 200 });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send_bedtime_notif' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

// TODO
// 조건 만족하는 상태로 바겼는데 next_time이 너무 옛날인 경우 -> next time 업뎃 필요 
// 알림 클릭시 어디로 이동? 
// 만약 사진 안찍었다면?
// 이미 사진 정리했다면?