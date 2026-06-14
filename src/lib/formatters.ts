export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "Unknown";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "Unknown";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatYear(value?: number | null): string {
  if (!value) return "Unknown";
  return String(value);
}

export function formatFlags(value?: string[] | string | null): string {
  if (!value) return "None";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  return value.trim() || "None";
}

export function eraLabel(medianYear: number): string {
  if (medianYear < 1920) return "Early Park Ridge";
  if (medianYear < 1945) return "Pre-war era";
  if (medianYear < 1962) return "Postwar boom";
  if (medianYear < 1978) return "Mid-century";
  return "Modern era";
}
