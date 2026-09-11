// Open Food Facts: free, no API key, no rate-limit auth required. Good
// coverage for EU/RO products specifically. Returns null on any failure
// (not found, network error, malformed response) so the caller can fall
// back to letting the user type the name themselves.
async function fetchProductName(code: string): Promise<string | null> {
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

export async function lookupBarcode(rawCode: string): Promise<string | null> {
  const code = rawCode.trim();
  const direct = await fetchProductName(code);
  if (direct) return direct;

  // Open Food Facts indexes almost everything as EAN-13. A scanner reading
  // a US/Canadian UPC-A barcode hands back 12 digits, which won't match
  // unless padded with a leading zero — and the reverse (a 13-digit code
  // that's really a zero-padded UPC-A) needs the zero stripped to match
  // some entries. Try both before giving up.
  if (/^\d{12}$/.test(code)) {
    const padded = await fetchProductName(`0${code}`);
    if (padded) return padded;
  }
  if (/^0\d{12}$/.test(code)) {
    const stripped = await fetchProductName(code.slice(1));
    if (stripped) return stripped;
  }

  return null;
}
