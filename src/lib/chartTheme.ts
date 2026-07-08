/**
 * Single source of truth for Recharts colors across the app. Every value
 * here is sourced directly from tailwind.config.ts -- no new hexes.
 *
 * Before this file existed, each chart hardcoded its own close-but-not-quite
 * approximation of these tokens (Tailwind's stock slate/violet/teal/amber
 * scale), so charts visibly didn't match the surrounding UI chrome or each
 * other. Import from here instead of hardcoding a hex in a chart file.
 */

export const CHART_COLORS = {
  grid: "#2a2a38",       // surface.border
  axisTick: "#5c5a72",   // text.muted
  tooltipBg: "#18181f",  // surface.raised (matches ConfidenceBadge's tooltip)
  tooltipBorder: "#2a2a38", // surface.border
  tooltipLabel: "#9896b0",  // text.secondary
  tooltipValue: "#f0eef8",  // text.primary
  primary: "#8b7ff0",       // accent.purple
  primaryMuted: "#8b7ff030", // accent.purple at ~19% alpha, for de-emphasized bars
  marketSale: "#4fb6a8",    // accent.teal
  nonMarketOrAppeal: "#e6a64a", // accent.amber
  secondary: "#5c5a72",     // text.muted, for de-emphasized/commercial series
  secondaryMuted: "#5c5a7230", // text.muted at ~19% alpha
} as const;
