import type { SupabaseClient } from "@supabase/supabase-js";

export async function listCollections(client: SupabaseClient, ownerId: string) {
  const [folders, lists, savedViews] = await Promise.all([
    client.from("folders").select("*").eq("owner_id", ownerId).is("deleted_at", null).order("sort_order"),
    client.from("lead_lists").select("*").eq("owner_id", ownerId).is("deleted_at", null).order("created_at", { ascending: false }),
    client.from("saved_views").select("*").eq("owner_id", ownerId).is("deleted_at", null).order("created_at", { ascending: false })
  ]);

  for (const result of [folders, lists, savedViews]) {
    if (result.error) {
      throw result.error;
    }
  }

  return {
    folders: folders.data ?? [],
    lists: lists.data ?? [],
    savedViews: savedViews.data ?? []
  };
}

export async function createFolder(client: SupabaseClient, ownerId: string, name: string, parentId?: string | null) {
  const { data, error } = await client
    .from("folders")
    .insert({ owner_id: ownerId, name, parent_id: parentId ?? null })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createLeadList(client: SupabaseClient, ownerId: string, name: string, folderId?: string | null) {
  const { data, error } = await client
    .from("lead_lists")
    .insert({ owner_id: ownerId, name, folder_id: folderId ?? null })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createSavedView(client: SupabaseClient, ownerId: string, input: { name: string; filters: unknown; sorting: unknown; columnState: unknown }) {
  const { data, error } = await client
    .from("saved_views")
    .insert({
      owner_id: ownerId,
      name: input.name,
      filters: input.filters,
      sorting: input.sorting,
      column_state: input.columnState
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
