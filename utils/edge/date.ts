import { DateTime } from "npm:luxon@3.4.4";

/**
 * 주어진 타임존 기준으로 현재 날짜를 yyyy-MM-dd 문자열로 반환
 * @param offsetDays - 오늘 기준으로 오프셋 일 수 (기본값: 0)
 * @param timeZone - IANA 타임존 (기본값: "Asia/Seoul")
 * @returns "yyyy-MM-dd" 형식의 날짜 문자열
 */
export function getLocalDateString(
  offsetDays: number = 0,
  timeZone: string = "Asia/Seoul"
): string {
  return DateTime.now()
    .setZone(timeZone)
    .plus({ days: offsetDays })
    .toFormat("yyyy-MM-dd");
}

/**
 * 로컬 타임존 기준의 datetime 문자열을 UTC ISO 문자열로 변환
 * @param localDatetime - "yyyy-MM-dd HH:mm:ss" 형식
 * @param timeZone - IANA 타임존 (기본값: "Asia/Seoul")
 * @returns ISO 8601 형식의 UTC 문자열 또는 null
 */
export function localToUTC(
  localDatetime: string,
  timeZone: string = "Asia/Seoul"
): string | null {
  const dt = DateTime.fromFormat(localDatetime, "yyyy-MM-dd HH:mm:ss", {
    zone: timeZone,
  });

  return dt.isValid ? dt.toUTC().toISO() : null;
}

/**
 * UTC ISO 문자열을 로컬 타임존 기준으로 "yyyy-MM-dd HH:mm:ss" 형식으로 변환
 * @param utcDatetime - ISO 8601 형식의 UTC 문자열 (예: "2025-08-05T12:29:00Z")
 * @param timeZone - 변환할 타임존 (기본값: "Asia/Seoul")
 * @returns "yyyy-MM-dd HH:mm:ss" 문자열 또는 null
 */
export function utcToLocal(
  utcDatetime: string,
  timeZone: string = "Asia/Seoul"
): string | null {
  const dt = DateTime.fromISO(utcDatetime, { zone: "utc" });

  return dt.isValid
    ? dt.setZone(timeZone).toFormat("yyyy-MM-dd HH:mm:ss")
    : null;
}
