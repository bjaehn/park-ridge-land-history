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
        <p className="section-heading">{heading}</p>
        <ConstructionByDecadeChart rows={rows} />
      </div>
      <div>
        <p className="section-heading">Homes by decade</p>
        <CoverageTable rows={rows} total={total} />
      </div>
    </div>
  );
}
