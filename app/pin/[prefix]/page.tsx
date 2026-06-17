import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SourceNote } from "@/components/ui/SourceNote";
import { PinGroupContent } from "./_PinGroupContent";
import { getPinGroupSummary } from "@/lib/data/pinGroups";
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
  const summary = await getPinGroupSummary(prefix).catch(() => null);

  if (!summary) notFound();

  return (
    <div className="page-shell">
      <Breadcrumb items={summary.breadcrumbParts} />

      <PageHeader
        eyebrow="PIN segment"
        title={summary.levelLabel}
        subtitle={`${formatCount(summary.parcelCount, "property", "properties")} share this PIN prefix.`}
      />

      <PinGroupContent prefix={prefix} />

      <SourceNote sources={["assessor"]} />
    </div>
  );
}
