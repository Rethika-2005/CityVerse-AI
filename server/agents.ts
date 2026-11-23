import crypto from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

interface ZoneRow {
  id: number;
  code: string;
  name: string;
}

export interface AgentFinding {
  agentKey: string;
  agentName: string;
  zoneId: number;
  zoneCode: string;
  zoneName: string;
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  issue: string;
  analysis: string;
  recommendation: string;
}

export interface CoordinationBatchResult {
  batchId: string;
  summary: string;
  findingsCount: number;
  findings: AgentFinding[];
  priorityActions: string[];
  createdAt: string;
}

function getAgentMap(database: DatabaseSync) {
  const agents = database.prepare('SELECT id, agent_key, name FROM ai_agents').all() as unknown as {
    id: number;
    agent_key: string;
    name: string;
  }[];
  return { agents, agentMap: Object.fromEntries(agents.map((a) => [a.agent_key, a])) };
}

export function triggerDomainAgent(
  database: DatabaseSync,
  domainKey: 'traffic_agent' | 'environment_agent' | 'energy_agent' | 'water_agent' | 'emergency_agent',
  zoneId: number
): { batch: CoordinationBatchResult; domainFinding: AgentFinding | null } {
  const batch = runCentralCoordinationCycle(database);
  const domainFinding =
    batch.findings.find((f) => f.agentKey === domainKey && f.zoneId === zoneId) ??
    batch.findings.find((f) => f.agentKey === domainKey) ??
    null;
  return { batch, domainFinding };
}

