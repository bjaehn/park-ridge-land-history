import { Flame } from "lucide-react";

type Props = {
  confidence?: string | null;
};

export function TeardownBadge({ confidence }: Props) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border bg-amber-500/15 text-amber-600 border-amber-500/30"
      title={
        confidence === "high"
          ? "Teardown rebuild confirmed by permit records"
          : "Teardown rebuild inferred from assessment history"
      }
    >
      <Flame className="w-3 h-3 shrink-0" aria-hidden="true" />
      Teardown rebuild
    </span>
  );
}
