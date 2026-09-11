// Parses a leading number out of a free-text quantity ("1kg", "1/2 cup",
// "1 1/2 tsp", "6 borcane") and scales it by a multiplier, leaving
// anything unparseable (e.g. "to taste", "a pinch") untouched.
const LEADING_NUMBER = /^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s*/;

function parseLeadingNumber(text: string): number | null {
  const match = text.match(LEADING_NUMBER);
  if (!match) return null;
  const token = match[1];

  if (token.includes(" ")) {
    // Mixed number, e.g. "1 1/2"
    const [whole, frac] = token.split(/\s+/);
    const [num, den] = frac.split("/").map(Number);
    return Number(whole) + num / den;
  }
  if (token.includes("/")) {
    const [num, den] = token.split("/").map(Number);
    return num / den;
  }
  return Number(token.replace(",", "."));
}

function formatNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0+$/, "").replace(/\.$/, "");
}

export function scaleQuantity(quantity: string | null, multiplier: number): string | null {
  if (!quantity || multiplier === 1) return quantity;
  const match = quantity.match(LEADING_NUMBER);
  const value = parseLeadingNumber(quantity);
  if (value === null || !match) return quantity;
  const rest = quantity.slice(match[0].length);
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

  const aMatch = a.match(LEADING_NUMBER);
  const bMatch = b.match(LEADING_NUMBER);
  const aValue = parseLeadingNumber(a);
  const bValue = parseLeadingNumber(b);

  if (aValue !== null && bValue !== null && aMatch && bMatch) {
    const aRest = a.slice(aMatch[0].length).trim();
    const bRest = b.slice(bMatch[0].length).trim();
    if (aRest.toLowerCase() === bRest.toLowerCase()) {
      const sum = formatNumber(aValue + bValue);
      return aRest ? `${sum} ${aRest}` : sum;
    }
  }

  return `${a.trim()} + ${b.trim()}`;
}
