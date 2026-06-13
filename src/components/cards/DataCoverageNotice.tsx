import { AlertTriangle } from "lucide-react";

type Props = {
  message: string;
  items?: string[];
};

export function DataCoverageNotice({ message, items }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "11px 14px",
        background: "rgba(251,191,36,0.06)",
        border: "1px solid rgba(251,191,36,0.18)",
        borderRadius: 10,
        alignItems: "flex-start",
      }}
    >
      <AlertTriangle
        size={13}
        strokeWidth={2}
        style={{ color: "#fbbf24", flexShrink: 0, marginTop: 2 }}
        aria-hidden="true"
      />
      <div>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.48)", fontSize: "0.75rem", lineHeight: 1.55 }}>
          {message}
        </p>
        {items && items.length > 0 && (
          <ul style={{ margin: "6px 0 0 14px", padding: 0, color: "rgba(255,255,255,0.35)", fontSize: "0.70rem", lineHeight: 1.65 }}>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
