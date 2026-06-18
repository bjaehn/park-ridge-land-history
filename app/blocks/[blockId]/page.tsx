import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SourceNote } from "@/components/ui/SourceNote";
import { MapView } from "@/components/MapView";
import { BlockDetailContent } from "./_BlockDetailContent";
import { fetchBlockParcels, fetchBlockBbox } from "@/lib/supabase/blockQueries";

type Props = { params: { blockId: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const blockId = decodeURIComponent(params.blockId);
  return {
    title: `Block ${blockId}`,
    description: `Property history for block ${blockId} in Park Ridge.`,
  };
}

export default async function BlockDetailPage({ params }: Props) {
  const blockId = decodeURIComponent(params.blockId);
  const sectionId = blockId.slice(0, 4);

  const [pins, bbox] = await Promise.all([
    fetchBlockParcels(blockId).then((p) => p.map((x) => x.pin)).catch(() => [] as string[]),
    fetchBlockBbox(blockId).catch(() => null),
  ]);

  if (!pins.length) notFound();

  return (
    <div className="page-shell">
      <Breadcrumb
        items={[
          { label: "Park Ridge", href: "/city" },
          { label: `Township ${blockId.slice(0, 2)}`, href: `/pin/${encodeURIComponent(blockId.slice(0, 2))}` },
          { label: `Section ${sectionId}`, href: `/sections/${encodeURIComponent(sectionId)}` },
          { label: `Block ${blockId}`, current: true },
        ]}
      />
      <PageHeader
        eyebrow="City block"
        title={`Block ${blockId}`}
        subtitle={`${pins.length} ${pins.length === 1 ? "property" : "properties"} on this block.`}
      />

      <BlockDetailContent
        blockId={blockId}
        mapSlot={
          <MapView
            scope={{
              kind: "subdivision",
              subdivisionId: blockId,
              pins: pins.length > 0 ? pins : undefined,
              bbox: bbox ?? undefined,
            }}
            height="400px"
            showExpand
          />
        }
      />

      <SourceNote sources={["assessor", "permits", "recorder"]} />
    </div>
  );
}
