import type { DatabaseSync } from 'node:sqlite';

interface SeriesPoint {
  label: string;
  actual: number | null;
  forecast: number | null;
}

function linearForecast(values: number[], steps: number): { slope: number; nextValues: number[] } {
  const n = values.length;
  if (n === 0) return { slope: 0, nextValues: Array(steps).fill(0) };
  if (n === 1) return { slope: 0, nextValues: Array(steps).fill(values[0]) };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  const rawSlope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const slope = rawSlope * 0.7;
  const last = values[n - 1];
  const nextValues: number[] = [];
  for (let step = 1; step <= steps; step++) {
    nextValues.push(Number(Math.max(0, last + slope * step).toFixed(1)));
  }
  return { slope, nextValues };
}

function classifyRisk(domain: string, predicted: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (domain === 'TRAFFIC') {
    if (predicted >= 85) return 'CRITICAL';
    if (predicted >= 70) return 'HIGH';
    if (predicted >= 50) return 'MEDIUM';
    return 'LOW';
  }
  if (domain === 'AIR_POLLUTION') {
    if (predicted >= 150) return 'CRITICAL';
    if (predicted >= 105) return 'HIGH';
    if (predicted >= 65) return 'MEDIUM';
    return 'LOW';
  }
  if (domain === 'ENERGY') {
    if (predicted >= 250) return 'CRITICAL';
    if (predicted >= 195) return 'HIGH';
    if (predicted >= 140) return 'MEDIUM';
    return 'LOW';
  }
  if (predicted >= 52) return 'CRITICAL';
  if (predicted >= 44) return 'HIGH';
  if (predicted >= 34) return 'MEDIUM';
  return 'LOW';
}

function recommendationFor(domain: string, risk: string, zoneName: string): string {
  if (domain === 'TRAFFIC') {
    return risk === 'CRITICAL' || risk === 'HIGH'
      ? `Activate smart signal phase diversion and staggered freight routing in ${zoneName}.`
      : `Maintain adaptive signal timing along primary corridors in ${zoneName}.`;
  }
  if (domain === 'AIR_POLLUTION') {
    return risk === 'CRITICAL' || risk === 'HIGH'
      ? `Restrict heavy diesel entry and deploy road dust suppression in ${zoneName}.`
      : `Continue routine AQI monitoring across ${zoneName}.`;
  }
  if (domain === 'ENERGY') {
    return risk === 'CRITICAL' || risk === 'HIGH'
      ? `Schedule peak-shaving battery discharge and shift non-essential substation load in ${zoneName}.`
      : `Grid demand in ${zoneName} remains within safe operating capacity.`;
  }
  return risk === 'CRITICAL' || risk === 'HIGH'
    ? `Audit trunk line leakage and rebalance reservoir supply allocation to ${zoneName}.`
    : `Water demand forecast in ${zoneName} is aligned with reservoir reserves.`;
}

