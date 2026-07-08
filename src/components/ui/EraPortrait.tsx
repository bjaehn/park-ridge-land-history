"use client";

import { useState, useEffect } from "react";
import { ConstructionByDecadeChart } from "./ConstructionByDecadeChart";
import { CoverageTable } from "./CoverageTable";
import type { DecadeRow } from "./ConstructionByDecadeChart";

type Props = {
  rows?: DecadeRow[];
  heading?: string;
};

export function EraPortrait({ rows: initialRows, heading = "When Park Ridge was built, wave by wave" }: Props) {
  const [fetchedRows, setFetchedRows] = useState<DecadeRow[]>([]);

  useEffect(() => {
    if (initialRows) return;
    import("@/lib/supabase/homeQueries")
      .then((m) => m.fetchDecadeDistribution())
      .then((data) => setFetchedRows(data.map((r) => ({ decade: r.decade, count: r.count }))))
      .catch(() => null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = initialRows ?? fetchedRows;
  if (!rows.length) return null;
  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <div className="two-col-layout">
      <div>
        <h2 className="section-heading">{heading}</h2>
        <ConstructionByDecadeChart rows={rows} />
      </div>
      <div>
        <h2 className="section-heading">Homes by decade</h2>
        <CoverageTable rows={rows} total={total} />
      </div>
    </div>
  );
}
