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
