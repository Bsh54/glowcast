/** Open-Meteo helpers (free, no API key, CORS-enabled).
 *  Geocoding validates the city; forecast covers up to 16 days ahead. */

export interface CityHit {
  name: string;
  country: string;
  admin1?: string;
  lat: number;
  lon: number;
}

export async function searchCities(query: string): Promise<CityHit[]> {
  if (query.trim().length < 2) return [];
  const url =
    "https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&format=json&name=" +
    encodeURIComponent(query.trim());
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  interface RawHit {
    name: string;
    country?: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }
  return ((json.results ?? []) as RawHit[]).map((r) => ({
    name: r.name,
    country: r.country ?? "",
    admin1: r.admin1,
    lat: r.latitude,
    lon: r.longitude,
  }));
}

const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};

export interface DayForecast {
  tempMaxC: number;
  tempMinC: number;
  condition: string;
  precipitationChance?: number;
}

/** Forecast for a specific date. Returns null when the date is beyond the
 *  16-day window or data is unavailable. */
export async function getForecast(
  lat: number,
  lon: number,
  dateIso: string
): Promise<DayForecast | null> {
  const days = Math.round(
    (new Date(dateIso + "T12:00:00").getTime() - Date.now()) / 86_400_000
  );
  if (days < 0 || days > 15) return null;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
    `&timezone=auto&start_date=${dateIso}&end_date=${dateIso}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const d = json.daily;
  if (!d?.time?.length) return null;
  return {
    tempMaxC: Math.round(d.temperature_2m_max[0]),
    tempMinC: Math.round(d.temperature_2m_min[0]),
    condition: WEATHER_CODES[d.weather_code?.[0]] ?? "Unknown",
    precipitationChance: d.precipitation_probability_max?.[0] ?? undefined,
  };
}
