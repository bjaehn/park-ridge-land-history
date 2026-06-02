import type { DecadeBucket } from "./parcelTypes";
import type { ExpressionSpecification } from "maplibre-gl";

export const decadeOrder: DecadeBucket[] = [
  "Pre-1900",
  "1900s",
  "1910s",
  "1920s",
  "1930s",
  "1940s",
  "1950s",
  "1960s",
  "1970s",
  "1980s",
  "1990s",
  "2000s",
  "2010s",
  "2020s",
  "Unknown",
  "Suspicious"
];

export const decadeColors: Record<DecadeBucket, string> = {
  "Pre-1900": "#4c3b4d",
  "1900s": "#6b4e71",
  "1910s": "#785f9a",
  "1920s": "#6d7eb8",
  "1930s": "#4f9db8",
  "1940s": "#4fb6a8",
  "1950s": "#68bd7d",
  "1960s": "#9ac35d",
  "1970s": "#d0bd4d",
  "1980s": "#e6a64a",
  "1990s": "#df8252",
  "2000s": "#c96a70",
  "2010s": "#a85f84",
  "2020s": "#6d617c",
  Unknown: "#9ca3af",
  Suspicious: "#111827"
};

export function colorForDecade(value?: string | null): string {
  if (!value) return decadeColors.Unknown;
  return decadeColors[value as DecadeBucket] ?? decadeColors.Unknown;
}

export function mapLibreFillColor(): ExpressionSpecification {
  const expression: unknown[] = ["match", ["get", "decade_built"]];
  decadeOrder.forEach((bucket) => {
    expression.push(bucket, decadeColors[bucket]);
  });
  expression.push(decadeColors.Unknown);
  return expression as ExpressionSpecification;
}
