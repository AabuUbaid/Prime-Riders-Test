import { supabase } from "./supabaseClient";

/**
 * Drop-in replacement for the Claude-artifact `window.storage` API,
 * backed by a single Supabase table (see sql/schema.sql).
 *
 * Behaviour matches what App.jsx already expects:
 *   - get(key, shared)    -> { key, value, shared } | null
 *   - set(key, value, sh) -> { key, value, shared } | null
 *   - delete(key, shared) -> { key, deleted, shared } | null
 *   - list(prefix, shared)-> { keys, prefix, shared } | null
 *
 * `shared: true`  = readable by anyone (used for the public stock kiosk)
 * `shared: false` = requires a logged-in staff session (see RLS policies)
 */
async function get(key, shared = false) {
  const { data, error } = await supabase
    .from("kv_store")
    .select("value")
    .eq("key", key)
    .eq("shared", shared)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { key, value: data.value, shared };
}

async function set(key, value, shared = false) {
  const { error } = await supabase
    .from("kv_store")
    .upsert(
      { key, shared, value, updated_at: new Date().toISOString() },
      { onConflict: "key,shared" }
    );

  if (error) throw error;
  return { key, value, shared };
}

async function del(key, shared = false) {
  const { error } = await supabase
    .from("kv_store")
    .delete()
    .eq("key", key)
    .eq("shared", shared);

  if (error) throw error;
  return { key, deleted: true, shared };
}

async function list(prefix = "", shared = false) {
  const { data, error } = await supabase
    .from("kv_store")
    .select("key")
    .eq("shared", shared)
    .like("key", `${prefix}%`);

  if (error) throw error;
  return { keys: (data || []).map((r) => r.key), prefix, shared };
}

export function installStorageShim() {
  window.storage = { get, set, delete: del, list };
}
