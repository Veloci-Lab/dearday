// shared/createMemoryCore.ts
import { type SupabaseClient } from "npm:@supabase/supabase-js";

const NOTIFICATION_SEGMENTS = 4;

type LocalToUTC = (localDatetime: string, timeZone?: string) => string | null;

type TimeRange = { start: number; end: number };

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(m: number): string {
  const hours = Math.floor(m / 60) % 24;
  const minutes = m % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function expandTimeRange(start: number, end: number): TimeRange[] {
  if (start < end) return [{ start, end }];
  // 예: 23:00 ~ 07:00 → [{1380, 1440}, {0, 420}]
  return [
    { start, end: 1440 },
    { start: 0, end }
  ];
}

function calculateAllowedRanges(forbidden: TimeRange[]): TimeRange[] {
  forbidden.sort((a, b) => a.start - b.start);
  const allowed: TimeRange[] = [];
  let cursor = 0;

  for (const f of forbidden) {
    if (cursor < f.start) allowed.push({ start: cursor, end: f.start });
    cursor = Math.max(cursor, f.end);
  }

  if (cursor < 1440) allowed.push({ start: cursor, end: 1440 });

  return allowed;
}

function generateNotificationTimes(
  sleep: string | null,
  wake: string | null,
  workStart: string | null,
  workEnd: string | null,
  segmentCount: number
): string[] {
  let sleepRanges: TimeRange[] = [];
  if (sleep && wake) {
    sleepRanges = expandTimeRange(parseTime(sleep), parseTime(wake));
  }

  let workRanges: TimeRange[] = [];
  if (workStart && workEnd) {
    workRanges = expandTimeRange(parseTime(workStart), parseTime(workEnd));
  }

  const forbidden = [...sleepRanges, ...workRanges];
  const allowed = calculateAllowedRanges(forbidden);

  const allMins: number[] = [];
  for (const r of allowed) {
    for (let m = r.start; m < r.end; m++) {
      allMins.push(m); // ✅ mod 제거
    }
  }

  if (allMins.length < segmentCount) {
    console.warn("허용된 시간 범위가 너무 좁아 충분한 알림을 생성할 수 없습니다.");
    return [];
  }

  const segmentLength = Math.floor(allMins.length / segmentCount);
  const times: string[] = [];

  for (let i = 0; i < segmentCount; i++) {
    const start = i * segmentLength;
    const end = i === segmentCount - 1 ? allMins.length : start + segmentLength;
    const segment = allMins.slice(start, end);
    if (segment.length === 0) continue;
    const random = segment[Math.floor(Math.random() * segment.length)];
    times.push(formatTime(random));
  }

  return times;
}

export async function createMemory(
  supabase: SupabaseClient,
  profileId: string,
  date: string,
  localToUTC: LocalToUTC
): Promise<string> {
  // 1. 기존 메모리 존재 확인
  const { data: existing, error: selectError } = await supabase
    .from("memories")
    .select("memory_id")
    .eq("profile_id", profileId)
    .eq("date", date);

  if (selectError) throw new Error("기존 memory 확인 실패: " + selectError.message);
  if (existing.length > 0) {
    console.log(`[SKIP] ${date} 이미 생성됨`);
    return "skip";
  }

  // 2. memory insert
  const { data: memory, error: memoryError } = await supabase
    .from("memories")
    .insert({ profile_id: profileId, date })
    .select()
    .single();

  if (memoryError) throw new Error("memory 생성 실패: " + memoryError.message);

  // 3. 프로필 조회 (수면 + 근무 시간 포함)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("sleep_time, wake_time, work_start_time, work_end_time")
    .eq("profile_id", profileId)
    .single();

  if (profileError || !profile) throw new Error("프로필 정보 조회 실패");

  const {
    sleep_time,
    wake_time,
    work_start_time,
    work_end_time
  } = profile;

  // 4. 알림 시간 생성 (수면 + 근무 시간 제외)
  const notificationTimes = generateNotificationTimes(
    sleep_time,
    wake_time,
    work_start_time,
    work_end_time,
    NOTIFICATION_SEGMENTS
  );

  console.log("notificationTimes:", notificationTimes);

  const notifications = notificationTimes.map((time) => {
    const utcDatetime = localToUTC(`${date} ${time}`);
    console.log(date, time, utcDatetime);
    return {
      memory_id: memory.memory_id,
      scheduled_at: utcDatetime,
    };
  });

  // 5. 알림 DB에 저장
  if (notifications.length > 0) {
    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      console.error("notifications 생성 실패:", insertError.message);
    }
  }

  return "success";
}
