// Open Food Facts: free, no API key, no rate-limit auth required. Good
// coverage for EU/RO products specifically. Returns null on any failure
// (not found, network error, malformed response) so the caller can fall
// back to letting the user type the name themselves.
export async function lookupBarcode(code: string): Promise<string | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1) return null;
    const name: string | undefined = data.product?.product_name || data.product?.product_name_en;
    const brand: string | undefined = data.product?.brands?.split(",")[0]?.trim();
    if (!name) return null;
    return brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} (${brand})` : name;
  } catch {
    return null;
  }
}
