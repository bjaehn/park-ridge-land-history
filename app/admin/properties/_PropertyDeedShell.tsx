"use client";

import { useState } from "react";
import { ParcelForm } from "./_ParcelForm";
import { DeedAnalysisPanel } from "./_DeedAnalysisPanel";

type Neighborhood = { id: string; label: string };

type Parcel = {
  pin_normalized: string;
  address: string | null;
  year_built: number | null;
  property_class: string | null;
  building_sqft: number | null;
  land_sqft: number | null;
  municipality: string | null;
  pin_township: string | null;
  pin_section: string | null;
  pin_block: string | null;
  pin_parcel: string | null;
  pin_unit: string | null;
  deed_notes: string | null;
  official_planning_neighborhood_id?: string | null;
  business_district_id?: string | null;
  local_neighborhood_id?: string | null;
};

type Props = {
  parcel: Parcel;
  officialPlanningNeighborhoods: Neighborhood[];
  businessDistrictNeighborhoods: Neighborhood[];
  localMarketNeighborhoods: Neighborhood[];
  allSubdivisions: { id: string; name: string }[];
};

export function PropertyDeedShell({
  parcel,
  officialPlanningNeighborhoods,
  businessDistrictNeighborhoods,
  localMarketNeighborhoods,
  allSubdivisions,
}: Props) {
  const [deedNotes, setDeedNotes] = useState(parcel.deed_notes ?? "");

  return (
    <>
      <ParcelForm
        parcel={parcel}
        officialPlanningNeighborhoods={officialPlanningNeighborhoods}
        businessDistrictNeighborhoods={businessDistrictNeighborhoods}
        localMarketNeighborhoods={localMarketNeighborhoods}
        deedNotes={deedNotes}
        onDeedNotesChange={setDeedNotes}
      />
      <DeedAnalysisPanel
        pin={parcel.pin_normalized}
        address={parcel.address}
        deedNotes={deedNotes}
        allSubdivisions={allSubdivisions}
        onDeedNotesExtracted={setDeedNotes}
      />
    </>
  );
}
