export function formatPin(pin: string | null | undefined): string {
  if (!pin) return "—";
  const digits = pin.replace(/\D/g, "");
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 10)}-${digits.slice(10, 14)}`;
  }
  return pin;
}

export function normalizePin(input: string): string {
  return input.replace(/\D/g, "").padStart(14, "0");
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatAddress(address: string | null | undefined): string {
  if (!address) return "Unknown Address";
  return address
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function formatYear(year: number | null | undefined): string {
  if (!year || year < 1800 || year > 2100) return "Unknown";
  return String(year);
}

export function formatDecade(year: number | null | undefined): string {
  if (!year || year < 1800 || year > 2100) return "Unknown";
  const decade = Math.floor(year / 10) * 10;
  return decade < 1900 ? "Pre-1900" : `${decade}s`;
}

export function ageFromYear(year: number | null | undefined): string {
  if (!year || year < 1800) return "—";
  const age = new Date().getFullYear() - year;
  if (age <= 0) return "New";
  if (age === 1) return "1 year old";
  return `${age} years old`;
}

export function formatSqft(sqft: number | null | undefined): string {
  if (!sqft || sqft <= 0) return "—";
  return `${formatNumber(Math.round(sqft))} sq ft`;
}

export function truncateAddress(address: string | null | undefined, maxLen = 32): string {
  const formatted = formatAddress(address);
  if (formatted.length <= maxLen) return formatted;
  return formatted.slice(0, maxLen - 1) + "…";
}

export function formatFlags(value?: string[] | string | null): string {
  if (!value) return "None";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  return value.trim() || "None";
}
