import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupBarcode } from "@/lib/barcodeLookup";

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("lookupBarcode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the product name on a direct hit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ status: 1, product: { product_name: "Nutella" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await lookupBarcode("3017620422003")).toBe("Nutella");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("appends the brand when the product name doesn't already include it", () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ status: 1, product: { product_name: "Cola", brands: "Coca-Cola,Other" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return expect(lookupBarcode("123")).resolves.toBe("Cola (Coca-Cola)");
  });

  it("doesn't duplicate the brand when it's already in the name", () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ status: 1, product: { product_name: "Coca-Cola Zero", brands: "Coca-Cola" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return expect(lookupBarcode("123")).resolves.toBe("Coca-Cola Zero");
  });

  it("returns null when the product isn't found (status !== 1)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 0 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await lookupBarcode("000")).toBeNull();
  });

  it("returns null on a network error instead of throwing", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(lookupBarcode("000")).resolves.toBeNull();
  });

  it("retries a 12-digit UPC-A code zero-padded to 13 digits (EAN-13)", async () => {
    const fetchMock = vi
      .fn()
      // First call: the raw 12-digit code fails.
      .mockResolvedValueOnce(jsonResponse({ status: 0 }))
      // Second call: zero-padded to 13 digits succeeds.
      .mockResolvedValueOnce(jsonResponse({ status: 1, product: { product_name: "Padded Product" } }));
    vi.stubGlobal("fetch", fetchMock);

    const upcA = "123456789012"; // 12 digits
    expect(await lookupBarcode(upcA)).toBe("Padded Product");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain(`0${upcA}`);
  });

  it("retries a 13-digit zero-padded code with the leading zero stripped", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ status: 0 }))
      .mockResolvedValueOnce(jsonResponse({ status: 1, product: { product_name: "Stripped Product" } }));
    vi.stubGlobal("fetch", fetchMock);

    const paddedEan = "0123456789012"; // 13 digits, leading zero
    expect(await lookupBarcode(paddedEan)).toBe("Stripped Product");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain(paddedEan.slice(1));
  });

  it("returns null when neither the code nor its padded/stripped variant match", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 0 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await lookupBarcode("123456789012")).toBeNull();
    // Direct attempt + the 12-digit fallback's zero-padded retry.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
