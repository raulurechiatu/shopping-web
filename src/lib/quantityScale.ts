// Parses a leading number out of a free-text quantity ("1kg", "1/2 cup",
// "1 1/2 tsp", "6 borcane") and scales it by a multiplier, leaving
// anything unparseable (e.g. "to taste", "a pinch") untouched.
const LEADING_NUMBER = /^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s*/;

// Shared by scaling, merging, and unit conversion — splits a free-text
// quantity into its leading number and whatever text follows.
export function parseLeadingNumber(text: string): { value: number; rest: string } | null {
  const match = text.match(LEADING_NUMBER);
  if (!match) return null;
  const token = match[1];
  let value: number;

  if (token.includes(" ")) {
    // Mixed number, e.g. "1 1/2"
    const [whole, frac] = token.split(/\s+/);
    const [num, den] = frac.split("/").map(Number);
    value = Number(whole) + num / den;
  } else if (token.includes("/")) {
    const [num, den] = token.split("/").map(Number);
    value = num / den;
  } else {
    value = Number(token.replace(",", "."));
  }

  return { value, rest: text.slice(match[0].length) };
}

export function formatNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0+$/, "").replace(/\.$/, "");
}

export function scaleQuantity(quantity: string | null, multiplier: number): string | null {
  if (!quantity || multiplier === 1) return quantity;
  const parsed = parseLeadingNumber(quantity);
  if (!parsed) return quantity;
  const { value, rest } = parsed;
  return `${formatNumber(value * multiplier)}${rest ? ` ${rest}`.replace(/\s+/g, " ").trimEnd() : ""}`.trimEnd();
}

// Combines two quantities for the same item, e.g. when someone adds
// "milk" and it's already on the list. Sums the leading numbers when
// both sides have one and share the same trailing unit text ("2 kg" +
// "1 kg" -> "3 kg"); otherwise falls back to just concatenating them so
// nothing is silently lost ("to taste" + "2 tbsp" -> "to taste + 2 tbsp").
export function mergeQuantities(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return a.trim();

  const aParsed = parseLeadingNumber(a);
  const bParsed = parseLeadingNumber(b);

  if (aParsed && bParsed) {
    const aRest = aParsed.rest.trim();
    const bRest = bParsed.rest.trim();
    if (aRest.toLowerCase() === bRest.toLowerCase()) {
      const sum = formatNumber(aParsed.value + bParsed.value);
      return aRest ? `${sum} ${aRest}` : sum;
    }
  }

  return `${a.trim()} + ${b.trim()}`;
}
