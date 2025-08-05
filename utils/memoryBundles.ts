import { type SupabaseClient } from "npm:@supabase/supabase-js";

export interface MemoryBundle {
  memory: any;
  entries: {
    entry: any;
    images: any[];
  }[];
  notifications: any[];
}

// ✅ 1. 특정 날짜의 MemoryBundle 조회
export async function getUserMemoryBundleByDate(
  supabase: SupabaseClient,
  profileId: string,
  date: string
): Promise<MemoryBundle | null> {
  const { data: memory, error: memoryError } = await supabase
    .from("memories")
    .select("*")
    .eq("profile_id", profileId)
    .eq("date", date)
    .single();

  if (memoryError || !memory) {
    console.log(`[WARN] memory 없음: ${date}`);
    return null;
  }

  const memoryId = memory.memory_id;

  const { data: entries, error: entriesError } = await supabase
    .from("memory_entries")
    .select("*")
    .eq("memory_id", memoryId);

  if (entriesError) {
    throw new Error("memory_entries 조회 실패: " + entriesError.message);
  }

  const entriesWithImages: MemoryBundle["entries"] = [];

  for (const entry of entries) {
    const { data: images, error: imagesError } = await supabase
      .from("memory_entry_images")
      .select("*")
      .eq("memory_entry_id", entry.memory_entry_id);

    if (imagesError) {
      throw new Error("memory_entry_images 조회 실패: " + imagesError.message);
    }

    entriesWithImages.push({ entry, images });
  }

  const { data: notifications, error: notificationsError } = await supabase
    .from("notifications")
    .select("*")
    .eq("memory_id", memoryId);

  if (notificationsError) {
    throw new Error("notifications 조회 실패: " + notificationsError.message);
  }

  return {
    memory,
    entries: entriesWithImages,
    notifications,
  };
}

// ✅ 2. 유저의 모든 MemoryBundles 조회
export async function getUserMemoryBundles(
  supabase: SupabaseClient,
  profileId: string
): Promise<MemoryBundle[]> {
  const { data, error } = await supabase
    .from("memories")
    .select(`
      *,
      memory_entries (
        *,
        memory_entry_images (*)
      ),
      notifications (*)
    `)
    .eq("profile_id", profileId)
    .order("date", { ascending: false });

  if (error) {
    throw new Error("모든 메모리 조회 실패: " + error.message);
  }

  if (!data) return [];

  return data.map((memory) => ({
    memory,
    entries: (memory.memory_entries ?? []).map((entry: any) => ({
      entry,
      images: entry.memory_entry_images ?? [],
    })),
    notifications: memory.notifications ?? [],
  }));
}
