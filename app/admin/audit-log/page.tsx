import { adminSupabase } from "@/lib/supabase/adminClient";

type ChangeLogRow = {
  id: string;
  table_name: string;
  row_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  action: string;
  actor: string;
  change_group: string | null;
  created_at: string;
};

export default async function AuditLogPage() {
  const { data } = await adminSupabase
    .from("admin_change_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as ChangeLogRow[];

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
          Admin
        </p>
        <h1 className="text-2xl font-bold text-text-primary">Audit Log</h1>
        <p className="text-sm text-text-secondary mt-1">
          The 200 most recent tracked admin changes: subdivision merges, neighborhood
          boundary edits, and deed research notes. Other admin writes are not yet logged.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">No tracked changes yet.</p>
      ) : (
        <div className="overflow-x-auto border border-surface-border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-xs text-text-muted uppercase tracking-wide">
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Table</th>
                <th className="px-3 py-2 font-medium">Row</th>
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Change</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const prevGroup = i > 0 ? rows[i - 1].change_group : undefined;
                const newGroupBoundary = row.change_group && row.change_group !== prevGroup;
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-surface-border last:border-0 ${newGroupBoundary ? "border-t-2 border-t-accent-teal/40" : ""}`}
                  >
                    <td className="px-3 py-2 text-text-muted whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{row.actor}</td>
                    <td className="px-3 py-2 text-text-secondary font-mono text-xs">{row.table_name}</td>
                    <td className="px-3 py-2 text-text-secondary font-mono text-xs">{row.row_id}</td>
                    <td className="px-3 py-2 text-text-secondary">{row.field_name}</td>
                    <td className="px-3 py-2 text-text-secondary">
                      <span className="text-text-muted">{row.old_value ?? "—"}</span>
                      {" → "}
                      <span className="text-text-primary">{row.new_value ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{row.action}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
