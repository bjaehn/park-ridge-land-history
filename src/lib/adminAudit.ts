import { cookies } from "next/headers";
import { adminSupabase } from "@/lib/supabase/adminClient";

const COOKIE_NAME = "admin_session";

export async function getAdminActor(): Promise<string> {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;
    if (!token) return "unknown";
    const parts = token.split(".");
    if (parts.length !== 3) return "unknown";
    const payload = JSON.parse(atob(parts[1])) as { sub?: string; exp?: number };
    if (!payload.sub || !payload.exp || Date.now() > payload.exp) return "unknown";
    return payload.sub;
  } catch {
    return "unknown";
  }
}

export type AdminChangeEntry = {
  tableName: string;
  rowId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  action: string;
};

export async function logAdminChange(
  entries: AdminChangeEntry[],
  opts?: { changeGroup?: string }
): Promise<void> {
  if (entries.length === 0) return;
  try {
    const actor = await getAdminActor();
    await adminSupabase.from("admin_change_log").insert(
      entries.map((e) => ({
        table_name: e.tableName,
        row_id: e.rowId,
        field_name: e.fieldName,
        old_value: e.oldValue,
        new_value: e.newValue,
        action: e.action,
        actor,
        change_group: opts?.changeGroup ?? null,
      }))
    );
  } catch {
    // Audit logging must never block the write it's logging for.
  }
}
