// supabase/functions/delete-user/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1) 호출자의 JWT에서 uid 얻기 (자기계정만 삭제)
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "missing bearer token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const uid = userData.user.id; // ← Supabase Auth user id (UUID)

  // 2) (선택) profiles 소프트 삭제도 이 함수 안에서 처리
  //    - profiles.profile_id가 uid(문자열 UUID)라면 eq("profile_id", uid)
  //    - 만약 bigint 키를 쓰고 있다면, 매핑 컬럼(예: auth_uid)을 기준으로 바꾸세요.
  try {
    await admin.from("profiles").update({ is_deleted: true, nickname: null }).eq("profile_id", uid);
  } catch (_e) {
    // profiles 구조가 다르면 위 업데이트를 제거하거나 컬럼명을 맞춰주세요.
  }

  // 3) 실제 Auth 계정 삭제 (서비스키로만 가능)
  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
