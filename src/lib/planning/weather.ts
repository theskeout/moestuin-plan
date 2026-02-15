export interface WeatherData {
  precipitationLast7Days: number; // mm totaal
  maxTempToday: number;           // °C
  fetchedAt: string;              // ISO timestamp
}

// In-memory cache: 1 uur geldig
let cache: { lat: number; lon: number; data: WeatherData; ts: number } | null = null;
const CACHE_MS = 60 * 60 * 1000;

export async function getWeatherData(lat: number, lon: number): Promise<WeatherData | null> {
  // Return cache als geldig
  if (cache && cache.lat === lat && cache.lon === lon && Date.now() - cache.ts < CACHE_MS) {
    return cache.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,temperature_2m_max&past_days=7&forecast_days=1&timezone=Europe/Amsterdam`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    const precip: number[] | undefined = json?.daily?.precipitation_sum;
    const temps: number[] | undefined = json?.daily?.temperature_2m_max;
    if (!precip || !temps || precip.length === 0 || temps.length === 0) return null;

    const data: WeatherData = {
      precipitationLast7Days: precip.reduce((sum, v) => sum + (v ?? 0), 0),
      maxTempToday: temps[temps.length - 1] ?? 0,
      fetchedAt: new Date().toISOString(),
    };

    cache = { lat, lon, data, ts: Date.now() };
    return data;
  } catch {
    return null;
  }
}
