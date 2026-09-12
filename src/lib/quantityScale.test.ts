import { describe, expect, it } from "vitest";
import { parseLeadingNumber, formatNumber, scaleQuantity, mergeQuantities } from "@/lib/quantityScale";

describe("parseLeadingNumber", () => {
  // The regex's own trailing `\s*` swallows the single space between the
  // number and whatever follows, so `rest` never carries a leading space.
  it("parses a plain integer", () => {
    expect(parseLeadingNumber("2 cups")).toEqual({ value: 2, rest: "cups" });
  });

  it("parses a decimal with a comma or a dot", () => {
    expect(parseLeadingNumber("1.5 kg")).toEqual({ value: 1.5, rest: "kg" });
    expect(parseLeadingNumber("1,5 kg")).toEqual({ value: 1.5, rest: "kg" });
  });

  it("parses a simple fraction", () => {
    expect(parseLeadingNumber("1/2 cup")).toEqual({ value: 0.5, rest: "cup" });
  });

  it("parses a mixed number", () => {
    expect(parseLeadingNumber("1 1/2 tsp")).toEqual({ value: 1.5, rest: "tsp" });
  });

  it("returns null when there's no leading number", () => {
    expect(parseLeadingNumber("to taste")).toBeNull();
    expect(parseLeadingNumber("a pinch")).toBeNull();
  });
});

describe("formatNumber", () => {
  it("keeps whole numbers as integers", () => {
    expect(formatNumber(4)).toBe("4");
    expect(formatNumber(4.0)).toBe("4");
  });

  it("trims trailing zeroes off decimals", () => {
    expect(formatNumber(1.5)).toBe("1.5");
    expect(formatNumber(1.25)).toBe("1.25");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatNumber(1 / 3)).toBe("0.33");
  });
});

describe("scaleQuantity", () => {
  it("returns null/empty quantities unchanged", () => {
    expect(scaleQuantity(null, 2)).toBeNull();
  });

  it("returns the original string when the multiplier is 1", () => {
    expect(scaleQuantity("2 cups", 1)).toBe("2 cups");
  });

  it("scales a plain number and keeps the trailing unit", () => {
    expect(scaleQuantity("2 cups", 2)).toBe("4 cups");
    // The output always joins the scaled number and unit with a single
    // space, even when the input had none ("1kg").
    expect(scaleQuantity("1kg", 0.5)).toBe("0.5 kg");
  });

  it("scales a fraction", () => {
    expect(scaleQuantity("1/2 cup", 4)).toBe("2 cup");
  });

  it("leaves unparseable quantities untouched", () => {
    expect(scaleQuantity("to taste", 2)).toBe("to taste");
  });
});

describe("mergeQuantities", () => {
  it("returns whichever side is present when the other is null", () => {
    expect(mergeQuantities(null, "2 kg")).toBe("2 kg");
    expect(mergeQuantities("2 kg", null)).toBe("2 kg");
    expect(mergeQuantities(null, null)).toBeNull();
  });

  it("treats identical quantities (case-insensitive) as already merged", () => {
    expect(mergeQuantities("2 KG", "2 kg")).toBe("2 KG");
  });

  it("sums two different numeric quantities sharing the same unit", () => {
    expect(mergeQuantities("2 kg", "1 kg")).toBe("3 kg");
    expect(mergeQuantities("1/2 cup", "1/4 cup")).toBe("0.75 cup");
  });

  it("falls back to concatenation when units differ or aren't numeric", () => {
    expect(mergeQuantities("to taste", "2 tbsp")).toBe("to taste + 2 tbsp");
    expect(mergeQuantities("2 kg", "3 lbs")).toBe("2 kg + 3 lbs");
  });
});