export function generateCustomForecast(
  database: DatabaseSync,
  params: {
    zoneId: number;
    category: 'TRAFFIC' | 'AIR_POLLUTION' | 'ENERGY' | 'WATER_DEMAND';
    historyLimit?: number;
    durationHours?: number;
  }
) {
  const zone = database
    .prepare('SELECT id, code, name FROM city_zones WHERE id = ?')
    .get(params.zoneId) as { id: number; code: string; name: string } | undefined;
  if (!zone) {
    throw new Error('Selected city zone not found.');
  }

  const limit = Math.min(30, Math.max(4, params.historyLimit ?? 10));
  const horizonHours = Math.min(168, Math.max(12, params.durationHours ?? 24));
  const steps = 6;
  const stepHours = Math.round(horizonHours / steps);

  let values: number[] = [];
  let unit = '';
  let cap = 100;

  if (params.category === 'TRAFFIC') {
    unit = '% congestion';
    cap = 100;
    const rows = database
      .prepare('SELECT congestion_index FROM traffic_data WHERE zone_id = ? ORDER BY recorded_at ASC, id ASC LIMIT ?')
      .all(zone.id, limit) as { congestion_index: number }[];
    values = rows.map((r) => r.congestion_index);
  } else if (params.category === 'AIR_POLLUTION') {
    unit = 'AQI';
    cap = 350;
    const rows = database
      .prepare('SELECT aqi FROM environmental_data WHERE zone_id = ? ORDER BY recorded_at ASC, id ASC LIMIT ?')
      .all(zone.id, limit) as { aqi: number }[];
    values = rows.map((r) => r.aqi);
  } else if (params.category === 'ENERGY') {
    unit = 'MWh/day';
    cap = 600;
    const rows = database
      .prepare("SELECT consumption_mwh FROM energy_data WHERE zone_id = ? AND period_type = 'DAILY' ORDER BY recorded_at ASC, id ASC LIMIT ?")
      .all(zone.id, limit) as { consumption_mwh: number }[];
    values = rows.map((r) => r.consumption_mwh);
  } else {
    unit = 'ML/day';
    cap = 180;
    const rows = database
      .prepare("SELECT consumption_ml FROM water_data WHERE zone_id = ? AND period_type = 'DAILY' ORDER BY recorded_at ASC, id ASC LIMIT ?")
      .all(zone.id, limit) as { consumption_ml: number }[];
    values = rows.map((r) => r.consumption_ml);
  }

  const current = values.length > 0 ? values[values.length - 1] : 0;
  const { nextValues } = linearForecast(values, steps);
  const capped = nextValues.map((v) => Math.min(cap, Number(v.toFixed(1))));
  const predicted = capped[capped.length - 1] ?? current;

  const series: SeriesPoint[] = [
    ...values.slice(-6).map((v, idx, arr) => ({
      label: idx === arr.length - 1 ? 'Now' : `-${(arr.length - 1 - idx) * 3}h`,
      actual: v,
      forecast: idx === arr.length - 1 ? v : null,
    })),
    ...capped.map((v, idx) => ({
      label: `+${(idx + 1) * stepHours}h`,
      actual: null,
      forecast: v,
    })),
  ];

  const riskLevel = classifyRisk(params.category, predicted);
  const confidencePct = Number((82 + Math.min(13, values.length * 1.1)).toFixed(1));
  const recommendation = recommendationFor(params.category, riskLevel, zone.name);

  return {
    zoneId: zone.id,
    zoneCode: zone.code,
    zoneName: zone.name,
    domain: params.category,
    horizonHours,
    currentValue: current,
    predictedValue: predicted,
    unit,
    riskLevel,
    confidencePct,
    isSimulated: true,
    modelType: 'LINEAR_TREND_SIMULATED',
    recommendation,
    forecastSeries: series,
  };
}

export function generatePredictions(database: DatabaseSync): number {
  const zones = database.prepare('SELECT id, code, name FROM city_zones ORDER BY code').all() as unknown as {
    id: number;
    code: string;
    name: string;
  }[];

  database.exec('DELETE FROM predictions');

  const insertPred = database.prepare(`
    INSERT INTO predictions (zone_id, domain, model_type, horizon_hours, current_value, predicted_value, unit, risk_level, confidence_pct, is_simulated, forecast_series_json)
    VALUES (?, ?, 'LINEAR_TREND_SIMULATED', 24, ?, ?, ?, ?, ?, 1, ?)
  `);

  let count = 0;
  const categories = ['TRAFFIC', 'AIR_POLLUTION', 'ENERGY', 'WATER_DEMAND'] as const;

  for (const z of zones) {
    for (const cat of categories) {
      const f = generateCustomForecast(database, {
        zoneId: z.id,
        category: cat,
        historyLimit: 10,
        durationHours: 24,
      });
      insertPred.run(
        z.id,
        cat,
        f.currentValue,
        f.predictedValue,
        f.unit,
        f.riskLevel,
        f.confidencePct,
        JSON.stringify(f.forecastSeries)
      );
      count++;
    }
  }

  return count;
}
