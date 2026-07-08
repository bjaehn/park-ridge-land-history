import { StatGrid } from "@/components/ui/StatGrid";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { formatNumber } from "@/lib/formatters";
import {
  COMMUNITY_PROFILE_VINTAGE,
  COMMUNITY_PROFILE_KEY_FINDINGS,
  POPULATION_HISTORY,
  RACE_ETHNICITY,
  HOUSEHOLD_INCOME_MEDIAN,
  HOUSEHOLD_INCOME_DISTRIBUTION,
  EDUCATIONAL_ATTAINMENT,
  LANGUAGE_SPOKEN_AT_HOME,
  LAND_USE_INVENTORY,
  LAND_USE_TOTAL_ACRES,
  HOUSING_TYPE,
  HOUSING_TENURE_OWNER_OCCUPIED_PERCENT_APPROX,
  HOUSING_SIZE_BEDROOMS,
  TOP_EMPLOYERS_2019,
} from "@/lib/data/communityProfile";

// ─── Shared percent-bar row ───────────────────────────────────────────────────

function BarRow({ label, percent, meta }: { label: string; percent: number; meta?: string }) {
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-sm text-text-secondary truncate">{label}</span>
        <span className="text-xs text-text-muted shrink-0 tabular-nums">
          {percent.toFixed(1)}%{meta ? ` · ${meta}` : ""}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-raised overflow-hidden">
        <div
          className="h-full rounded-full bg-accent-purple/70"
          style={{ width: `${Math.min(100, Math.max(percent, 1))}%` }}
        />
      </div>
    </div>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">{title}</p>
      {children}
    </div>
  );
}

export function CommunityProfilePanel() {
  const latestPopulation = POPULATION_HISTORY.filter((p) => !p.projected).slice(-1)[0];
  const topEmployer = TOP_EMPLOYERS_2019[0];

  return (
    <div>
      <h2 className="section-heading">Community profile</h2>
      <p className="text-sm text-text-muted mb-4">
        A demographic and economic snapshot of today's Park Ridge, distinct from the dated
        historical facts above.
      </p>

      <StatGrid
        columns={4}
        stats={[
          { value: formatNumber(latestPopulation.population), label: "Population", note: `as of ${latestPopulation.year}` },
          { value: `$${formatNumber(HOUSEHOLD_INCOME_MEDIAN)}`, label: "Median household income" },
          { value: `~${HOUSING_TENURE_OWNER_OCCUPIED_PERCENT_APPROX}%`, label: "Owner-occupied housing" },
          {
            value: formatNumber(topEmployer.employees),
            label: "Largest employer's workforce",
            note: topEmployer.employer,
          },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 mt-8">
        <Subsection title="Race and ethnicity">
          {RACE_ETHNICITY.map((r) => (
            <BarRow key={r.label} label={r.label} percent={r.percent} meta={formatNumber(r.count)} />
          ))}
        </Subsection>

        <Subsection title="Household income">
          {HOUSEHOLD_INCOME_DISTRIBUTION.map((r) => (
            <BarRow key={r.label} label={r.label} percent={r.percent} />
          ))}
        </Subsection>

        <Subsection title="Educational attainment">
          {EDUCATIONAL_ATTAINMENT.map((r) => (
            <BarRow key={r.label} label={r.label} percent={r.percent} meta={formatNumber(r.count)} />
          ))}
        </Subsection>

        <Subsection title="Language spoken at home">
          {LANGUAGE_SPOKEN_AT_HOME.slice(0, 6).map((r) => (
            <BarRow key={r.label} label={r.label} percent={r.percent} />
          ))}
        </Subsection>

        <Subsection title="Housing type">
          {HOUSING_TYPE.map((r) => (
            <BarRow key={r.label} label={r.label} percent={r.percent} meta={formatNumber(r.count)} />
          ))}
        </Subsection>

        <Subsection title="Land use (2013 CMAP inventory)">
          {LAND_USE_INVENTORY.slice(0, 6).map((r) => (
            <BarRow key={r.label} label={r.label} percent={r.percent} meta={`${formatNumber(Math.round(r.acres))} ac`} />
          ))}
          <p className="text-xs text-text-muted mt-2">{formatNumber(Math.round(LAND_USE_TOTAL_ACRES))} acres total.</p>
        </Subsection>
      </div>

      <div className="mt-8">
        <Subsection title="Top employers, 2019">
          <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="text-left px-4 py-2.5 text-text-secondary font-medium">Employer</th>
                    <th className="text-left px-4 py-2.5 text-text-secondary font-medium">Product / service</th>
                    <th className="text-right px-4 py-2.5 text-text-secondary font-medium">Employees</th>
                  </tr>
                </thead>
                <tbody>
                  {TOP_EMPLOYERS_2019.map((e) => (
                    <tr key={e.employer} className="border-b border-surface-border last:border-0">
                      <td className="px-4 py-2.5 text-text-primary">{e.employer}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{e.product}</td>
                      <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">
                        {formatNumber(e.employees)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Subsection>
      </div>

      <div className="mt-8">
        <Subsection title="Key findings">
          <ul className="space-y-1.5">
            {COMMUNITY_PROFILE_KEY_FINDINGS.map((f) => (
              <li key={f} className="text-sm text-text-secondary flex gap-2">
                <span className="text-text-muted shrink-0">–</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Subsection>
      </div>

      <InlineSourceNote className="mt-4">{COMMUNITY_PROFILE_VINTAGE}</InlineSourceNote>
    </div>
  );
}
