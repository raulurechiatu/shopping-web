import { describe, expect, it } from "vitest";
import { getItemCategory } from "@/lib/itemCategories";

describe("getItemCategory", () => {
  it("categorizes produce", () => {
    expect(getItemCategory("Banana")).toBe("produce");
    expect(getItemCategory("Morcovi")).toBe("produce"); // Romanian: carrots
  });

  it("categorizes dairy", () => {
    expect(getItemCategory("Cheddar cheese")).toBe("dairy");
    expect(getItemCategory("Iaurt")).toBe("dairy"); // Romanian: yogurt
  });

  it("categorizes meat & seafood", () => {
    expect(getItemCategory("Chicken breast")).toBe("meat");
    expect(getItemCategory("Salmon")).toBe("meat");
  });

  it("categorizes beverages, including alcohol", () => {
    expect(getItemCategory("Vodka")).toBe("beverages");
    expect(getItemCategory("Sparkling water")).toBe("beverages");
  });

  it("categorizes household and personal care separately from pantry", () => {
    expect(getItemCategory("Toilet paper")).toBe("household");
    expect(getItemCategory("Shampoo")).toBe("personal_care");
    expect(getItemCategory("Rice")).toBe("pantry");
  });

  it("falls back to 'other' for anything unrecognized", () => {
    expect(getItemCategory("Some Unrecognizable Gadget Xyz")).toBe("other");
  });

  it("matches case-insensitively and through Romanian diacritics", () => {
    expect(getItemCategory("BRÂNZĂ")).toBe("dairy");
    expect(getItemCategory("branza")).toBe("dairy");
  });
});