export function runCentralCoordinationCycle(database: DatabaseSync): CoordinationBatchResult {
  const batchId = `COORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  const zones = database.prepare('SELECT id, code, name FROM city_zones ORDER BY code').all() as unknown as ZoneRow[];
  const { agents, agentMap } = getAgentMap(database);

  const findings: AgentFinding[] = [];

  // 1. Traffic Management Agent
  for (const z of zones) {
    const latestTraffic = database
      .prepare('SELECT * FROM traffic_data WHERE zone_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1')
      .get(z.id) as
      | {
          corridor_name: string;
          vehicle_count: number;
          avg_speed_kmh: number;
          congestion_index: number;
          congestion_level: string;
          road_capacity: number;
          accident_count: number;
          weather_condition: string;
          suggested_reroute: string;
        }
      | undefined;
    if (latestTraffic && (latestTraffic.congestion_index >= 65 || latestTraffic.accident_count > 0)) {
      findings.push({
        agentKey: 'traffic_agent',
        agentName: agentMap['traffic_agent'].name,
        zoneId: z.id,
        zoneCode: z.code,
        zoneName: z.name,
        severity: latestTraffic.congestion_index >= 82 || latestTraffic.accident_count >= 2 ? 'CRITICAL' : 'HIGH',
        issue: `${latestTraffic.corridor_name} (${z.name}) congestion ${latestTraffic.congestion_index}% · ${latestTraffic.avg_speed_kmh} km/h`,
        analysis: `${latestTraffic.vehicle_count.toLocaleString()} vehicles vs. ${latestTraffic.road_capacity.toLocaleString()} capacity (${latestTraffic.accident_count} accidents, ${latestTraffic.weather_condition}).`,
        recommendation: latestTraffic.suggested_reroute,
      });
    }
  }

  // 2. Environmental Monitoring Agent
  for (const z of zones) {
    const latestEnv = database
      .prepare('SELECT * FROM environmental_data WHERE zone_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1')
      .get(z.id) as
      | {
          aqi: number;
          pm25: number;
          pm10: number;
          co2_level: number;
          water_quality_index: number;
          noise_db: number;
          pollution_level: string;
        }
      | undefined;
    if (latestEnv && (latestEnv.aqi >= 100 || latestEnv.pm25 >= 35 || latestEnv.noise_db >= 76 || latestEnv.co2_level >= 460)) {
      findings.push({
        agentKey: 'environment_agent',
        agentName: agentMap['environment_agent'].name,
        zoneId: z.id,
        zoneCode: z.code,
        zoneName: z.name,
        severity: latestEnv.aqi >= 150 ? 'CRITICAL' : 'HIGH',
        issue: `Elevated AQI ${latestEnv.aqi} (PM2.5 ${latestEnv.pm25}, PM10 ${latestEnv.pm10}) in ${z.name}`,
        analysis: `Pollution level ${latestEnv.pollution_level}; noise ${latestEnv.noise_db} dB, CO2 ${latestEnv.co2_level} ppm.`,
        recommendation: `Restrict heavy diesel traffic in ${z.name}, activate misting suppression, and issue public AQI advisory.`,
      });
    }
  }

  // 3. Energy Management Agent
  for (const z of zones) {
    const latestEnergy = database
      .prepare("SELECT * FROM energy_data WHERE zone_id = ? AND period_type = 'DAILY' ORDER BY recorded_at DESC, id DESC LIMIT 1")
      .get(z.id) as
      | {
          consumption_mwh: number;
          renewable_pct: number;
          peak_demand_mw: number;
          grid_load_pct: number;
          power_outages: number;
        }
      | undefined;
    if (latestEnergy && (latestEnergy.grid_load_pct >= 76 || latestEnergy.power_outages > 0)) {
      findings.push({
        agentKey: 'energy_agent',
        agentName: agentMap['energy_agent'].name,
        zoneId: z.id,
        zoneCode: z.code,
        zoneName: z.name,
        severity: latestEnergy.grid_load_pct >= 86 || latestEnergy.power_outages >= 2 ? 'CRITICAL' : 'WARNING',
        issue: `${z.name} grid load ${latestEnergy.grid_load_pct}% (${latestEnergy.peak_demand_mw} MW peak, ${latestEnergy.power_outages} outages)`,
        analysis: `Consumption ${latestEnergy.consumption_mwh} MWh with ${latestEnergy.renewable_pct}% renewable energy share.`,
        recommendation: `Balance ${z.name} peak load via battery storage and dispatch feeder restoration crews.`,
      });
    }
  }

  // 4. Water Management Agent
  for (const z of zones) {
    const latestWater = database
      .prepare("SELECT * FROM water_data WHERE zone_id = ? AND period_type = 'DAILY' ORDER BY recorded_at DESC, id DESC LIMIT 1")
      .get(z.id) as
      | {
          total_supply_ml: number;
          consumption_ml: number;
          reservoir_pct: number;
          supply_pressure_bar: number;
          leakage_pct: number;
          leakage_status: string;
        }
      | undefined;
    if (latestWater && (latestWater.reservoir_pct <= 55 || latestWater.leakage_pct >= 10 || latestWater.leakage_status === 'CRITICAL_LEAK')) {
      findings.push({
        agentKey: 'water_agent',
        agentName: agentMap['water_agent'].name,
        zoneId: z.id,
        zoneCode: z.code,
        zoneName: z.name,
        severity: latestWater.reservoir_pct <= 42 || latestWater.leakage_pct >= 13 ? 'CRITICAL' : 'HIGH',
        issue: `${z.name} tank reserve ${latestWater.reservoir_pct}% · leakage ${latestWater.leakage_pct}% (${latestWater.leakage_status})`,
        analysis: `Daily draw ${latestWater.consumption_ml} ML vs. supply ${latestWater.total_supply_ml} ML at ${latestWater.supply_pressure_bar} bar.`,
        recommendation: `Dispatch leak repair crew to ${z.name} trunk lines and rebalance supply from Adyar/Chembarambakkam headers.`,
      });
    }
  }

  // 5. Emergency Response Agent
  const openIncidents = database
    .prepare(
      `SELECT ei.*, cz.code as zone_code, cz.name as zone_name
       FROM emergency_incidents ei
       JOIN city_zones cz ON cz.id = ei.zone_id
       WHERE ei.status != 'RESOLVED'
       ORDER BY CASE ei.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END`
    )
    .all() as unknown as {
    id: number;
    zone_id: number;
    zone_code: string;
    zone_name: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    response_recommendation: string;
  }[];

  for (const inc of openIncidents) {
    if (inc.priority === 'CRITICAL' || inc.priority === 'HIGH') {
      findings.push({
        agentKey: 'emergency_agent',
        agentName: agentMap['emergency_agent'].name,
        zoneId: inc.zone_id,
        zoneCode: inc.zone_code,
        zoneName: inc.zone_name,
        severity: inc.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        issue: `Active ${inc.priority} ${inc.category.replaceAll('_', ' ')}: ${inc.title}`,
        analysis: `Incident #${inc.id} in ${inc.zone_name} is currently ${inc.status}.`,
        recommendation: inc.response_recommendation,
      });
    }
  }

  const insertActivity = database.prepare(`
    INSERT INTO agent_activities (agent_id, zone_id, severity, detected_issue, analysis_summary, recommendation, coordinated_batch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const countsByAgent: Record<string, number> = {};
  const maxSeverityByAgent: Record<string, string> = {};
  for (const f of findings) {
    const ag = agentMap[f.agentKey];
    if (!ag) continue;
    insertActivity.run(ag.id, f.zoneId, f.severity, f.issue, f.analysis, f.recommendation, batchId);
    countsByAgent[f.agentKey] = (countsByAgent[f.agentKey] ?? 0) + 1;
    if (f.severity === 'CRITICAL' || maxSeverityByAgent[f.agentKey] !== 'CRITICAL') {
      maxSeverityByAgent[f.agentKey] = f.severity;
    }
  }

  for (const ag of agents) {
    const count = countsByAgent[ag.agent_key] ?? 0;
    if (count === 0) {
      insertActivity.run(
        ag.id,
        zones[0]?.id ?? null,
        'INFO',
        'Nominal operating thresholds verified',
        `All monitored telemetry channels within expected bounds across ${zones.length} city zones.`,
        'Continue autonomous polling cadence.',
        batchId
      );
    }
    const newStatus =
      maxSeverityByAgent[ag.agent_key] === 'CRITICAL'
        ? 'ALERTING'
        : count > 0
          ? 'MONITORING'
          : 'ACTIVE';
    database
      .prepare(
        `UPDATE ai_agents SET status = ?, findings_count = findings_count + ?, last_run_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      )
      .run(newStatus, count, ag.id);
  }

  // Recalculate zone health scores
  for (const z of zones) {
    const tr = database
      .prepare('SELECT congestion_index FROM traffic_data WHERE zone_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1')
      .get(z.id) as { congestion_index: number } | undefined;
    const en = database
      .prepare('SELECT aqi FROM environmental_data WHERE zone_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1')
      .get(z.id) as { aqi: number } | undefined;
    const eg = database
      .prepare("SELECT grid_load_pct FROM energy_data WHERE zone_id = ? AND period_type = 'DAILY' ORDER BY recorded_at DESC, id DESC LIMIT 1")
      .get(z.id) as { grid_load_pct: number } | undefined;
    const wt = database
      .prepare("SELECT reservoir_pct FROM water_data WHERE zone_id = ? AND period_type = 'DAILY' ORDER BY recorded_at DESC, id DESC LIMIT 1")
      .get(z.id) as { reservoir_pct: number } | undefined;
    const incCnt = database
      .prepare("SELECT COUNT(*) as cnt FROM emergency_incidents WHERE zone_id = ? AND status != 'RESOLVED'")
      .get(z.id) as { cnt: number };

    const trafficPenalty = Math.max(0, ((tr?.congestion_index ?? 40) - 45) * 0.22);
    const aqiPenalty = Math.max(0, ((en?.aqi ?? 50) - 60) * 0.14);
    const gridPenalty = Math.max(0, ((eg?.grid_load_pct ?? 60) - 70) * 0.25);
    const waterPenalty = Math.max(0, (60 - (wt?.reservoir_pct ?? 75)) * 0.35);
    const incidentPenalty = incCnt.cnt * 4.5;

    const health = Number(
      Math.max(35, Math.min(99, 98 - trafficPenalty - aqiPenalty - gridPenalty - waterPenalty - incidentPenalty)).toFixed(1)
    );
    const zStatus = health < 65 ? 'CRITICAL' : health < 76 ? 'WARNING' : health < 86 ? 'ADVISORY' : 'OPTIMAL';
    database
      .prepare("UPDATE city_zones SET health_score = ?, status = ?, updated_at = datetime('now') WHERE id = ?")
      .run(health, zStatus, z.id);
  }

  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length;
  const priorityActions = findings.slice(0, 6).map((f) => `[${f.zoneName} · ${f.agentName}] ${f.recommendation}`);
  if (priorityActions.length === 0) {
    priorityActions.push('Maintain balanced grid, water, and corridor signal schedules across all monitored zones.');
  }

  const summary =
    findings.length > 0
      ? `Central AI Coordinator synthesized ${findings.length} multi-agent alerts (${criticalCount} critical, ${highCount} high priority).`
      : 'All five autonomous agents report nominal operations with no threshold breaches.';

  database
    .prepare(
      `INSERT INTO ai_recommendations (batch_id, summary, priority_actions_json, contributing_agents_json, status)
       VALUES (?, ?, ?, ?, 'PENDING')`
    )
    .run(
      batchId,
      summary,
      JSON.stringify(priorityActions),
      JSON.stringify([...new Set(findings.map((f) => f.agentName))])
    );

  const unread = database.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE is_read = 0').get() as { cnt: number };
  if (unread.cnt < 12) {
    const topCritical = findings.find((f) => f.severity === 'CRITICAL') ?? findings[0];
    if (topCritical) {
      database
        .prepare(
          `INSERT INTO notifications (zone_id, title, message, severity, category)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          topCritical.zoneId,
          `${topCritical.agentName}: ${topCritical.zoneName}`,
          topCritical.issue,
          topCritical.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
          topCritical.agentKey.toUpperCase()
        );
    }
  }

  return {
    batchId,
    summary,
    findingsCount: findings.length,
    findings,
    priorityActions,
    createdAt: new Date().toISOString(),
  };
}

export function simulateSensorTick(database: DatabaseSync): void {
  const zones = database.prepare('SELECT id, city_id FROM city_zones').all() as unknown as {
    id: number;
    city_id: number | null;
  }[];
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);

  for (const z of zones) {
    const tr = database
      .prepare('SELECT * FROM traffic_data WHERE zone_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1')
      .get(z.id) as
      | {
          corridor_name: string;
          vehicle_count: number;
          avg_speed_kmh: number;
          congestion_index: number;
          road_capacity: number;
          accident_count: number;
          weather_condition: string;
          suggested_reroute: string;
        }
      | undefined;
    if (tr) {
      const deltaT = Math.round((Math.random() - 0.48) * 8);
      const nextIdx = Math.min(96, Math.max(15, tr.congestion_index + deltaT));
      const nextLevel = nextIdx >= 80 ? 'SEVERE' : nextIdx >= 65 ? 'HIGH' : nextIdx >= 40 ? 'MODERATE' : 'LOW';
      database
        .prepare(
          `INSERT INTO traffic_data (city_id, zone_id, corridor_name, vehicle_count, avg_speed_kmh, congestion_index, congestion_level, traffic_density, road_capacity, accident_count, weather_condition, suggested_reroute, is_simulated, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
        )
        .run(
          z.city_id,
          z.id,
          tr.corridor_name,
          Math.max(600, tr.vehicle_count + deltaT * 45),
          Number(Math.max(11, Math.min(62, tr.avg_speed_kmh - deltaT * 0.35)).toFixed(1)),
          nextIdx,
          nextLevel,
          nextLevel,
          tr.road_capacity ?? 5000,
          tr.accident_count ?? 0,
          tr.weather_condition ?? 'Clear',
          tr.suggested_reroute,
          ts
        );
    }

    const env = database
      .prepare('SELECT * FROM environmental_data WHERE zone_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1')
      .get(z.id) as
      | {
          aqi: number;
          pm25: number;
          pm10: number;
          water_quality_index: number;
          noise_db: number;
          co2_level: number;
          temperature_c: number;
          humidity_pct: number;
        }
      | undefined;
    if (env) {
      const deltaAqi = Math.round((Math.random() - 0.48) * 10);
      const nextAqi = Math.min(220, Math.max(20, env.aqi + deltaAqi));
      const nextPol = nextAqi >= 151 ? 'HAZARDOUS' : nextAqi >= 101 ? 'UNHEALTHY' : nextAqi >= 51 ? 'MODERATE' : 'GOOD';
      database
        .prepare(
          `INSERT INTO environmental_data (zone_id, aqi, pm25, pm10, water_quality_index, noise_db, co2_level, temperature_c, humidity_pct, pollution_level, is_simulated, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
        )
        .run(
          z.id,
          nextAqi,
          Number(Math.max(4, env.pm25 + deltaAqi * 0.35).toFixed(1)),
          Number(Math.max(10, (env.pm10 ?? 40) + deltaAqi * 0.5).toFixed(1)),
          env.water_quality_index,
          Number(Math.max(42, Math.min(89, env.noise_db + (Math.random() - 0.5) * 2.5)).toFixed(1)),
          env.co2_level ?? 420,
          Number((env.temperature_c + (Math.random() - 0.5) * 0.6).toFixed(1)),
          Math.min(90, Math.max(35, Math.round(env.humidity_pct + (Math.random() - 0.5) * 3))),
          nextPol,
          ts
        );
    }

    const eng = database
      .prepare("SELECT * FROM energy_data WHERE zone_id = ? AND period_type = 'DAILY' ORDER BY recorded_at DESC, id DESC LIMIT 1")
      .get(z.id) as
      | {
          consumption_mwh: number;
          renewable_pct: number;
          peak_demand_mw: number;
          grid_load_pct: number;
          street_light_count: number;
          active_street_lights: number;
          power_outages: number;
        }
      | undefined;
    if (eng) {
      const deltaG = Number(((Math.random() - 0.48) * 4).toFixed(1));
      const nextLoad = Number(Math.min(95, Math.max(32, eng.grid_load_pct + deltaG)).toFixed(1));
      const totalMwh = Number(Math.max(50, eng.consumption_mwh + deltaG * 1.4).toFixed(1));
      const renMwh = Number(((totalMwh * eng.renewable_pct) / 100).toFixed(1));
      database
        .prepare(
          `INSERT INTO energy_data (zone_id, consumption_mwh, renewable_energy_mwh, non_renewable_energy_mwh, renewable_pct, peak_demand_mw, grid_load_pct, street_light_count, active_street_lights, power_outages, period_type, is_simulated, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DAILY', 1, ?)`
        )
        .run(
          z.id,
          totalMwh,
          renMwh,
          Number((totalMwh - renMwh).toFixed(1)),
          eng.renewable_pct,
          Number(Math.max(10, eng.peak_demand_mw + deltaG * 0.3).toFixed(1)),
          nextLoad,
          eng.street_light_count ?? 1500,
          eng.active_street_lights ?? 1470,
          eng.power_outages ?? 0,
          ts
        );
    }

    const wat = database
      .prepare("SELECT * FROM water_data WHERE zone_id = ? AND period_type = 'DAILY' ORDER BY recorded_at DESC, id DESC LIMIT 1")
      .get(z.id) as
      | {
          total_supply_ml: number;
          consumption_ml: number;
          reservoir_pct: number;
          water_quality_index: number;
          supply_pressure_bar: number;
          leakage_pct: number;
          leakage_status: string;
          rainfall_mm: number;
        }
      | undefined;
    if (wat) {
      const deltaW = Number(((Math.random() - 0.5) * 1.6).toFixed(1));
      database
        .prepare(
          `INSERT INTO water_data (zone_id, total_supply_ml, consumption_ml, reservoir_pct, water_quality_index, supply_pressure_bar, leakage_pct, leakage_status, rainfall_mm, period_type, is_simulated, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DAILY', 1, ?)`
        )
        .run(
          z.id,
          wat.total_supply_ml ?? 50,
          Number(Math.max(20, wat.consumption_ml + deltaW).toFixed(1)),
          Number(Math.max(25, Math.min(95, wat.reservoir_pct - deltaW * 0.25)).toFixed(1)),
          wat.water_quality_index ?? 90,
          wat.supply_pressure_bar,
          wat.leakage_pct,
          wat.leakage_status ?? 'NORMAL',
          wat.rainfall_mm ?? 1.5,
          ts
        );
    }
  }
}
