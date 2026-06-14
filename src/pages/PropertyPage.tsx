import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Home, Grid3x3, MapPin, ChevronRight, Calendar, Building2,
  DollarSign, Wrench, FileText, Database, BarChart2, Map as MapIcon
} from "lucide-react";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import { fetchJson } from "../lib/jsonData";
import type { ParcelFeature, ParcelProperties, HouseEvolutionEvent } from "../lib/parcelTypes";
import { PropertyTimeline } from "../components/timeline/PropertyTimeline";
import { AssessmentChart } from "../components/charts/AssessmentChart";
import { SalesPriceChart } from "../components/charts/SalesPriceChart";
import { PermitActivityChart } from "../components/charts/PermitActivityChart";
import { SourceDrawer, CitationBadge, useSourceDrawer } from "../components/sources/SourceDrawer";
import { StatCard } from "../components/cards/StatCard";
import { ROUTES } from "../lib/routes";
import {
  formatAddress, formatPin, formatCurrency, formatYear,
  formatNumber, formatSqft, ageFromYear
} from "../lib/formatters";
import { buildAreaSummaries } from "../lib/areaGroups";
import { addRecentlyViewed } from "../lib/hooks/useRecentlyViewed";
import "./PropertyPage.css";

type DetailChunk = {
  prefix: string;
  record_count: number;
  records: Record<string, ParcelProperties>;
};

const chunkCache = new Map<string, Promise<DetailChunk | null>>();

function loadChunk(prefix: string): Promise<DetailChunk | null> {
  if (!chunkCache.has(prefix)) {
    chunkCache.set(prefix, fetchJson<DetailChunk>(`/data/parcel_details/${prefix}.json`));
  }
  return chunkCache.get(prefix)!;
}

function parseJson<T>(value: T | string | null | undefined): T | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; } catch { return null; }
  }
  return value;
}

