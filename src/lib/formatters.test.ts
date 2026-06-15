import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatCurrency,
  formatYear,
  formatPercent,
  formatSqft,
  formatCount,
  formatDecade,
  formatAddress,
  eraLabel,
  compareToScope,
  getChangeSignal,
  confidenceFor,
} from "./formatters";

// ---------------------------------------------------------------------------
// formatNumber
// ---------------------------------------------------------------------------
describe("formatNumber", () => {
  it("formats integers with commas", () => {
    expect(formatNumber(13381)).toBe("13,381");
  });
  it("returns Unknown for null", () => {
    expect(formatNumber(null)).toBe("Unknown");
  });
  it("returns Unknown for undefined", () => {
    expect(formatNumber(undefined)).toBe("Unknown");
  });
  it("returns Unknown for NaN", () => {
    expect(formatNumber(NaN)).toBe("Unknown");
  });
  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------
describe("formatCurrency", () => {
  it("formats dollar amounts without cents", () => {
    expect(formatCurrency(250000)).toBe("$250,000");
  });
  it("returns Unknown for null", () => {
    expect(formatCurrency(null)).toBe("Unknown");
  });
});

// ---------------------------------------------------------------------------
// formatYear
// ---------------------------------------------------------------------------
describe("formatYear", () => {
  it("returns string year for valid number", () => {
    expect(formatYear(1952)).toBe("1952");
  });
  it("returns Unknown for 0", () => {
    expect(formatYear(0)).toBe("Unknown");
  });
  it("returns Unknown for null", () => {
    expect(formatYear(null)).toBe("Unknown");
  });
  it("returns Unknown for out-of-range year", () => {
    expect(formatYear(1700)).toBe("Unknown");
    expect(formatYear(2200)).toBe("Unknown");
  });
});

// ---------------------------------------------------------------------------
// formatPercent
// ---------------------------------------------------------------------------
describe("formatPercent", () => {
  it("rounds to 0 decimal places by default", () => {
    expect(formatPercent(12.5)).toBe("13%");   // toFixed(0) rounds 12.5 up
    expect(formatPercent(12.4)).toBe("12%");
  });
  it("respects decimals param", () => {
    expect(formatPercent(12.567, 1)).toBe("12.6%");
  });
  it("returns Unknown for null", () => {
    expect(formatPercent(null)).toBe("Unknown");
  });
});

// ---------------------------------------------------------------------------
// formatSqft
// ---------------------------------------------------------------------------
describe("formatSqft", () => {
  it("formats square footage", () => {
    expect(formatSqft(8250)).toBe("8,250 sq ft");
  });
  it("rounds fractional sqft", () => {
    expect(formatSqft(8250.7)).toBe("8,251 sq ft");
  });
  it("returns Unknown for null", () => {
    expect(formatSqft(null)).toBe("Unknown");
  });
});

// ---------------------------------------------------------------------------
// formatCount -- pluralization (fixes "1 permits", "1 sales")
// ---------------------------------------------------------------------------
describe("formatCount", () => {
  it("uses singular for 1", () => {
    expect(formatCount(1, "permit", "permits")).toBe("1 permit");
  });
  it("uses plural for 0", () => {
    expect(formatCount(0, "permit", "permits")).toBe("0 permits");
  });
  it("uses plural for 2+", () => {
    expect(formatCount(12, "permit", "permits")).toBe("12 permits");
  });
  it("singular sale", () => {
    expect(formatCount(1, "sale", "sales")).toBe("1 sale");
  });
  it("plural sales", () => {
    expect(formatCount(3, "sale", "sales")).toBe("3 sales");
  });
  it("singular home", () => {
    expect(formatCount(1, "home", "homes")).toBe("1 home");
  });
});

// ---------------------------------------------------------------------------
// formatDecade -- fixes "1950ss" and "1900ss" bugs
// ---------------------------------------------------------------------------
describe("formatDecade", () => {
  it("passes through a correctly formatted decade string", () => {
    expect(formatDecade("1950s")).toBe("1950s");
  });
  it("fixes a double-s bug", () => {
    expect(formatDecade("1950ss")).toBe("1950s");
  });
  it("fixes the 1900ss bug", () => {
    expect(formatDecade("1900ss")).toBe("1900s");
  });
  it("derives decade from a raw year", () => {
    expect(formatDecade(1952)).toBe("1950s");
    expect(formatDecade(1900)).toBe("1900s");
    expect(formatDecade(2023)).toBe("2020s");
  });
  it("maps Pre-1900 correctly", () => {
    expect(formatDecade("Pre-1900")).toBe("Pre-1900");
    expect(formatDecade(1899)).toBe("Pre-1900");
    expect(formatDecade(1800)).toBe("Pre-1900");
  });
  it("hides internal Suspicious flag", () => {
    expect(formatDecade("Suspicious")).toBe("Unknown");
  });
  it("returns Unknown for null", () => {
    expect(formatDecade(null)).toBe("Unknown");
  });
  it("returns Unknown for undefined", () => {
    expect(formatDecade(undefined)).toBe("Unknown");
  });
});

// ---------------------------------------------------------------------------
// formatAddress
// ---------------------------------------------------------------------------
describe("formatAddress", () => {
  it("converts UPPERCASE to Title Case", () => {
    expect(formatAddress("123 MAIN ST")).toBe("123 Main St");
  });
  it("expands street type abbreviations", () => {
    expect(formatAddress("456 OAK AVE")).toBe("456 Oak Ave");
    expect(formatAddress("789 ELM BLVD")).toBe("789 Elm Blvd");
  });
  it("handles directional abbreviations", () => {
    expect(formatAddress("100 N WESTERN AVE")).toBe("100 N Western Ave");
  });
  it("returns fallback for null", () => {
    expect(formatAddress(null)).toBe("Address not on record");
  });
  it("returns fallback for empty string", () => {
    expect(formatAddress("")).toBe("Address not on record");
  });
});

// ---------------------------------------------------------------------------
// eraLabel
// ---------------------------------------------------------------------------
describe("eraLabel", () => {
  it("labels pre-1920 as Early Park Ridge", () => {
    expect(eraLabel(1915)).toBe("Early Park Ridge");
  });
  it("labels 1920-1944 as Pre-war era", () => {
    expect(eraLabel(1930)).toBe("Pre-war era");
  });
  it("labels 1945-1961 as Postwar boom", () => {
    expect(eraLabel(1952)).toBe("Postwar boom");
  });
  it("labels 1962-1977 as Mid-century", () => {
    expect(eraLabel(1970)).toBe("Mid-century");
  });
  it("labels 1978-1999 as Late 20th century", () => {
    expect(eraLabel(1985)).toBe("Late 20th century");
  });
  it("labels 2000+ as Modern era", () => {
    expect(eraLabel(2010)).toBe("Modern era");
  });
});

// ---------------------------------------------------------------------------
// compareToScope -- fixes "the this block" bug; tests every scope x metric
// ---------------------------------------------------------------------------
describe("compareToScope", () => {
  // year_built x street
  it("year_built: older than street", () => {
    const result = compareToScope(1920, 1955, "street", "year_built");
    expect(result).toMatch(/before/);
    expect(result).toMatch(/this street/);
    expect(result).not.toMatch(/the this/);
  });
  it("year_built: newer than street", () => {
    const result = compareToScope(1980, 1955, "street", "year_built");
    expect(result).toMatch(/after/);
    expect(result).toMatch(/this street/);
  });
  it("year_built: similar on street", () => {
    const result = compareToScope(1953, 1955, "street", "year_built");
    expect(result).toMatch(/same time/);
    expect(result).toMatch(/this street/);
  });

  // year_built x neighborhood
  it("year_built: older than neighborhood", () => {
    const result = compareToScope(1920, 1955, "neighborhood", "year_built");
    expect(result).toMatch(/before/);
    expect(result).toMatch(/this neighborhood/);
    expect(result).not.toMatch(/the this/);
  });

  // year_built x city
  it("year_built: older than Park Ridge", () => {
    const result = compareToScope(1920, 1955, "city", "year_built");
    expect(result).toMatch(/before/);
    expect(result).toMatch(/Park Ridge/);
    expect(result).not.toMatch(/the this/);
    expect(result).not.toMatch(/the Park Ridge/);
  });

  // permit_count x all scopes
  it("permit_count: more than street", () => {
    const result = compareToScope(6, 2, "street", "permit_count");
    expect(result).toMatch(/More permit activity/);
    expect(result).toMatch(/this street/);
  });
  it("permit_count: less than neighborhood", () => {
    const result = compareToScope(1, 4, "neighborhood", "permit_count");
    expect(result).toMatch(/Less permit activity/);
    expect(result).toMatch(/this neighborhood/);
  });
  it("permit_count: similar in city", () => {
    const result = compareToScope(3, 3, "city", "permit_count");
    expect(result).toMatch(/Similar permit activity/);
    expect(result).toMatch(/Park Ridge/);
  });

  // sale_count x all scopes
  it("sale_count: more than street", () => {
    const result = compareToScope(8, 2, "street", "sale_count");
    expect(result).toMatch(/more often/);
    expect(result).toMatch(/this street/);
  });
  it("sale_count: less than neighborhood", () => {
    const result = compareToScope(0, 4, "neighborhood", "sale_count");
    expect(result).toMatch(/less often/);
    expect(result).toMatch(/this neighborhood/);
  });
  it("sale_count: similar in city", () => {
    const result = compareToScope(3, 3, "city", "sale_count");
    expect(result).toMatch(/as often/);
    expect(result).toMatch(/Park Ridge/);
  });

  // assessed_value x all scopes
  it("assessed_value: above street", () => {
    const result = compareToScope(200000, 130000, "street", "assessed_value");
    expect(result).toMatch(/above/);
    expect(result).toMatch(/this street/);
  });
  it("assessed_value: below neighborhood", () => {
    const result = compareToScope(80000, 140000, "neighborhood", "assessed_value");
    expect(result).toMatch(/below/);
    expect(result).toMatch(/this neighborhood/);
  });
  it("assessed_value: near city", () => {
    const result = compareToScope(130000, 130000, "city", "assessed_value");
    expect(result).toMatch(/near/);
    expect(result).toMatch(/Park Ridge/);
  });

  // null/missing values
  it("handles null property value", () => {
    const result = compareToScope(null, 1955, "street", "year_built");
    expect(result).toMatch(/No data/);
  });
  it("handles null reference value", () => {
    const result = compareToScope(1955, null, "street", "year_built");
    expect(result).toMatch(/Not enough/);
  });
});

// ---------------------------------------------------------------------------
// getChangeSignal -- single signal, no contradictions possible
// ---------------------------------------------------------------------------
describe("getChangeSignal", () => {
  it("returns Rebuild pressure when teardowns present", () => {
    expect(getChangeSignal({ recent_teardown_count: 1 })).toBe("Rebuild pressure");
  });
  it("returns Rebuild pressure when recent permits are high", () => {
    expect(getChangeSignal({ recent_permit_count: 3 })).toBe("Rebuild pressure");
  });
  it("returns Reinvestment for moderate permit count", () => {
    expect(getChangeSignal({ permit_count: 2 })).toBe("Reinvestment");
  });
  it("returns Turnover for high sale count", () => {
    expect(getChangeSignal({ sale_count: 5 })).toBe("Turnover");
  });
  it("returns Dormant for low activity", () => {
    expect(getChangeSignal({ permit_count: 1, sale_count: 2 })).toBe("Dormant");
  });
  it("returns Dormant for empty input", () => {
    expect(getChangeSignal({})).toBe("Dormant");
  });
  it("Rebuild pressure takes priority over Reinvestment", () => {
    expect(getChangeSignal({ recent_teardown_count: 1, permit_count: 5 })).toBe("Rebuild pressure");
  });
});

// ---------------------------------------------------------------------------
// confidenceFor
// ---------------------------------------------------------------------------
describe("confidenceFor", () => {
  it("returns High for a clean well-sourced record", () => {
    expect(confidenceFor({ year_built: 1952, source_note: "Assessor verified" })).toBe("High");
  });
  it("returns Medium for a clean record without source note", () => {
    expect(confidenceFor({ year_built: 1952 })).toBe("Medium");
  });
  it("returns Low when quality flags are present", () => {
    expect(confidenceFor({ year_built: 1952, data_quality_flags: ["missing_assessor_join"] })).toBe("Low");
  });
  it("returns Low when year_built is missing", () => {
    expect(confidenceFor({})).toBe("Low");
  });
  it("returns Low for null year_built", () => {
    expect(confidenceFor({ year_built: null })).toBe("Low");
  });
  it("returns Medium for many improvements (uncertain primary selection)", () => {
    expect(confidenceFor({ year_built: 1952, improvement_count: 4 })).toBe("Medium");
  });
});
