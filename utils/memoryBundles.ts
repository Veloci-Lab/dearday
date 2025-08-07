import { SupabaseClient } from "@supabase/supabase-js";

// ✅ 타입 정의

export interface Memory {
  memory_id: string;
  profile_id: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface MemoryEntry {
  memory_entry_id: string;
  memory_id: string;
  notification_id: string | null;
  content: string;
  location: string | null;
  entry_index: number;
  created_at: string;
  isSubmittedWithin10Min?: boolean; // ✅ 추가된 필드
}

export interface MemoryEntryImage {
  image_id: string;
  memory_entry_id: string;
  image_url: string;
  image_index: number;
  captured_at: string | null;
  created_at: string;
}

export interface Notification {
  notification_id: string;
  memory_id: string;
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
}

export interface MemoryBundle {
  memory: Memory;
  entries: {
    entry: MemoryEntry;
    images: MemoryEntryImage[];
  }[];
  notifications: Notification[];
}

// ✅ 1. 특정 날짜의 MemoryBundle 조회
export async function getUserMemoryBundleByDate(
  supabase: SupabaseClient,
  profileId: string,
  date: string // format: 'YYYY-MM-DD'
): Promise<MemoryBundle | null> {
  const { data: memory, error: memoryError } = await supabase
    .from("memories")
    .select("*")
    .eq("profile_id", profileId)
    .eq("date", date)
    .single();

  if (memoryError || !memory) {
    console.warn(`[WARN] memory not found for ${profileId} on ${date}`);
    return null;
  }

  const memoryId = memory.memory_id;

  const [{ data: entries, error: entriesError }, { data: notifications, error: notificationsError }] =
    await Promise.all([
      supabase
        .from("memory_entries")
        .select("*")
        .eq("memory_id", memoryId)
        .order("entry_index", { ascending: true }),
      supabase
        .from("notifications")
        .select("*")
        .eq("memory_id", memoryId),
    ]);

  if (entriesError) throw new Error("Failed to load memory entries: " + entriesError.message);
  if (notificationsError) throw new Error("Failed to load notifications: " + notificationsError.message);

  const entriesWithImages = await Promise.all(
    (entries ?? []).map(async (entry) => {
      const { data: images, error: imagesError } = await supabase
        .from("memory_entry_images")
        .select("*")
        .eq("memory_entry_id", entry.memory_entry_id)
        .order("image_index", { ascending: true });

      if (imagesError) {
        throw new Error(
          `Failed to load images for entry ${entry.memory_entry_id}: ${imagesError.message}`
        );
      }

      // ✅ 10분 이내 제출 여부 판단
      let isSubmittedWithin10Min = false;
      if (entry.notification_id) {
        const notification = (notifications ?? []).find(
          (n) => n.notification_id === entry.notification_id
        );

        if (notification?.sent_at && entry.created_at) {
          const diff =
            new Date(entry.created_at).getTime() -
            new Date(notification.sent_at).getTime();

          isSubmittedWithin10Min = diff >= 0 && diff <= 10 * 60 * 1000;
        }
      }

      return {
        entry: {
          ...entry,
          isSubmittedWithin10Min,
        },
        images: images ?? [],
      };
    })
  );

  return {
    memory,
    entries: entriesWithImages,
    notifications: notifications ?? [],
  };
}

// ✅ 2. 특정 월의 모든 MemoryBundle 조회 (notification 제거)
export async function getUserMemoryBundleByMonth(
  supabase: SupabaseClient,
  profileId: string,
  yearMonth: string // format: 'YYYY-MM'
): Promise<Omit<MemoryBundle, "notifications">[]> {
  const { data, error } = await supabase
    .from("memories")
    .select(
      `
      *,
      memory_entries (
        *,
        memory_entry_images (*)
      )
    `
    )
    .eq("profile_id", profileId)
    .gte("date", `${yearMonth}-01`)
    .lt("date", `${getNextMonth(yearMonth)}-01`)
    .order("date", { ascending: true });

  if (error) {
    throw new Error("Failed to load memories for the month: " + error.message);
  }

  return (data ?? []).map((memory) => {
    const entries = (memory.memory_entries ?? []).map((entry: MemoryEntry & { memory_entry_images?: MemoryEntryImage[] }) => ({
      entry,
      images: entry.memory_entry_images ?? [],
    }));

    return {
      memory,
      entries,
    };
  });
}

// ✅ 3. 단일 memory_entry_id 기반 엔트리 + 이미지 조회
export async function getUserMemoryEntry(
  supabase: SupabaseClient,
  memory_entry_id: string
): Promise<{ entry: MemoryEntry; images: MemoryEntryImage[] } | null> {
  const { data: entry, error: entryError } = await supabase
    .from("memory_entries")
    .select("*")
    .eq("memory_entry_id", memory_entry_id)
    .single();

  if (entryError || !entry) {
    console.warn(`[WARN] memory_entry not found for ${memory_entry_id}`);
    return null;
  }

  const { data: images, error: imageError } = await supabase
    .from("memory_entry_images")
    .select("*")
    .eq("memory_entry_id", memory_entry_id)
    .order("image_index", { ascending: true });

  if (imageError) {
    throw new Error("Failed to load memory entry images: " + imageError.message);
  }

  return {
    entry,
    images: images ?? [],
  };
}

// 🔧 유틸: 다음 달 계산 (e.g. '2025-08' -> '2025-09')
function getNextMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}
