import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { MapView } from "@/components/MapView";
import { PinGroupContent } from "./_PinGroupContent";
import { getPinGroupSummary, getPinGroupDetail, fetchPinPrefixBbox } from "@/lib/data/pinGroups";
import { formatCount } from "@/lib/formatters";

type Props = { params: { prefix: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const prefix = decodeURIComponent(params.prefix);
  const summary = await getPinGroupSummary(prefix).catch(() => null);
  if (!summary) return { title: "PIN group not found" };
  return {
    title: `PIN ${prefix}`,
    description: `${summary.parcelCount} properties in ${summary.levelLabel} (PIN prefix ${prefix}) in Park Ridge, Illinois.`,
  };
}

export default async function PinGroupPage({ params }: Props) {
  const prefix = decodeURIComponent(params.prefix);

  const [summary, detail, bbox] = await Promise.all([
    getPinGroupSummary(prefix).catch(() => null),
    getPinGroupDetail(prefix).catch(() => null),
    fetchPinPrefixBbox(prefix).catch(() => null),
  ]);

  if (!summary) notFound();

  const pins = detail?.parcels.map((p) => p.pin).filter(Boolean) ?? [];

  return (
    <div className="page-shell">
      <Breadcrumb items={summary.breadcrumbParts} />

      <PageHeader
        eyebrow={summary.level}
        title={summary.levelLabel}
        subtitle={`${formatCount(summary.parcelCount, "property", "properties")} share this PIN prefix.`}
      />

      <PinGroupContent
        prefix={prefix}
        initialDetail={detail}
        mapSlot={
          <MapView
            scope={{
              kind: "subdivision",
              subdivisionId: prefix,
              pins: pins.length > 0 ? pins : undefined,
              bbox: bbox ?? undefined,
            }}
            height="520px"
            showExpand
          />
        }
      />

      <p className="text-xs text-text-muted mt-6 pt-4 border-t border-surface-border">
        <Link href="/sources" className="hover:underline">About our data sources</Link>
      </p>
    </div>
  );
}
