import type { FeedItem } from "./types";

export function makeRand(seed = 123456) {
  let s = seed % 2147483647;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

export const PLACEHOLDER_ID = "__ph__";
export const PH: FeedItem = { id: PLACEHOLDER_ID, imageUrl: "", dateISO: "", place: "" };
export const isPH = (it?: FeedItem) => !it || it.id === PLACEHOLDER_ID;

/** 필요한 개수만큼 slice + placeholder 패딩 */
export function takeWithPad<T>(
  arr: T[],
  start: number,
  need: number,
  pad: T
): { list: T[]; used: number; padded: boolean } {
  const slice = arr.slice(start, start + need);
  const used = Math.min(need, Math.max(0, arr.length - start));
  const padded = slice.length < need;
  while (slice.length < need) slice.push(pad);
  return { list: slice, used, padded };
}
