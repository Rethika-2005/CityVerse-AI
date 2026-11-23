import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { DatabaseSync } from 'node:sqlite';

function buildLiveCityContext(database: DatabaseSync): string {
  const cities = database
    .prepare('SELECT id, country, state, name, latitude, longitude FROM cities ORDER BY id')
    .all();

  const zones = database
    .prepare('SELECT id, city_id, code, name, area_name, zone_type, population, latitude, longitude, infrastructure_details, health_score, status FROM city_zones ORDER BY code')
    .all();

  const latestTraffic = database
    .prepare(
      `SELECT cz.code, cz.name as zone_name, td.corridor_name, td.vehicle_count, td.avg_speed_kmh, td.congestion_index, td.congestion_level, td.traffic_density, td.road_capacity, td.accident_count, td.weather_condition, td.suggested_reroute
       FROM traffic_data td
       JOIN city_zones cz ON cz.id = td.zone_id
       WHERE td.id IN (SELECT MAX(id) FROM traffic_data GROUP BY zone_id)
       ORDER BY cz.code`
    )
    .all();

  const latestEnvironment = database
    .prepare(
      `SELECT cz.code, cz.name as zone_name, ed.aqi, ed.pm25, ed.pm10, ed.co2_level, ed.water_quality_index, ed.noise_db, ed.temperature_c, ed.humidity_pct, ed.pollution_level
       FROM environmental_data ed
       JOIN city_zones cz ON cz.id = ed.zone_id
       WHERE ed.id IN (SELECT MAX(id) FROM environmental_data GROUP BY zone_id)
       ORDER BY cz.code`
    )
    .all();

  const latestEnergy = database
    .prepare(
      `SELECT cz.code, cz.name as zone_name, eg.consumption_mwh, eg.renewable_energy_mwh, eg.non_renewable_energy_mwh, eg.renewable_pct, eg.peak_demand_mw, eg.grid_load_pct, eg.street_light_count, eg.active_street_lights, eg.power_outages
       FROM energy_data eg
       JOIN city_zones cz ON cz.id = eg.zone_id
       WHERE eg.period_type = 'DAILY' AND eg.id IN (SELECT MAX(id) FROM energy_data WHERE period_type = 'DAILY' GROUP BY zone_id)
       ORDER BY cz.code`
    )
    .all();

  const latestWater = database
    .prepare(
      `SELECT cz.code, cz.name as zone_name, wd.total_supply_ml, wd.consumption_ml, wd.reservoir_pct, wd.water_quality_index, wd.supply_pressure_bar, wd.leakage_pct, wd.leakage_status, wd.rainfall_mm
       FROM water_data wd
       JOIN city_zones cz ON cz.id = wd.zone_id
       WHERE wd.period_type = 'DAILY' AND wd.id IN (SELECT MAX(id) FROM water_data WHERE period_type = 'DAILY' GROUP BY zone_id)
       ORDER BY cz.code`
    )
    .all();

  const openIncidents = database
    .prepare(
      `SELECT ei.id, cz.code as zone_code, cz.name as zone_name, ei.title, ei.category, ei.priority, ei.status, ei.location_detail, ei.latitude, ei.longitude, ei.description, ei.response_recommendation
       FROM emergency_incidents ei
       JOIN city_zones cz ON cz.id = ei.zone_id
       WHERE ei.status != 'RESOLVED'
       ORDER BY ei.id DESC`
    )
    .all();

  const latestRecommendations = database
    .prepare('SELECT batch_id, summary, priority_actions_json, created_at FROM ai_recommendations ORDER BY id DESC LIMIT 2')
    .all();

  return JSON.stringify(
    {
      snapshotTimestamp: new Date().toISOString(),
      note: 'Sensor baselines are simulated unless marked as operator-submitted entries.',
      cities,
      zones,
      latestTraffic,
      latestEnvironment,
      latestEnergy,
      latestWater,
      openIncidents,
      latestRecommendations,
    },
    null,
    2
  );
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function askCityAssistant(
  database: DatabaseSync,
  question: string,
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<{ answer: string; contextTimestamp: string }> {
  const ai = getGeminiClient();
  const contextJson = buildLiveCityContext(database);

  const systemInstruction = `You are CityVerse AI Decision Support, an executive smart-city operations advisor assisting municipal administrators and citizens.
CRITICAL GROUNDING RULES:
1. Base EVERY numeric figure, zone status, AQI, PM2.5, traffic index, energy load, water reserve, and incident detail strictly on the LIVE DATABASE SNAPSHOT below.
2. NEVER invent, guess, or fabricate live city statistics, sensor counts, or incident IDs not present in the snapshot.
3. Refer to zones by their exact names (e.g., Anna Nagar, T. Nagar, Velachery, Adyar, Guindy, Tambaram, OMR, Mylapore) when answering city queries.
4. Provide crisp, structured, actionable recommendations across traffic rerouting, pollution mitigation, energy/water optimization, and emergency dispatch.

LIVE DATABASE SNAPSHOT:
${contextJson}`;

  const conversationContents = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Operator' : 'CityVerse AI'}: ${m.content}`)
    .join('\n');

  const prompt = conversationContents
    ? `${conversationContents}\nOperator: ${question}`
    : question;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  const answer = response.text?.trim();
  if (!answer) {
    throw new Error('Gemini returned an empty response.');
  }

  return {
    answer,
    contextTimestamp: new Date().toISOString(),
  };
}

export async function generateExecutiveBriefing(database: DatabaseSync): Promise<{ briefing: string; generatedAt: string }> {
  const ai = getGeminiClient();
  const contextJson = buildLiveCityContext(database);

  const systemInstruction = `You are CityVerse AI Chief Operations Strategist. Produce a concise, structured executive decision-support summary strictly grounded in the provided database snapshot. Do not invent any statistics.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Generate an Administrator Executive Decision-Support Summary covering:
1. Overall City Health & Primary Risk Hotspots
2. Immediate Traffic & Mobility Interventions
3. Environmental & Water/Energy Optimization Actions
4. Emergency Dispatch Priorities

DATABASE SNAPSHOT:
${contextJson}`,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
    },
  });

  const briefing = response.text?.trim();
  if (!briefing) {
    throw new Error('Gemini returned an empty executive briefing.');
  }

  return {
    briefing,
    generatedAt: new Date().toISOString(),
  };
}
