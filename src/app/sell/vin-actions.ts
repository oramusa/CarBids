"use server";

export type DecodedVin =
  | { make: string; model: string; year: number | null; trim: string | null }
  | { error: string };

/**
 * Decodes a VIN via NHTSA's free, public vPIC API — no API key required.
 * https://vpic.nhtsa.dot.gov/api/
 */
export async function decodeVin(vin: string): Promise<DecodedVin> {
  const cleaned = vin.trim().toUpperCase();
  if (cleaned.length !== 17) {
    return { error: "VIN must be 17 characters" };
  }

  let data: { Results?: { Variable: string; Value: string | null }[] };
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(cleaned)}?format=json`
    );
    if (!res.ok) return { error: "VIN lookup failed" };
    data = await res.json();
  } catch {
    return { error: "VIN lookup failed" };
  }

  const results = data.Results ?? [];
  const find = (name: string) =>
    results.find((r) => r.Variable === name)?.Value || null;

  const make = find("Make");
  const model = find("Model");
  const yearRaw = find("Model Year");
  const trim = find("Trim");

  if (!make || !model) {
    return { error: "Couldn't decode this VIN — check it's correct" };
  }

  return {
    make,
    model,
    year: yearRaw ? Number(yearRaw) : null,
    trim,
  };
}
