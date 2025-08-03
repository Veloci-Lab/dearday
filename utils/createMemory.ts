import { type SupabaseClient } from "npm:@supabase/supabase-js";

const NOTIFICATION_SEGMENTS = 4;

function generateNotificationTimes(sleep: string | null, wake: string | null, segmentCount: number): string[] {
  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const formatTime = (m: number) => {
    const hours = Math.floor(m / 60) % 24;
    const minutes = m % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  };

  let awakeStart = 0;
  let awakeEnd = 1440;

  // 수면시간과 기상시간이 모두 존재할 때만 awake 구간 설정
  if (sleep && wake) {
    const sleepMin = parseTime(sleep);
    const wakeMin = parseTime(wake);

    awakeStart = wakeMin;
    awakeEnd = sleepMin <= wakeMin ? sleepMin + 1440 : sleepMin; // 자정 넘김 보정
  }

  const awakeMinutes = awakeEnd - awakeStart;
  const segmentLength = Math.floor(awakeMinutes / segmentCount);
  const result: string[] = [];

  for (let i = 0; i < segmentCount; i++) {
    const segStart = awakeStart + i * segmentLength;
    const segEnd = segStart + segmentLength;
    const randomMin = Math.floor(Math.random() * (segEnd - segStart)) + segStart;
    result.push(formatTime(randomMin));
  }

  return result;
}

export async function createMemory(
  supabase: SupabaseClient,
  profileId: string,
  date: string
): Promise<void> {
  // 이미 존재하는지 확인
  const { data: existing, error: selectError } = await supabase
    .from("memories")
    .select("memory_id")
    .eq("profile_id", profileId)
    .eq("date", date);

  if (selectError) {
    throw new Error("기존 memory 확인 실패: " + selectError.message);
  }
  
  if (existing.length > 0) {
    console.log(`[SKIP] ${date} 이미 생성됨`);
    return;
  }

  // memory insert
  const { data: memory, error: memoryError } = await supabase
    .from("memories")
    .insert({ profile_id: profileId, date: date }).select()
  .single();
  console.log('memory: ', memory);
  

  if (memoryError) {
    throw new Error("memory 생성 실패: " + memoryError.message);
  }

  // 알림 보낼 일정 생성 및 memory_entries table에 insert

  // 프로필 정보 조회 (수면시간 포함)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("sleep_time, wake_time")
    .eq("profile_id", profileId)
    .single();

  if (profileError || !profile) {
    throw new Error("프로필 정보 조회 실패");
  }

  const sleepTime = profile.sleep_time;
  const wakeTime = profile.wake_time;

  const notificationTimes = generateNotificationTimes(
    sleepTime,
    wakeTime,
    NOTIFICATION_SEGMENTS
  );

const memoryEntries = notificationTimes.map((time, index) => ({
  memory_id: memory.memory_id,
  order_index: index,
  is_from_noti: true,
  noti_scheduled_time: time,
}));
console.log('memoryEntries: ', memoryEntries);


if (memoryEntries.length > 0) {
  const { error: notiError } = await supabase
    .from("memory_entries")
    .insert(memoryEntries);

  if (notiError) {
    throw new Error("memory_entries 생성 실패: " + notiError.message);
  }
} else {
  // console.log("남은 알림 없음 → insert 생략"); >> 필터링 사용할때만.
  throw new Error("memory_entries 생성 실패");
}


}
