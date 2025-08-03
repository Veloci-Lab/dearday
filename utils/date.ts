export function getKSTDate(date?: Date): Date {
  const source = date ?? new Date();

  // 1. UTC 시간 기준으로 변환
  const utc = source.getTime() + source.getTimezoneOffset() * 60000;

  // 2. UTC+9 시간 적용 (KST)
  const kst = new Date(utc + 9 * 60 * 60 * 1000);

  return kst; // ✅ Date 객체 그대로 반환
}

export function getKSTDateString(date?: Date): string {
  const kst = getKSTDate(date);

  const yyyy = kst.getFullYear();
  const mm = String(kst.getMonth() + 1).padStart(2, '0'); // 0부터 시작이므로 +1
  const dd = String(kst.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}