export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "Unknown";
  return new Intl.NumberFormat("en-US").format(value);
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
