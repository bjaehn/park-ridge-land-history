import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SourceNote } from "@/components/ui/SourceNote";
import { MapView } from "@/components/MapView";
import { SectionDetailContent } from "./_SectionDetailContent";
import { fetchSectionBlocks, fetchSectionBbox, fetchSectionPins } from "@/lib/supabase/blockQueries";

type Props = { params: { sectionId: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sectionId = decodeURIComponent(params.sectionId);
  return {
    title: `Section ${sectionId}`,
    description: `Property history for section ${sectionId} in Park Ridge.`,
  };
}

export default async function SectionDetailPage({ params }: Props) {
  const sectionId = decodeURIComponent(params.sectionId);

  const [blocks, bbox, pins] = await Promise.all([
    fetchSectionBlocks(sectionId).catch(() => [] as Awaited<ReturnType<typeof fetchSectionBlocks>>),
    fetchSectionBbox(sectionId).catch(() => null),
    fetchSectionPins(sectionId).catch(() => [] as string[]),
  ]);

  if (!blocks.length) notFound();

  const totalParcels = blocks.reduce((sum, b) => sum + b.parcelCount, 0);

  return (
    <div className="page-shell">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: `Section ${sectionId}`, current: true },
        ]}
      />
      <PageHeader
        eyebrow="Section"
        title={`Section ${sectionId}`}
        subtitle={`${totalParcels} properties across ${blocks.length} block${blocks.length === 1 ? "" : "s"}.`}
      />

      <SectionDetailContent
        sectionId={sectionId}
        mapSlot={
          <MapView
            scope={{
              kind: "subdivision",
              subdivisionId: sectionId,
              pins: pins.length > 0 ? pins : undefined,
              bbox: bbox ?? undefined,
            }}
            height="420px"
            showExpand
          />
        }
      />

      <SourceNote sources={["assessor", "permits", "recorder"]} />
    </div>
  );
}
