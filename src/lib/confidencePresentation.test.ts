import { describe, it, expect } from "vitest";
import {
  confidenceDotClassFor,
  confidenceTextClassFor,
  confidenceLabelFor,
  confidenceShortLabelFor,
  confidencePlainTextFor,
} from "./confidencePresentation";

describe("confidenceDotClassFor / confidenceTextClassFor", () => {
  it("maps each known level to its token class", () => {
    expect(confidenceDotClassFor("high")).toBe("bg-confidence-high");
    expect(confidenceDotClassFor("medium")).toBe("bg-confidence-medium");
    expect(confidenceDotClassFor("low")).toBe("bg-confidence-low");
    expect(confidenceTextClassFor("high")).toBe("text-confidence-high");
    expect(confidenceTextClassFor("medium")).toBe("text-confidence-medium");
    expect(confidenceTextClassFor("low")).toBe("text-confidence-low");
  });

  it("falls back to the unknown class for unrecognized/null/undefined input", () => {
    expect(confidenceDotClassFor("unknown")).toBe("bg-confidence-unknown");
    expect(confidenceDotClassFor(null)).toBe("bg-confidence-unknown");
    expect(confidenceDotClassFor(undefined)).toBe("bg-confidence-unknown");
    expect(confidenceDotClassFor("bogus")).toBe("bg-confidence-unknown");
    expect(confidenceTextClassFor(null)).toBe("text-confidence-unknown");
  });
});

describe("confidenceLabelFor / confidenceShortLabelFor", () => {
  it("returns the capitalized word for each level", () => {
    expect(confidenceLabelFor("high")).toBe("High");
    expect(confidenceLabelFor("medium")).toBe("Medium");
    expect(confidenceLabelFor("low")).toBe("Low");
    expect(confidenceLabelFor(null)).toBe("Unknown");
  });

  it("returns the short badge word for each level", () => {
    expect(confidenceShortLabelFor("high")).toBe("Verified");
    expect(confidenceShortLabelFor("medium")).toBe("Sourced");
    expect(confidenceShortLabelFor("low")).toBe("Research lead");
    expect(confidenceShortLabelFor(undefined)).toBe("Unknown source");
  });
});

describe("confidencePlainTextFor", () => {
  it("returns the base full-sentence label for each level", () => {
    expect(confidencePlainTextFor("high")).toBe("Verified by official record");
    expect(confidencePlainTextFor("medium")).toBe("Supported by cited source");
    expect(confidencePlainTextFor("low")).toBe("Research lead, not yet verified");
    expect(confidencePlainTextFor("unknown")).toBe("Unknown");
  });

  it("lets a domain override specific levels without affecting the others", () => {
    const text = confidencePlainTextFor("high", { high: "Verified by cited source" });
    expect(text).toBe("Verified by cited source");
    // medium/low/unknown fall through to the shared base strings unaffected
    expect(confidencePlainTextFor("medium", { high: "Verified by cited source" })).toBe(
      "Supported by cited source"
    );
  });
});