export function PropertyPage() {
  const { pin: rawPin } = useParams<{ pin: string }>();
  const { parcelsByPin, parcels, isLoading: dataLoading } = useParkRidgeContext();
  const { open: drawerOpen, openDrawer, closeDrawer } = useSourceDrawer();

  const [detailProps, setDetailProps] = useState<ParcelProperties | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const pin = rawPin ? decodeURIComponent(rawPin) : null;

  const indexParcel: ParcelFeature | undefined = useMemo(
    () => (pin ? parcelsByPin.get(pin) : undefined),
    [parcelsByPin, pin]
  );

  useEffect(() => {
    if (!pin) return;
    addRecentlyViewed(pin);
    setDetailProps(null);
    setLoadingDetail(true);
    const prefix = pin.replace(/\D/g, "").slice(0, 4) || "unknown";
    loadChunk(prefix).then((chunk) => {
      setDetailProps(chunk?.records[pin] ?? null);
      setLoadingDetail(false);
    });
  }, [pin]);

  const parcel: ParcelFeature | null = useMemo(() => {
    if (!indexParcel) return null;
    if (!detailProps) return indexParcel;
    return { ...indexParcel, properties: { ...indexParcel.properties, ...detailProps } };
  }, [indexParcel, detailProps]);

  const props = parcel?.properties;

  const timeline = useMemo((): HouseEvolutionEvent[] => {
    const raw = parseJson(props?.house_evolution_timeline);
    return Array.isArray(raw) ? raw : [];
  }, [props]);

  const assessmentTimeline = useMemo(() => {
    const raw = parseJson(props?.assessed_value_timeline);
    if (!Array.isArray(raw)) return [];
    return raw.filter((d): d is { year: number; value: number } =>
      typeof d?.year === "number" && typeof d?.value === "number"
    );
  }, [props]);

  const neighborhoodLabel = useMemo(() => {
    if (!parcels || !pin) return null;
    const summaries = buildAreaSummaries(parcels, "neighborhoods", { type: "FeatureCollection", features: [] });
    return summaries.features.find((a) => a.properties.parcelPins.includes(pin))?.properties.label ?? null;
  }, [parcels, pin]);

  const blockId = indexParcel?.properties.street_block_id ?? null;

  const nearbyProperties = useMemo(() => {
    if (!parcels || !blockId || !pin) return [];
    return parcels.features
      .filter((f) =>
        f.properties.street_block_id === blockId &&
        (f.properties.pin_normalized || f.properties.pin_original) !== pin
      )
      .slice(0, 8);
  }, [parcels, blockId, pin]);

  const isLoading = dataLoading || loadingDetail;

  if (!pin) {
    return (
      <div className="page-container">
        <div className="empty-state">No property PIN specified.</div>
      </div>
    );
  }

  if (!dataLoading && !indexParcel) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p>Property not found for PIN: {formatPin(pin)}</p>
          <Link to={ROUTES.search} className="link-pill" style={{ marginTop: "16px" }}>
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const address = formatAddress(props?.address);

  return (
    <div className="page-container-wide property-page">
      {/* ─── Breadcrumb ─── */}
      <nav className="property-breadcrumb" aria-label="Property location hierarchy">
        <Link to={ROUTES.discover} className="breadcrumb-link">Park Ridge</Link>
        <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
        {neighborhoodLabel && (
          <>
            <Link to={ROUTES.neighborhoods} className="breadcrumb-link">{neighborhoodLabel}</Link>
            <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
          </>
        )}
        <span className="breadcrumb-current">{address}</span>
      </nav>

      {/* ─── Property Identity ─── */}
      <header className="property-header">
        <div className="property-header-icon">
          <Home size={22} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <div className="property-header-body">
          <div className="property-header-eyebrow">
            <span className="page-eyebrow">
              <Home size={11} strokeWidth={2.5} aria-hidden="true" />
              Property
            </span>
            <CitationBadge onClick={openDrawer} />
          </div>
          <h1 className="property-title">{isLoading && !props ? "Loading…" : address}</h1>
          <div className="property-meta-row">
            <span className="property-pin">PIN {formatPin(pin)}</span>
            {props?.year_built && (
              <span>Built {formatYear(props.year_built)} · {ageFromYear(props.year_built)}</span>
            )}
            {neighborhoodLabel && (
              <Link to={ROUTES.neighborhoods} className="property-meta-link">
                <MapPin size={11} strokeWidth={2.5} aria-hidden="true" />
                {neighborhoodLabel}
              </Link>
            )}
          </div>
        </div>

        <div className="property-header-actions">
          <Link to={blockId ? ROUTES.block(blockId) : ROUTES.blocks} className="property-context-link">
            <Grid3x3 size={13} strokeWidth={2} aria-hidden="true" />
            Block
          </Link>
          <Link to={ROUTES.neighborhoods} className="property-context-link">
            <MapPin size={13} strokeWidth={2} aria-hidden="true" />
            Neighborhood
          </Link>
          <Link to={ROUTES.parkRidge} className="property-context-link">
            <MapIcon size={13} strokeWidth={2} aria-hidden="true" />
            Park Ridge
          </Link>
          {pin && (
            <Link to={ROUTES.mapsWithPin(pin)} className="property-context-link">
              <MapIcon size={13} strokeWidth={2} aria-hidden="true" />
              View on map
            </Link>
          )}
        </div>
      </header>

      {isLoading && !props ? (
        <div className="loading-spinner">
          <div className="spinner-dot" />
          <div className="spinner-dot" />
          <div className="spinner-dot" />
          <span>Loading property data…</span>
        </div>
      ) : (
        <>
          {/* ─── Quick Stats ─── */}
          <section className="page-section">
            <div className="grid-4">
              <StatCard
                label="Year Built"
                value={formatYear(props?.year_built)}
                subValue={ageFromYear(props?.year_built)}
                icon={Calendar}
                accent="cyan"
              />
              <StatCard
                label="Building Size"
                value={formatSqft(props?.building_sqft)}
                subValue={props?.land_sqft ? `${formatSqft(props.land_sqft)} lot` : "Lot size unknown"}
                icon={Building2}
                accent="blue"
              />
              <StatCard
                label="Current Assessment"
                value={formatCurrency(props?.latest_assessed_total)}
                subValue={props?.latest_assessed_year ? `As of ${props.latest_assessed_year}` : "Assessment year unknown"}
                icon={BarChart2}
                accent="purple"
              />
              <StatCard
                label="Last Sale Price"
                value={formatCurrency(props?.latest_sale_price)}
                subValue={props?.latest_sale_year ? `Sold ${props.latest_sale_year}` : undefined}
                icon={DollarSign}
                accent="green"
              />
            </div>
          </section>

          {/* ─── Main Layout ─── */}
          <div className="property-layout">
            {/* Left: Timeline */}
            <div className="property-left">
              {/* Timeline */}
              <section className="page-section">
                <div className="section-header">
                  <div>
                    <span className="section-eyebrow">Verified records</span>
                    <h2 className="section-title">Life of the Property</h2>
                  </div>
                  <span className="section-note">
                    {timeline.length} event{timeline.length !== 1 ? "s" : ""} on record
                  </span>
                </div>
                <div className="glass-card-sm">
                  <PropertyTimeline events={timeline} />
                </div>
              </section>

              {/* Property Details */}
              <section className="page-section">
                <div className="section-header">
                  <h2 className="section-title">Property Details</h2>
                </div>
                <div className="property-details-grid glass-card-sm">
                  <PropertyDetail label="Address" value={address} />
                  <PropertyDetail label="PIN" value={formatPin(pin)} mono />
                  <PropertyDetail label="Year Built" value={formatYear(props?.year_built)} />
                  <PropertyDetail label="Decade Built" value={props?.decade_built ?? "—"} />
                  <PropertyDetail label="Building Size" value={formatSqft(props?.building_sqft)} />
                  <PropertyDetail label="Land Size" value={formatSqft(props?.land_sqft)} />
                  <PropertyDetail label="Property Class" value={props?.property_class ?? "—"} />
                  <PropertyDetail label="Permit Count" value={props?.permit_count != null ? formatNumber(props.permit_count) : "—"} />
                  <PropertyDetail label="Sale Count" value={props?.sale_count != null ? formatNumber(props.sale_count) : "—"} />
                  <PropertyDetail label="Assessment Years" value={props?.assessed_year_count != null ? formatNumber(props.assessed_year_count) : "—"} />
                  {props?.hargis_record_count != null && props.hargis_record_count > 0 && (
                    <PropertyDetail label="Historic Survey" value={`${props.hargis_record_count} record${props.hargis_record_count !== 1 ? "s" : ""}`} accent />
                  )}
                  {props?.nearest_park_name && (
                    <PropertyDetail
                      label="Nearest Park"
                      value={`${props.nearest_park_name}${props.nearest_park_dist_ft ? ` (${Math.round(props.nearest_park_dist_ft)} ft)` : ""}`}
                    />
                  )}
                  {props?.nearest_metra_stop_name && (
                    <PropertyDetail
                      label="Nearest Metra"
                      value={`${props.nearest_metra_stop_name}${props.nearest_metra_stop_dist_ft ? ` (${Math.round(props.nearest_metra_stop_dist_ft / 5280 * 10) / 10} mi)` : ""}`}
                    />
                  )}
                </div>
              </section>

              {/* Historic Survey */}
              {props?.hargis_name && (
                <section className="page-section">
                  <div className="section-header">
                    <div>
                      <span className="section-eyebrow">Hargis Historic Survey</span>
                      <h2 className="section-title">Historic Record</h2>
                    </div>
                  </div>
                  <div className="glass-card-sm property-historic">
                    <div className="property-historic-header">
                      <strong>{props.hargis_name}</strong>
                      {props.hargis_nr_eval && (
                        <span className="badge badge-amber">{props.hargis_nr_eval}</span>
                      )}
                    </div>
                    {props.hargis_arch_class && (
                      <p className="property-historic-detail">
                        <strong>Style:</strong> {props.hargis_arch_class}
                      </p>
                    )}
                    {props.hargis_wall_materials && (
                      <p className="property-historic-detail">
                        <strong>Materials:</strong> {props.hargis_wall_materials}
                      </p>
                    )}
                    {props.hargis_architect && (
                      <p className="property-historic-detail">
                        <strong>Architect:</strong> {props.hargis_architect}
                      </p>
                    )}
                    {props.hargis_opinion_significance && (
                      <p className="property-historic-significance">
                        {props.hargis_opinion_significance}
                      </p>
                    )}
                    {props.hargis_photo_url && (
                      <a href={props.hargis_photo_url} target="_blank" rel="noopener noreferrer" className="link-pill" style={{ marginTop: "8px" }}>
                        <FileText size={12} strokeWidth={2} aria-hidden="true" />
                        View historic photo
                      </a>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Right: Charts */}
            <div className="property-right">
              {/* Assessment Chart */}
              {assessmentTimeline.length > 0 && (
                <section className="page-section">
                  <div className="section-header">
                    <div>
                      <span className="section-eyebrow">Cook County Assessor</span>
                      <h2 className="section-title">Assessed Value</h2>
                    </div>
                    <CitationBadge onClick={openDrawer} />
                  </div>
                  <div className="glass-card-sm">
                    <AssessmentChart data={assessmentTimeline} />
                    <div className="chart-footnote">
                      {props?.assessed_value_change_pct != null && (
                        <span>
                          Total change: {props.assessed_value_change_pct > 0 ? "+" : ""}
                          {props.assessed_value_change_pct.toFixed(1)}%
                          {props.first_assessed_year && props.latest_assessed_year
                            ? ` from ${props.first_assessed_year} to ${props.latest_assessed_year}`
                            : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Sales Chart */}
              {timeline.filter((e) => e.event_type === "sale" && e.price).length >= 2 && (
                <section className="page-section">
                  <div className="section-header">
                    <div>
                      <span className="section-eyebrow">Cook County Sales</span>
                      <h2 className="section-title">Sale Price History</h2>
                    </div>
                    <CitationBadge onClick={openDrawer} />
                  </div>
                  <div className="glass-card-sm">
                    <SalesPriceChart events={timeline} />
                  </div>
                </section>
              )}

              {/* Permit Activity Chart */}
              {(props?.permit_count ?? 0) > 1 && (
                <section className="page-section">
                  <div className="section-header">
                    <div>
                      <span className="section-eyebrow">Cook County Permits</span>
                      <h2 className="section-title">Permit Activity</h2>
                    </div>
                    <CitationBadge onClick={openDrawer} />
                  </div>
                  <div className="glass-card-sm">
                    <PermitActivityChart events={timeline} />
                    <div className="chart-footnote">Cook County permit records begin 2019. Pre-2019 activity is not reflected.</div>
                  </div>
                </section>
              )}

              {/* Nearby Context */}
              {(props?.nearby_teardown_count ?? 0) > 0 && (
                <section className="page-section">
                  <div className="glass-card-sm property-teardown-notice">
                    <span className="badge badge-red">Area Activity</span>
                    <p>
                      <strong>{props?.nearby_teardown_count} demolition{(props?.nearby_teardown_count ?? 0) !== 1 ? "s" : ""}</strong>
                      {" "}recorded within 500 feet of this property.
                    </p>
                  </div>
                </section>
              )}

              {/* AI Summary placeholder */}
              <section className="page-section">
                <div className="glass-card-sm property-ai-placeholder">
                  <div className="ai-placeholder-header">
                    <span className="badge badge-amber">Coming soon</span>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem" }}>AI summary</span>
                  </div>
                  <p className="ai-placeholder-body">
                    AI-generated property narrative — grounded in verified records, with citations.
                    Activates when data pipeline is connected.
                  </p>
                </div>
              </section>

              {/* Nearby Properties */}
              {nearbyProperties.length > 0 && (
                <section className="page-section">
                  <div className="section-header">
                    <div>
                      <span className="section-eyebrow">Same Census block</span>
                      <h2 className="section-title">Nearby Properties</h2>
                    </div>
                    {blockId && (
                      <Link to={ROUTES.block(blockId)} className="link-pill">
                        View block
                      </Link>
                    )}
                  </div>
                  <div className="nearby-property-list glass-card-sm">
                    {nearbyProperties.map((f) => {
                      const nPin = f.properties.pin_normalized || f.properties.pin_original || "";
                      return (
                        <Link key={nPin} to={ROUTES.property(nPin)} className="nearby-property-item">
                          <span className="nearby-address">{f.properties.address ? formatAddress(f.properties.address) : formatPin(nPin)}</span>
                          <span className="nearby-meta">
                            {f.properties.year_built ? `${f.properties.year_built}` : "—"}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Data Coverage */}
              <section className="page-section">
                <div className="section-header">
                  <h2 className="section-title">Data Coverage</h2>
                </div>
                <div className="glass-card-sm">
                  <div className="property-coverage-grid">
                    <CoverageItem
                      label="Permit records"
                      count={props?.permit_count ?? 0}
                      lastYear={props?.latest_permit_year}
                      icon={Wrench}
                      accent="#fbbf24"
                      note="From 2019+"
                    />
                    <CoverageItem
                      label="Sale records"
                      count={props?.sale_count ?? 0}
                      lastYear={props?.latest_sale_year}
                      icon={DollarSign}
                      accent="#34d399"
                    />
                    <CoverageItem
                      label="Assessment years"
                      count={props?.assessed_year_count ?? 0}
                      lastYear={props?.latest_assessed_year}
                      icon={BarChart2}
                      accent="#a78bfa"
                    />
                    <CoverageItem
                      label="Historic survey"
                      count={props?.hargis_record_count ?? 0}
                      icon={FileText}
                      accent="#fbbf24"
                    />
                  </div>
                  <button className="property-sources-btn" onClick={openDrawer}>
                    <Database size={13} strokeWidth={2} aria-hidden="true" />
                    View all data sources
                  </button>
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      {/* ─── Source Drawer ─── */}
      {parcel && (
        <SourceDrawer parcel={parcel} open={drawerOpen} onClose={closeDrawer} />
      )}
    </div>
  );
}

function PropertyDetail({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`property-detail-row${accent ? " is-accent" : ""}`}>
      <dt className="property-detail-label">{label}</dt>
      <dd className={`property-detail-value${mono ? " is-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function CoverageItem({
  label,
  count,
  lastYear,
  icon: Icon,
  accent,
  note,
}: {
  label: string;
  count: number;
  lastYear?: number | null;
  icon: typeof Wrench;
  accent: string;
  note?: string;
}) {
  return (
    <div className="coverage-item">
      <div className="coverage-icon" style={{ color: accent, borderColor: `${accent}33`, background: `${accent}12` }}>
        <Icon size={13} strokeWidth={2} aria-hidden="true" />
      </div>
      <div className="coverage-body">
        <strong className="coverage-count" style={{ color: count > 0 ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.30)" }}>
          {count > 0 ? count : "None"}
        </strong>
        <span className="coverage-label">{label}</span>
        {lastYear && count > 0 && (
          <span className="coverage-last">Last: {lastYear}</span>
        )}
        {note && <span className="coverage-note">{note}</span>}
      </div>
    </div>
  );
}
