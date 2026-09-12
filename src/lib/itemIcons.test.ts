import { describe, expect, it } from "vitest";
import { normalize, getItemIcon, getTitleIcon } from "@/lib/itemIcons";

describe("normalize", () => {
  it("lowercases and strips Romanian diacritics", () => {
    expect(normalize("Brânză")).toBe("branza");
    expect(normalize("Pâine")).toBe("paine");
    expect(normalize("Ș, ș, Ş, ş")).toBe("s, s, s, s");
    expect(normalize("Ț, ț, Ţ, ţ")).toBe("t, t, t, t");
  });
});

describe("getItemIcon", () => {
  it("matches an English grocery item", () => {
    expect(getItemIcon("Milk")).toBe("🥛");
  });

  it("matches the Romanian name for the same item", () => {
    expect(getItemIcon("Lapte")).toBe("🥛");
  });

  it("matches a diacritic Romanian word via its plain-letter spelling", () => {
    expect(getItemIcon("Brânză")).toBe(getItemIcon("branza"));
  });

  it("falls back to a shopping cart for anything unrecognized", () => {
    expect(getItemIcon("Some Unrecognizable Gadget Xyz")).toBe("🛒");
    expect(getItemIcon("")).toBe("🛒");
  });

  it("matches whole words, not substrings of unrelated words", () => {
    // "gin" is a real ingredient, but shouldn't match inside "ginger".
    expect(getItemIcon("Ginger")).not.toBe(getItemIcon("Gin"));
  });
});

describe("getTitleIcon", () => {
  it("uses a recognized keyword from the title when present", () => {
    expect(getTitleIcon("Chicken Curry", "🍽️")).toBe("🍗");
  });

  it("falls back to the provided default instead of the generic cart icon", () => {
    expect(getTitleIcon("Grandma's Secret Recipe", "🍽️")).toBe("🍽️");
    expect(getTitleIcon("Grandma's Secret Recipe", "🍸")).toBe("🍸");
  });
});
