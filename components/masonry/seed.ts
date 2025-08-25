// utils/seed.ts (아니면 컴포넌트 파일 맨 위에 놔도 돼)

// 오늘(타임존 포함) 날짜 문자열 yyyymmdd
const todayKey = (tz = "Asia/Seoul") =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date()).replace(/-/g, "");

// 아주 간단한 문자열 해시 → 1..2^31-2 범위 (0 회피)
export const simpleSeed = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  h &= 0x7fffffff;
  return h === 0 ? 1 : h;
};

// 유저+오늘 기반 시드
export const dailyUserSeed = (userId: string, tz = "Asia/Seoul") =>
  simpleSeed(`${userId}:${todayKey(tz)}`);
