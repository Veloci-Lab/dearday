// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createMemory } from "../../../utils/createMemory.ts";

Deno.serve(async (req) => {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // KST 기준
  now.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tomorrowDateStr = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD
  
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    }
  );

  // 1. 이미 내일자 메모리가 있는 프로필 ID들 가져오기
  const { data: existingMemories, error: memoryError } = await supabaseClient
    .from("memories")
    .select("profile_id")
    .eq("date", tomorrowDateStr);

  if (memoryError) {
    console.error("[generate_tomorrow_memories] memoryError", memoryError);
    return new Response("Error fetching memories", { status: 500 });
  }

  const excludedProfileIds = existingMemories?.map((m) => m.profile_id) ?? [];

  // 2. 프로필 조회 쿼리
  let profilesQuery = supabaseClient
    .from("profiles")
    .select("profile_id")
    .eq("is_deleted", false);

    let profiles;
let profileError;
 if (excludedProfileIds.length > 0) {
  ({ data: profiles, error: profileError } = await supabaseClient
    .from("profiles")
    .select("profile_id")
    .eq("is_deleted", false)
    .not("profile_id", "in", excludedProfileIds));
} else {
  ({ data: profiles, error: profileError } = await supabaseClient
    .from("profiles")
    .select("profile_id")
    .eq("is_deleted", false));
}

  let createdCount = 0;

  for (const profile of profiles ?? []) {
    const profileId = profile.profile_id;

    try {
      await createMemory(supabaseClient, profileId, tomorrowDateStr);
      createdCount++;
    } catch (err) {
      console.error(
        `createMemory 실패: profileId=${profileId}, date=${tomorrowDateStr}`,
        err
      );
    }
  }

  return new Response(
    JSON.stringify({
      message: "Memory generation complete",
      created: createdCount,
      profiles,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
