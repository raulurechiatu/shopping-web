import { describe, expect, it } from "vitest";
import { convertQuantity } from "@/lib/unitConversion";

describe("convertQuantity", () => {
  it("passes through null quantity or null target unchanged", () => {
    expect(convertQuantity(null, "metric")).toBeNull();
    expect(convertQuantity("2 oz", null)).toBe("2 oz");
  });

  it("returns the original string when no unit is recognized", () => {
    expect(convertQuantity("a pinch", "metric")).toBe("a pinch");
    expect(convertQuantity("3 eggs", "metric")).toBe("3 eggs");
  });

  it("leaves a quantity unconverted when it's already in the target system", () => {
    expect(convertQuantity("2 cups", "imperial")).toBe("2 cups");
    expect(convertQuantity("200 g", "metric")).toBe("200 g");
  });

  it("converts imperial weight to metric, switching between g and kg", () => {
    // Converted values >= 10 round to a whole number, below round to one
    // decimal place.
    expect(convertQuantity("1 lb", "metric")).toBe("454 g");
    expect(convertQuantity("10 lb", "metric")).toBe("4.5 kg");
  });

  it("converts metric weight to imperial, switching between oz and lb", () => {
    expect(convertQuantity("100 g", "imperial")).toBe("3.5 oz");
    expect(convertQuantity("1 kg", "imperial")).toBe("2.2 lb");
  });

  it("converts imperial volume to metric, switching between ml and L", () => {
    expect(convertQuantity("1 cup", "metric")).toBe("237 ml");
    expect(convertQuantity("2 tbsp", "metric")).toBe("30 ml");
  });

  it("converts metric volume to imperial, picking tsp/tbsp/cup by size", () => {
    expect(convertQuantity("5 ml", "imperial")).toBe("1 tsp");
    expect(convertQuantity("20 ml", "imperial")).toBe("1.4 tbsp");
    expect(convertQuantity("250 ml", "imperial")).toBe("1.1 cup");
  });

  it("converts Fahrenheit to Celsius glued to the degree sign", () => {
    expect(convertQuantity("350 F", "metric")).toBe("177°C");
  });

  it("converts Celsius to Fahrenheit", () => {
    expect(convertQuantity("180°C", "imperial")).toBe("356°F");
  });

  it("keeps any text after the unit", () => {
    expect(convertQuantity("1 lb chicken breast", "metric")).toBe("454 g chicken breast");
  });
});
