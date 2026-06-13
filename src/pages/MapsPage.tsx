import { useState } from "react";
import { Map, AlertTriangle, Info, Eye, EyeOff } from "lucide-react";
import { useParkRidgeContext } from "../contexts/ParkRidgeDataContext";
import "./MapsPage.css";

export function MapsPage() {
  const { historicalLayers } = useParkRidgeContext();
  const [expanded, setExpanded] = useState<string | null>(null);

  const readyLayers = historicalLayers.filter((l) => l.status === "ready");
  const pendingLayers = historicalLayers.filter((l) => l.status !== "ready");

  return (
    <div className="page-container">
      <div className="page-hero">
        <span className="page-eyebrow">
          <Map size={12} strokeWidth={2.5} aria-hidden="true" />
          Historical Maps
        </span>
        <h1 className="page-title">Historical Map Layers</h1>
        <p className="page-subtitle">
          Aerial imagery, parcel snapshots, and survey layers that provide spatial
          evidence for Park Ridge's development history. Maps support the property
          story — they are not the primary navigation.
        </p>
      </div>

      <div className="glass-card maps-notice" style={{ marginBottom: 32 }}>
        <AlertTriangle size={16} strokeWidth={2} style={{ color: "#fbbf24", flexShrink: 0 }} aria-hidden="true" />
        <div>
          <strong>About map evidence</strong>
          <p>
            Historical map layers show what was observable at a given time. A parcel
            appearing on a 2000 snapshot does not prove the structure existed then —
            it shows the parcel boundary. Use layers as supporting context, not as
            direct proof of construction dates.
          </p>
        </div>
      </div>

      {readyLayers.length > 0 && (
        <section className="page-section">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">Available layers</span>
              <h2 className="section-title">Ready to view ({readyLayers.length})</h2>
            </div>
          </div>
          <div className="maps-layer-list">
            {readyLayers.map((layer) => (
              <div key={layer.id} className="maps-layer-card">
                <div className="maps-layer-header" onClick={() => setExpanded(expanded === layer.id ? null : layer.id)}>
                  <div className="maps-layer-icon">
                    <Map size={14} strokeWidth={2} aria-hidden="true" />
                  </div>
                  <div className="maps-layer-info">
                    <strong className="maps-layer-name">{layer.name}</strong>
                    <span className="maps-layer-year">{layer.year}</span>
                  </div>
                  <span className="badge badge-green">Ready</span>
                  {expanded === layer.id ? <EyeOff size={14} /> : <Eye size={14} />}
                </div>
                {expanded === layer.id && (
                  <div className="maps-layer-body">
                    {layer.description && (
                      <p className="maps-layer-desc">{layer.description}</p>
                    )}
                    <p className="maps-layer-note">
                      <Info size={11} strokeWidth={2.2} aria-hidden="true" />
                      This layer is available in the map view. Navigate to a property
                      to see it in context, or use the city-level map for spatial overview.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {pendingLayers.length > 0 && (
        <section className="page-section">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">Planned layers</span>
              <h2 className="section-title">In progress or needs georeferencing ({pendingLayers.length})</h2>
            </div>
          </div>
          <div className="maps-layer-list">
            {pendingLayers.slice(0, 10).map((layer) => (
              <div key={layer.id} className="maps-layer-card maps-layer-pending">
                <div className="maps-layer-header">
                  <div className="maps-layer-icon">
                    <Map size={14} strokeWidth={2} aria-hidden="true" />
                  </div>
                  <div className="maps-layer-info">
                    <strong className="maps-layer-name">{layer.name}</strong>
                    <span className="maps-layer-year">{layer.year}</span>
                  </div>
                  <span className="badge badge-amber">{layer.status?.replace(/_/g, " ")}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="page-section">
        <div className="glass-card">
          <span className="section-eyebrow">Map layer philosophy</span>
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            {[
              {
                title: "Maps support stories",
                body: "Historical map layers are evidence — they help contextualize when parcels appeared, what buildings looked like at a point in time, and how streets changed. They do not replace permit records, sale histories, or assessment data."
              },
              {
                title: "What we can and cannot prove",
                body: "A parcel snapshot proves the parcel boundary existed at that time. An aerial photo proves what was visible from above. Neither proves construction date, ownership, or interior conditions."
              },
              {
                title: "Uncertainty is documented",
                body: "Every layer includes a status and confidence level. Layers that need georeferencing or manual research are clearly labeled as pending. We do not present uncertain data as verified."
              }
            ].map((item) => (
              <div key={item.title}>
                <strong style={{ color: "rgba(255,255,255,0.80)", fontSize: "0.82rem", display: "block", marginBottom: 4 }}>{item.title}</strong>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: "0.78rem", lineHeight: 1.6 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
