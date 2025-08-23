// utils/signedUrlCache.ts
import { supabase } from "@/utils/supabase";

type CacheEntry = { url: string; expiresAt: number };
const cache = new Map<string, CacheEntry>(); // 앱 실행 중 전역 공유(모듈 싱글톤)

/** path는 Storage의 object path (예: "thumb/photo_...jpg") */
export async function getSignedUrl(
  path: string,
  bucket = "pictures",
  ttlSec = 3600
): Promise<string | null> {
  if (!path) return null;

  const key = `${bucket}:${path}`;
  const now = Date.now();

  // 만료 체크: 유효기간 이내면 캐시 재사용
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.url;

  // 새로 발급
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSec);
  if (error) {
    console.warn("signedUrl error:", error.message);
    return null;
  }

  const url = data?.signedUrl ?? null;
  if (url) {
    // 만료 5초 전 여유
    cache.set(key, { url, expiresAt: now + ttlSec * 1000 - 5000 });
  }
  return url;
}

/** 특정 객체만 강제 무효화하고 싶을 때 */
export function invalidateSignedUrl(path: string, bucket = "pictures") {
  cache.delete(`${bucket}:${path}`);
}

/** 전체 캐시 비우기 */
export function clearSignedUrlCache() {
  cache.clear();
}
