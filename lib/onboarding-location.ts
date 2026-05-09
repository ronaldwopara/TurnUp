export type LocationLookupResult =
  | {
      ok: true;
      city: string;
      latitude: number;
      longitude: number;
    }
  | {
      ok: false;
      reason: "unsupported" | "denied" | "unavailable" | "timeout" | "unknown" | "geocode_failed";
    };

type LocationFailureReason = Extract<LocationLookupResult, { ok: false }>["reason"];

function mapGeoError(code: number): LocationFailureReason {
  if (code === 1) return "denied";
  if (code === 2) return "unavailable";
  if (code === 3) return "timeout";
  return "unknown";
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 5 * 60 * 1000,
    });
  });
}

function pickCityFromAddress(address: Record<string, unknown>): string | null {
  const cityLike = [address.city, address.town, address.village, address.municipality, address.county];
  for (const candidate of cityLike) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

async function reverseGeocodeCity(latitude: number, longitude: number): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("zoom", "10");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const payload = (await res.json()) as {
    address?: Record<string, unknown>;
  };
  if (!payload.address) return null;
  return pickCityFromAddress(payload.address);
}

export async function requestUserCityFromBrowser(): Promise<LocationLookupResult> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return { ok: false, reason: "unsupported" };
  }

  let position: GeolocationPosition;
  try {
    position = await getPosition();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && typeof err.code === "number") {
      return { ok: false, reason: mapGeoError(err.code) };
    }
    return { ok: false, reason: "unknown" };
  }

  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;

  try {
    const city = await reverseGeocodeCity(latitude, longitude);
    if (!city) return { ok: false, reason: "geocode_failed" };
    return { ok: true, city, latitude, longitude };
  } catch {
    return { ok: false, reason: "geocode_failed" };
  }
}
