import { describe, expect, it } from "vitest";
import { expandSynonyms, termMatches } from "@/lib/ingredientSynonyms";

describe("expandSynonyms", () => {
  it("includes the term itself", () => {
    expect(expandSynonyms("Rom")).toContain("rom");
  });

  it("expands a Romanian pantry item to its English equivalents", () => {
    const terms = expandSynonyms("Rom");
    expect(terms).toContain("rum");
  });

  it("expands a group with more than two members", () => {
    const terms = expandSynonyms("Lamaie");
    expect(terms).toEqual(expect.arrayContaining(["lamaie", "lemon", "lime"]));
  });

  it("returns just the normalized term for an item with no synonym group", () => {
    expect(expandSynonyms("Broccoli")).toEqual(["broccoli"]);
  });
});

describe("termMatches", () => {
  it("matches a whole-word term inside a longer ingredient name", () => {
    expect(termMatches("Light rum", "rum")).toBe(true);
    expect(termMatches("Light rum", "rom")).toBe(false);
  });

  it("does not match a term that's only a substring of a different word", () => {
    expect(termMatches("Ginger", "gin")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(termMatches("LIGHT RUM", "rum")).toBe(true);
  });

  it("returns false for an empty term", () => {
    expect(termMatches("Light rum", "")).toBe(false);
    expect(termMatches("Light rum", "   ")).toBe(false);
  });

  it("cross-matches a recipe ingredient against pantry synonyms end to end", () => {
    // This is the actual "What can I make?" matching path: a pantry item
    // named in Romanian should surface a recipe that lists the English name.
    const pantrySynonyms = expandSynonyms("Rom");
    expect(pantrySynonyms.some((s) => termMatches("Light rum", s))).toBe(true);
  });
});
