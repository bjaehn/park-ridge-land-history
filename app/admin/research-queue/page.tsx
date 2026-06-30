import { adminSupabase } from "@/lib/supabase/adminClient";
import { ResearchQueueContent } from "./_ResearchQueueContent";

export const dynamic = "force-dynamic";

export default async function ResearchQueuePage({
  searchParams,
}: {
  searchParams: { subdivision?: string };
}) {
  const subdivisionId = searchParams.subdivision?.trim() || null;

  const [{ data: rows }, { data: subRow }] = await Promise.all([
    adminSupabase
      .from("deed_research_queue")
      .select(
        "id, pin, address, suspected_subdivision_id, suspected_subdivision_name, ai_reasoning, priority_score, source_pins, status, queue_type, adjacent_subdivision_names, created_at, updated_at"
      )
      .order("priority_score", { ascending: false })
      .order("created_at", { ascending: true }),
    subdivisionId
      ? adminSupabase
          .from("subdivisions")
          .select("name")
          .eq("id", subdivisionId)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const entries = rows ?? [];
  const subdivisionName = subRow?.name ?? null;

  const pending = entries.filter((e) => e.status === "pending").length;
  const researched = entries.filter((e) => e.status === "researched").length;
  const notFound = entries.filter((e) => e.status === "not_found").length;
  const skipped = entries.filter((e) => e.status === "skipped").length;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
            Admin
          </p>
          <h1 className="text-2xl font-bold text-text-primary">Research Queue</h1>
          <p className="text-sm text-text-secondary mt-1">
            Properties likely to be in a known subdivision, queued for deed research at Cook County.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        {[
          { label: "Pending", value: pending, color: "text-amber-400" },
          { label: "Researched", value: researched, color: "text-emerald-400" },
          { label: "Not found", value: notFound, color: "text-text-muted" },
          { label: "Skipped", value: skipped, color: "text-text-muted" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface-raised border border-surface-border rounded-lg px-5 py-3 min-w-[7rem]">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <ResearchQueueContent
        initialEntries={entries}
        subdivisionId={subdivisionId ?? undefined}
        subdivisionName={subdivisionName ?? undefined}
      />
    </div>
  );
}
