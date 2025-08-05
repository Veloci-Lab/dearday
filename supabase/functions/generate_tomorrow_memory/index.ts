// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createMemory } from "../../../utils/createMemory.ts";
import { getLocalDateString, localToUTC } from '../../../utils/edge/date.ts';

Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    }
  );

  // 모든 유저들은 각자의 로컬 시간 기준으로 자정이 지나기 전에 다음날의 메모리가 생성되어야 한다. -> 하루 2번 실행하면 모든 지역 커버 가능

  const { data: profiles, error: profileError } = await supabaseClient
    .from("profiles")
    .select("profile_id")
    .eq("is_deleted", false);;

  if (profileError) {
    console.error("❌ 프로필 목록 조회 실패:", profileError?.message);
    return new Response(profileError, { status: 500 });
  }

  const totalProfiles = profiles.length;
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const profile of profiles) {
    const tomorrow = getLocalDateString(1); // 추후 필요시 timezone 추가

    try {
      const result = await createMemory(supabaseClient, profile.profile_id, tomorrow, localToUTC);

      if (result === "skip") {
        console.log(`⏭️ ${profile.profile_id} - ${tomorrow} 이미 존재 (스킵됨)`);
        skipCount++;
      } else { // success
        console.log(`✅ ${profile.profile_id} - ${tomorrow} 메모리 생성 완료`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ ${profile.profile_id} - ${tomorrow} 처리 실패:`, err);
      failCount++;
    }
  }

  const summary = `📝 총: ${totalProfiles} | 생성: ${successCount} | 스킵: ${skipCount} | 실패: ${failCount}`;
  return new Response(summary, { status: 200 });
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate_tomorrow_memory' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
