// A focused EN<->RO synonym table for matching pantry items against recipe
// ingredient names. Deliberately one real-world concept per group (unlike
// the icon/category keyword lists in itemIcons.ts, which intentionally
// lump broader ideas together for display purposes) — a match here is
// meant to say "this is actually the same ingredient".
const SYNONYM_GROUPS: string[][] = [
  ["rum", "rom"],
  ["vodka", "vodca"],
  ["whiskey", "whisky"],
  ["brandy", "cognac"],
  ["cola", "coca cola", "coke", "pepsi"],
  ["lemon", "lime", "lamaie"],
  ["orange", "portocala", "portocale"],
  ["milk", "lapte"],
  ["cream", "smantana", "frisca"],
  ["sugar", "zahar"],
  ["honey", "miere"],
  ["mint", "menta"],
  ["egg", "eggs", "ou", "oua"],
  ["butter", "unt"],
  ["flour", "faina"],
  ["garlic", "usturoi"],
  ["onion", "ceapa"],
  ["salt", "sare"],
  ["pepper", "piper"],
  ["water", "apa"],
  ["soda water", "club soda", "sifon"],
  ["tonic water", "apa tonica"],
  ["beer", "bere"],
  ["wine", "vin"],
  ["champagne", "sampanie"],
  ["pineapple", "ananas"],
  ["strawberry", "capsuni", "capsuna"],
  ["banana", "banane"],
  ["apple", "mar", "mere"],
  ["cinnamon", "scortisoara"],
  ["vanilla", "vanilie"],
  ["chocolate", "ciocolata"],
  ["coconut", "nuca de cocos"],
  ["ginger", "ghimbir"],
  ["basil", "busuioc"],
  ["parsley", "patrunjel"],
  ["dill", "marar"],
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ăâ]/g, "a")
    .replace(/î/g, "i")
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Returns every word/phrase this pantry item is known to mean, including
// itself — e.g. "Rom" -> ["rom", "rum"], "Lamaie" -> ["lamaie", "lemon",
// "lime"]. Each term is meant to be checked with termMatches, not compared
// directly, so word-boundary behavior stays correct on both sides.
export function expandSynonyms(rawName: string): string[] {
  const n = normalize(rawName);
  const terms = new Set<string>([n]);
  for (const group of SYNONYM_GROUPS) {
    if (group.some((w) => normalize(w) === n)) {
      for (const w of group) terms.add(normalize(w));
    }
  }
  return Array.from(terms);
}

function padded(s: string): string {
  return ` ${normalize(s)} `;
}

// Whole-word/phrase containment (so "gin" doesn't match inside "Ginger",
// but "rum" does match inside "Light rum").
export function termMatches(haystack: string, term: string): boolean {
  if (!term.trim()) return false;
  return padded(haystack).includes(padded(term));
}
