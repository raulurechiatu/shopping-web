// Auto-converts a free-text ingredient quantity ("2 oz", "1/2 cup",
// "350 F") between imperial and metric for display, based on the user's
// preferred unit system. Quantities are stored exactly as authored/scraped
// — this only affects what's rendered, never what's saved.
import { parseLeadingNumber, formatNumber } from "@/lib/quantityScale";

export type UnitSystem = "metric" | "imperial";

type UnitKind = "weight" | "volume" | "length" | "temp";

type UnitDef = {
  re: RegExp;
  system: UnitSystem;
  kind: UnitKind;
  // Multiply the parsed number by this to get the kind's base unit
  // (grams / milliliters / centimeters). Unused for temp, which has its
  // own conversion formula.
  toBase: number;
};

// Ordered so more specific/longer patterns are tried before shorter ones
// they'd otherwise be a prefix of (e.g. "fl oz" before "oz").
const UNITS: UnitDef[] = [
  { re: /^(?:fl\.?\s*oz\.?|fluid ounces?)\b/i, system: "imperial", kind: "volume", toBase: 29.5735 },
  { re: /^(?:gal(?:lons?)?\.?)\b/i, system: "imperial", kind: "volume", toBase: 3785.41 },
  { re: /^(?:qts?\.?|quarts?)\b/i, system: "imperial", kind: "volume", toBase: 946.353 },
  { re: /^(?:pts?\.?|pints?)\b/i, system: "imperial", kind: "volume", toBase: 473.176 },
  { re: /^(?:cups?)\b/i, system: "imperial", kind: "volume", toBase: 236.588 },
  { re: /^(?:tbsp\.?|tablespoons?)\b/i, system: "imperial", kind: "volume", toBase: 14.7868 },
  { re: /^(?:tsp\.?|teaspoons?)\b/i, system: "imperial", kind: "volume", toBase: 4.92892 },
  { re: /^(?:lbs?\.?|pounds?)\b/i, system: "imperial", kind: "weight", toBase: 453.592 },
  { re: /^(?:oz\.?|ounces?)\b/i, system: "imperial", kind: "weight", toBase: 28.3495 },
  { re: /^(?:in(?:ches)?\.?)\b/i, system: "imperial", kind: "length", toBase: 2.54 },
  { re: /^(?:°\s?f|f\.?|fahrenheit)\b/i, system: "imperial", kind: "temp", toBase: 1 },
  { re: /^(?:kgs?\.?|kilograms?)\b/i, system: "metric", kind: "weight", toBase: 1000 },
  { re: /^(?:g\.?|grams?)\b/i, system: "metric", kind: "weight", toBase: 1 },
  { re: /^(?:l\.?|liters?|litres?)\b/i, system: "metric", kind: "volume", toBase: 1000 },
  { re: /^(?:ml\.?|milliliters?|millilitres?)\b/i, system: "metric", kind: "volume", toBase: 1 },
  { re: /^(?:cms?\.?|centimeters?|centimetres?)\b/i, system: "metric", kind: "length", toBase: 1 },
  { re: /^(?:°\s?c|c\.?|celsius)\b/i, system: "metric", kind: "temp", toBase: 1 },
];

function detectUnit(rest: string): { unit: UnitDef; matchedLength: number } | null {
  const trimmed = rest.trimStart();
  for (const unit of UNITS) {
    const match = trimmed.match(unit.re);
    if (match) return { unit, matchedLength: match[0].length };
  }
  return null;
}

function convertValue(value: number, unit: UnitDef, target: UnitSystem): { value: number; label: string } {
  if (unit.kind === "temp") {
    return target === "metric"
      ? { value: ((value - 32) * 5) / 9, label: "°C" }
      : { value: (value * 9) / 5 + 32, label: "°F" };
  }

  if (unit.kind === "length") {
    const cm = value * unit.toBase;
    return target === "metric" ? { value: cm, label: "cm" } : { value: cm / 2.54, label: "in" };
  }

  if (unit.kind === "weight") {
    const grams = value * unit.toBase;
    if (target === "metric") {
      return grams >= 1000 ? { value: grams / 1000, label: "kg" } : { value: grams, label: "g" };
    }
    return grams >= 453.592 ? { value: grams / 453.592, label: "lb" } : { value: grams / 28.3495, label: "oz" };
  }

  // volume
  const ml = value * unit.toBase;
  if (target === "metric") {
    return ml >= 1000 ? { value: ml / 1000, label: "L" } : { value: ml, label: "ml" };
  }
  if (ml < 15) return { value: ml / 4.92892, label: "tsp" };
  if (ml < 60) return { value: ml / 14.7868, label: "tbsp" };
  return { value: ml / 236.588, label: "cup" };
}

export function convertQuantity(quantity: string | null, target: UnitSystem | null): string | null {
  if (!quantity || !target) return quantity;

  const parsed = parseLeadingNumber(quantity);
  if (!parsed) return quantity;

  const detected = detectUnit(parsed.rest);
  if (!detected || detected.unit.system === target) return quantity;

  const converted = convertValue(parsed.value, detected.unit, target);
  const afterUnit = parsed.rest.trimStart().slice(detected.matchedLength).trim();
  // Converted values rarely land on a clean number ("2 tbsp" -> "29.5735
  // ml") — round to whole units above 10, one decimal below, so it still
  // reads like a real recipe measurement.
  const rounded = converted.value >= 10 ? Math.round(converted.value) : Math.round(converted.value * 10) / 10;
  const numberStr = formatNumber(rounded);
  const glued = converted.label.startsWith("°"); // "180°C" not "180 °C"

  return `${numberStr}${glued ? "" : " "}${converted.label}${afterUnit ? ` ${afterUnit}` : ""}`;
}
