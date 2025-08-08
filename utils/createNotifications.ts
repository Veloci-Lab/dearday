type TimeRange = { start: number; end: number }; // 분 단위

/**
 * "HH:MM:SS" → 분(minute)으로 변환
 */
function toMinutes(time: string | null): number | null {
  if (!time) return null;
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

/**
 * 분(minute) → "HH:MM"
 */
function formatMinuteToHHMM(minute: number): string {
  const hh = Math.floor(minute / 60).toString().padStart(2, "0");
  const mm = (minute % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * 불가능한 시간 구간 반환
 */
function getBlockedRanges(
  timePairs: Array<[string | null, string | null]>
): TimeRange[] {
  const blocked: TimeRange[] = [];

  for (const [startStr, endStr] of timePairs) {
    const start = toMinutes(startStr);
    let end = toMinutes(endStr);

    if (start !== null && end !== null) {
      if (end <= start) end += 1440; // 자정 넘김
      blocked.push({ start, end });
    }
  }

  return blocked;
}

/**
 * 0~1440분에서 blocked 구간 제외한 가능한 분 배열 반환
 */
function getAvailableMinutes(blocked: TimeRange[]): number[] {
  const available: number[] = [];
  for (let m = 0; m < 1440; m++) {
    const isBlocked = blocked.some((b) => m >= b.start && m < b.end);
    if (!isBlocked) available.push(m);
  }
  return available;
}

/**
 * 가능한 분(minute)들을 n등분하여 각 구간에서 1개씩 랜덤 pick
 */
function pickNFromAvailableMinutes(availableMinutes: number[], count: number): number[] {
  const picked: number[] = [];
  const segmentSize = Math.floor(availableMinutes.length / count);

  for (let i = 0; i < count; i++) {
    const segStart = i * segmentSize;
    const segEnd = i === count - 1 ? availableMinutes.length : (i + 1) * segmentSize;

    const segment = availableMinutes.slice(segStart, segEnd);
    if (segment.length > 0) {
      const randomIndex = Math.floor(Math.random() * segment.length);
      picked.push(segment[randomIndex]);
    }
  }

  return picked.sort((a, b) => a - b);
}

/**
 * ✅ 메인 함수
 */
export function generateNotificationTimes(
  blockedTimes: Array<[string | null, string | null]>,
  notifCount: number
): string[] {
  const blocked = getBlockedRanges(blockedTimes);
  const availableMinutes = getAvailableMinutes(blocked);
  const pickedMinutes = pickNFromAvailableMinutes(availableMinutes, notifCount);
  return pickedMinutes.map(formatMinuteToHHMM);
}
