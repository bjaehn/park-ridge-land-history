import { SubdivisionIcon } from "@/lib/icons";
import { formatCount } from "@/lib/formatters";

type Props = {
  totalCount: number;
};

export function SubdivisionsHero({ totalCount }: Props) {
  return (
    <div className="mb-10">
      <div className="flex items-start gap-3 mb-4">
        <SubdivisionIcon
          size={22}
          strokeWidth={1.5}
          className="text-text-muted mt-1 shrink-0"
          aria-hidden="true"
        />
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            Park Ridge Subdivisions
          </h1>
          <p className="text-lg text-text-secondary mt-1 leading-relaxed">
            The recorded plats that created Park Ridge's lots, blocks, streets, and homes.
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <p className="text-sm text-text-secondary leading-relaxed">
          A subdivision plat is a legal document filed at the Cook County Recorder of Deeds. It
          divides a larger piece of land into the named lots, numbered blocks, and dedicated
          streets that define a neighborhood. Every home in Park Ridge sits on a lot created by
          one of these recorded plats, often more than a century ago.
        </p>
        <p className="text-sm text-text-secondary leading-relaxed">
          This record includes{" "}
          {totalCount > 0
            ? formatCount(totalCount, "subdivision", "subdivisions")
            : "subdivision records"}{" "}
          recorded, referenced, or identified for Park Ridge. Each record links to its known
          properties, original developer, plat document reference, and any sources we have
          verified or traced. Records with lower confidence are marked as research leads or
          needing source review.
        </p>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-muted py-3 border-y border-surface-border">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-confidence-high flex-shrink-0" aria-hidden="true" />
          Verified by official record
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-confidence-medium flex-shrink-0" aria-hidden="true" />
          Supported by cited source
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-confidence-low flex-shrink-0" aria-hidden="true" />
          Research lead, needs verification
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-confidence-unknown flex-shrink-0" aria-hidden="true" />
          Unknown source
        </span>
      </div>
    </div>
  );
}
