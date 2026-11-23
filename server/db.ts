import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'cityverse.db');
export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function hasColumn(table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return cols.some((c) => c.name === column);
}

function ensureColumn(table: string, column: string, definition: string): void {
  if (!hasColumn(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role_id INTEGER NOT NULL REFERENCES roles(id),
      department TEXT DEFAULT 'Citizen Services',
      zone_preference TEXT DEFAULT 'CHN-01',
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country TEXT NOT NULL DEFAULT 'India',
      state TEXT NOT NULL DEFAULT 'Tamil Nadu',
      name TEXT NOT NULL UNIQUE,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS city_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      area_name TEXT NOT NULL DEFAULT '',
      zone_type TEXT NOT NULL CHECK (zone_type IN ('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'CIVIC', 'MIXED')),
      population INTEGER NOT NULL,
      area_sq_km REAL NOT NULL,
      latitude REAL NOT NULL DEFAULT 13.0827,
      longitude REAL NOT NULL DEFAULT 80.2707,
      infrastructure_details TEXT NOT NULL DEFAULT '',
      health_score REAL NOT NULL DEFAULT 85.0,
      grid_x INTEGER NOT NULL DEFAULT 0,
      grid_y INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'OPTIMAL' CHECK (status IN ('OPTIMAL', 'ADVISORY', 'WARNING', 'CRITICAL')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS infrastructure (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL REFERENCES city_zones(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      asset_type TEXT NOT NULL CHECK (asset_type IN ('ROAD', 'HOSPITAL', 'SCHOOL', 'SUBSTATION', 'WATER_PLANT', 'TRANSIT_HUB', 'BUILDING')),
      status TEXT NOT NULL DEFAULT 'OPERATIONAL' CHECK (status IN ('OPERATIONAL', 'DEGRADED', 'MAINTENANCE', 'CRITICAL')),
      capacity_pct REAL NOT NULL DEFAULT 100.0,
      load_pct REAL NOT NULL DEFAULT 50.0,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      last_inspected_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS traffic_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
      zone_id INTEGER NOT NULL REFERENCES city_zones(id) ON DELETE CASCADE,
      corridor_name TEXT NOT NULL,
      vehicle_count INTEGER NOT NULL,
      avg_speed_kmh REAL NOT NULL,
      congestion_index REAL NOT NULL,
      congestion_level TEXT NOT NULL CHECK (congestion_level IN ('LOW', 'MODERATE', 'HIGH', 'SEVERE')),
      traffic_density TEXT NOT NULL DEFAULT 'MODERATE',
      road_capacity INTEGER NOT NULL DEFAULT 5000,
      accident_count INTEGER NOT NULL DEFAULT 0,
      weather_condition TEXT NOT NULL DEFAULT 'Clear',
      suggested_reroute TEXT NOT NULL,
      is_simulated INTEGER NOT NULL DEFAULT 1,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS environmental_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL REFERENCES city_zones(id) ON DELETE CASCADE,
      aqi INTEGER NOT NULL,
      pm25 REAL NOT NULL,
      pm10 REAL NOT NULL DEFAULT 42.0,
      water_quality_index REAL NOT NULL,
      noise_db REAL NOT NULL,
      co2_level REAL NOT NULL DEFAULT 415.0,
      temperature_c REAL NOT NULL,
      humidity_pct INTEGER NOT NULL,
      pollution_level TEXT NOT NULL CHECK (pollution_level IN ('GOOD', 'MODERATE', 'UNHEALTHY', 'HAZARDOUS')),
      is_simulated INTEGER NOT NULL DEFAULT 1,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS energy_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL REFERENCES city_zones(id) ON DELETE CASCADE,
      consumption_mwh REAL NOT NULL,
      renewable_energy_mwh REAL NOT NULL DEFAULT 0,
      non_renewable_energy_mwh REAL NOT NULL DEFAULT 0,
      renewable_pct REAL NOT NULL,
      peak_demand_mw REAL NOT NULL,
      grid_load_pct REAL NOT NULL,
      street_light_count INTEGER NOT NULL DEFAULT 1200,
      active_street_lights INTEGER NOT NULL DEFAULT 1160,
      power_outages INTEGER NOT NULL DEFAULT 0,
      period_type TEXT NOT NULL DEFAULT 'DAILY' CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY')),
      is_simulated INTEGER NOT NULL DEFAULT 1,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS water_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL REFERENCES city_zones(id) ON DELETE CASCADE,
      total_supply_ml REAL NOT NULL DEFAULT 55.0,
      consumption_ml REAL NOT NULL,
      reservoir_pct REAL NOT NULL,
      water_quality_index REAL NOT NULL DEFAULT 90.0,
      supply_pressure_bar REAL NOT NULL,
      leakage_pct REAL NOT NULL,
      leakage_status TEXT NOT NULL DEFAULT 'NORMAL',
      rainfall_mm REAL NOT NULL DEFAULT 2.0,
      period_type TEXT NOT NULL DEFAULT 'DAILY' CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY')),
      is_simulated INTEGER NOT NULL DEFAULT 1,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MONITORING', 'ALERTING', 'IDLE')),
      last_run_at TEXT NOT NULL DEFAULT (datetime('now')),
      findings_count INTEGER NOT NULL DEFAULT 0,
      confidence_score REAL NOT NULL DEFAULT 0.92,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
      zone_id INTEGER REFERENCES city_zones(id) ON DELETE SET NULL,
      severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'HIGH', 'CRITICAL')),
      detected_issue TEXT NOT NULL,
      analysis_summary TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      coordinated_batch_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL REFERENCES city_zones(id) ON DELETE CASCADE,
      domain TEXT NOT NULL CHECK (domain IN ('TRAFFIC', 'AIR_POLLUTION', 'ENERGY', 'WATER_DEMAND')),
      model_type TEXT NOT NULL DEFAULT 'LINEAR_TREND_SIMULATED',
      horizon_hours INTEGER NOT NULL DEFAULT 24,
      current_value REAL NOT NULL,
      predicted_value REAL NOT NULL,
      unit TEXT NOT NULL,
      risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      confidence_pct REAL NOT NULL,
      is_simulated INTEGER NOT NULL DEFAULT 1,
      forecast_series_json TEXT NOT NULL,
      generated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS emergency_incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL REFERENCES city_zones(id) ON DELETE CASCADE,
      reported_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reported_by_name TEXT NOT NULL DEFAULT 'Citizen Dispatch',
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DISPATCHED', 'IN_PROGRESS', 'RESOLVED')),
      location_detail TEXT NOT NULL,
      latitude REAL NOT NULL DEFAULT 13.0827,
      longitude REAL NOT NULL DEFAULT 80.2707,
      description TEXT NOT NULL DEFAULT '',
      response_recommendation TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER REFERENCES city_zones(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
      category TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT NOT NULL UNIQUE,
      summary TEXT NOT NULL,
      priority_actions_json TEXT NOT NULL,
      contributing_agents_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACKNOWLEDGED', 'APPLIED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Safe idempotent column migrations for pre-existing DBs
  ensureColumn('city_zones', 'city_id', 'INTEGER REFERENCES cities(id) ON DELETE CASCADE');
  ensureColumn('city_zones', 'area_name', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('city_zones', 'latitude', 'REAL NOT NULL DEFAULT 13.0827');
  ensureColumn('city_zones', 'longitude', 'REAL NOT NULL DEFAULT 80.2707');
  ensureColumn('city_zones', 'infrastructure_details', "TEXT NOT NULL DEFAULT ''");

  ensureColumn('traffic_data', 'city_id', 'INTEGER REFERENCES cities(id) ON DELETE CASCADE');
  ensureColumn('traffic_data', 'traffic_density', "TEXT NOT NULL DEFAULT 'MODERATE'");
  ensureColumn('traffic_data', 'road_capacity', 'INTEGER NOT NULL DEFAULT 5000');
  ensureColumn('traffic_data', 'accident_count', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('traffic_data', 'weather_condition', "TEXT NOT NULL DEFAULT 'Clear'");

  ensureColumn('environmental_data', 'pm10', 'REAL NOT NULL DEFAULT 42.0');
  ensureColumn('environmental_data', 'co2_level', 'REAL NOT NULL DEFAULT 415.0');

  ensureColumn('energy_data', 'renewable_energy_mwh', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('energy_data', 'non_renewable_energy_mwh', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('energy_data', 'street_light_count', 'INTEGER NOT NULL DEFAULT 1200');
  ensureColumn('energy_data', 'active_street_lights', 'INTEGER NOT NULL DEFAULT 1160');
  ensureColumn('energy_data', 'power_outages', 'INTEGER NOT NULL DEFAULT 0');

  ensureColumn('water_data', 'total_supply_ml', 'REAL NOT NULL DEFAULT 55.0');
  ensureColumn('water_data', 'water_quality_index', 'REAL NOT NULL DEFAULT 90.0');
  ensureColumn('water_data', 'leakage_status', "TEXT NOT NULL DEFAULT 'NORMAL'");
  ensureColumn('water_data', 'rainfall_mm', 'REAL NOT NULL DEFAULT 2.0');

  // If emergency_incidents had old restrictive category CHECK constraint without WATER_LEAKAGE/POWER_FAILURE/OTHER, migrate it
  const incTableSql = db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='emergency_incidents'")
    .get() as { sql: string } | undefined;
  if (incTableSql?.sql && incTableSql.sql.includes("CHECK (category IN ('FIRE'")) {
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec(`
      CREATE TABLE emergency_incidents_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone_id INTEGER NOT NULL REFERENCES city_zones(id) ON DELETE CASCADE,
        reported_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reported_by_name TEXT NOT NULL DEFAULT 'Citizen Dispatch',
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DISPATCHED', 'IN_PROGRESS', 'RESOLVED')),
        location_detail TEXT NOT NULL,
        latitude REAL NOT NULL DEFAULT 13.0827,
        longitude REAL NOT NULL DEFAULT 80.2707,
        description TEXT NOT NULL DEFAULT '',
        response_recommendation TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO emergency_incidents_new (id, zone_id, reported_by_user_id, title, category, priority, status, location_detail, response_recommendation, created_at, updated_at)
      SELECT id, zone_id, reported_by_user_id, title, category, priority, status, location_detail, response_recommendation, created_at, updated_at FROM emergency_incidents;
      DROP TABLE emergency_incidents;
      ALTER TABLE emergency_incidents_new RENAME TO emergency_incidents;
    `);
    db.exec('PRAGMA foreign_keys = ON;');
  } else {
    ensureColumn('emergency_incidents', 'reported_by_name', "TEXT NOT NULL DEFAULT 'Citizen Dispatch'");
    ensureColumn('emergency_incidents', 'latitude', 'REAL NOT NULL DEFAULT 13.0827');
    ensureColumn('emergency_incidents', 'longitude', 'REAL NOT NULL DEFAULT 80.2707');
    ensureColumn('emergency_incidents', 'description', "TEXT NOT NULL DEFAULT ''");
  }
}

export function seedInitialData(): void {
  const roleCount = db.prepare('SELECT COUNT(*) as cnt FROM roles').get() as { cnt: number };
  if (roleCount.cnt === 0) {
    db.prepare('INSERT INTO roles (name, description) VALUES (?, ?)').run(
      'ROLE_ADMIN',
      'Smart City Operations Administrator with full infrastructure, input, agent, and dispatch control.'
    );
    db.prepare('INSERT INTO roles (name, description) VALUES (?, ?)').run(
      'ROLE_CITIZEN',
      'Verified resident with access to live city telemetry, advisories, and emergency reporting.'
    );
  }

  // Ensure Chennai is seeded as the primary city
  const cityCount = db.prepare('SELECT COUNT(*) as cnt FROM cities').get() as { cnt: number };
  if (cityCount.cnt === 0) {
    db.prepare(
      `INSERT INTO cities (country, state, name, latitude, longitude) VALUES (?, ?, ?, ?, ?)`
    ).run('India', 'Tamil Nadu', 'Chennai', 13.0827, 80.2707);
  }

  const chennai = db.prepare("SELECT id FROM cities WHERE name = 'Chennai'").get() as { id: number };

  // Seed the 5 Independent AI Agents if absent
  const agentCount = db.prepare('SELECT COUNT(*) as cnt FROM ai_agents').get() as { cnt: number };
  if (agentCount.cnt === 0) {
    const insertAgent = db.prepare(`
      INSERT INTO ai_agents (agent_key, name, domain, status, findings_count, confidence_score)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const agents = [
      ['traffic_agent', 'Traffic Management Agent', 'Mobility, Capacity & Accidents', 'ACTIVE', 0, 0.94],
      ['environment_agent', 'Environmental Monitoring Agent', 'AQI, PM2.5, PM10 & CO2 Telemetry', 'ACTIVE', 0, 0.92],
      ['energy_agent', 'Energy Management Agent', 'Grid Demand, Renewables & Streetlights', 'ACTIVE', 0, 0.93],
      ['water_agent', 'Water Management Agent', 'Supply, Tank Levels & Leakage', 'ACTIVE', 0, 0.91],
      ['emergency_agent', 'Emergency Response Agent', 'Geolocated Incident Triage & Dispatch', 'ACTIVE', 0, 0.96],
    ] as const;
    for (const ag of agents) {
      insertAgent.run(...ag);
    }
  }

  // Check if Chennai zones already exist
  const chennaiZoneCount = db
    .prepare('SELECT COUNT(*) as cnt FROM city_zones WHERE city_id = ?')
    .get(chennai.id) as { cnt: number };

  if (chennaiZoneCount.cnt > 0) {
    return;
  }

  // Clean out old placeholder zones if upgrading from initial turn so Chennai is clean & coherent
  const existingOtherZones = db.prepare('SELECT COUNT(*) as cnt FROM city_zones').get() as { cnt: number };
  if (existingOtherZones.cnt > 0) {
    db.exec(`
      DELETE FROM agent_activities;
      DELETE FROM predictions;
      DELETE FROM notifications;
      DELETE FROM ai_recommendations;
      DELETE FROM emergency_incidents;
      DELETE FROM traffic_data;
      DELETE FROM environmental_data;
      DELETE FROM energy_data;
      DELETE FROM water_data;
      DELETE FROM infrastructure;
      DELETE FROM city_zones;
    `);
  }

  const insertZone = db.prepare(`
    INSERT INTO city_zones (city_id, code, name, area_name, zone_type, population, area_sq_km, latitude, longitude, infrastructure_details, health_score, grid_x, grid_y, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const chennaiLocations = [
    {
      code: 'CHN-01',
      name: 'Anna Nagar',
      areaName: 'Anna Nagar West & Tower Park',
      zoneType: 'RESIDENTIAL',
      population: 285000,
      areaSqKm: 16.4,
      lat: 13.085,
      lng: 80.2101,
      infra: 'Anna Nagar Tower Park, 2nd Avenue Arterial, K4 Metro Station, Sundaram Medical Foundation, 110kV Substation',
      health: 88.5,
      gx: 0,
      gy: 0,
      status: 'OPTIMAL',
    },
    {
      code: 'CHN-02',
      name: 'T. Nagar',
      areaName: 'Thyagaraya Nagar Commercial Core',
      zoneType: 'COMMERCIAL',
      population: 215000,
      areaSqKm: 9.8,
      lat: 13.0418,
      lng: 80.2341,
      infra: 'Usman Road Flyover, Panagal Park Transit Hub, Smart Pedestrian Plaza, Mambalam Rail Junction',
      health: 73.0,
      gx: 1,
      gy: 0,
      status: 'WARNING',
    },
    {
      code: 'CHN-03',
      name: 'Velachery',
      areaName: 'Velachery Lake & MRTS Corridor',
      zoneType: 'MIXED',
      population: 310000,
      areaSqKm: 18.2,
      lat: 12.9815,
      lng: 80.218,
      infra: 'Velachery MRTS Terminal, Vijayanagar Bus Terminus, Stormwater Pumping Station V2, Phoenix Tech Precinct',
      health: 78.0,
      gx: 1,
      gy: 1,
      status: 'ADVISORY',
    },
    {
      code: 'CHN-04',
      name: 'Adyar',
      areaName: 'Adyar Estuary & Gandhi Nagar',
      zoneType: 'RESIDENTIAL',
      population: 192000,
      areaSqKm: 14.5,
      lat: 13.0012,
      lng: 80.2565,
      infra: 'Adyar Cancer Institute, IIT Madras Research Park, Sardar Patel Road, Adyar Water Reservoir Booster',
      health: 90.0,
      gx: 2,
      gy: 1,
      status: 'OPTIMAL',
    },
    {
      code: 'CHN-05',
      name: 'Guindy',
      areaName: 'Guindy Industrial Estate & Kathipara',
      zoneType: 'INDUSTRIAL',
      population: 148000,
      areaSqKm: 15.1,
      lat: 13.0067,
      lng: 80.2206,
      infra: 'Kathipara Cloverleaf Interchange, Guindy SIDCO Industrial Estate, Guindy Metro Hub, 230kV Grid Substation',
      health: 64.0,
      gx: 0,
      gy: 1,
      status: 'CRITICAL',
    },
    {
      code: 'CHN-06',
      name: 'Tambaram',
      areaName: 'Tambaram Suburban Gateway',
      zoneType: 'RESIDENTIAL',
      population: 268000,
      areaSqKm: 22.8,
      lat: 12.9249,
      lng: 80.1,
      infra: 'Tambaram Railway Junction, GST Road Elevated Corridor, Chromepet Govt Hospital, Chembarambakkam Feeder',
      health: 84.5,
      gx: 0,
      gy: 2,
      status: 'ADVISORY',
    },
    {
      code: 'CHN-07',
      name: 'OMR',
      areaName: 'Old Mahabalipuram Road IT Corridor',
      zoneType: 'COMMERCIAL',
      population: 295000,
      areaSqKm: 24.0,
      lat: 12.9165,
      lng: 80.2275,
      infra: 'Tidel Park IT Hub, Sholinganallur Tech SEZ, Nemmeli Desalination Link, OMR Phase 2 Metro Line',
      health: 82.0,
      gx: 2,
      gy: 2,
      status: 'ADVISORY',
    },
    {
      code: 'CHN-08',
      name: 'Mylapore',
      areaName: 'Mylapore Civic & Coastal Precinct',
      zoneType: 'CIVIC',
      population: 175000,
      areaSqKm: 11.2,
      lat: 13.0368,
      lng: 80.2676,
      infra: 'Luz Corner Civic Junction, Thirumayilai MRTS Hub, Kapaleeshwarar Heritage Grid, Santhome Coastal Wall',
      health: 89.0,
      gx: 2,
      gy: 0,
      status: 'OPTIMAL',
    },
  ] as const;

  for (const loc of chennaiLocations) {
    insertZone.run(
      chennai.id,
      loc.code,
      loc.name,
      loc.areaName,
      loc.zoneType,
      loc.population,
      loc.areaSqKm,
      loc.lat,
      loc.lng,
      loc.infra,
      loc.health,
      loc.gx,
      loc.gy,
      loc.status
    );
  }

  const zoneRows = db.prepare('SELECT id, code, latitude, longitude, name FROM city_zones').all() as {
    id: number;
    code: string;
    latitude: number;
    longitude: number;
    name: string;
  }[];
  const zByCode = Object.fromEntries(zoneRows.map((r) => [r.code, r]));

  const insertInfra = db.prepare(`
    INSERT INTO infrastructure (zone_id, name, asset_type, status, capacity_pct, load_pct, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const infraList = [
    ['CHN-01', 'Anna Nagar 2nd Avenue Arterial', 'ROAD', 'OPERATIONAL', 100, 62, 13.0852, 80.211],
    ['CHN-01', 'Anna Nagar 110kV Smart Substation', 'SUBSTATION', 'OPERATIONAL', 100, 58, 13.0865, 80.208],
    ['CHN-02', 'Usman Road Elevated Corridor', 'ROAD', 'DEGRADED', 100, 86, 13.0412, 80.2335],
    ['CHN-02', 'Panagal Park Transit Terminal', 'TRANSIT_HUB', 'OPERATIONAL', 100, 78, 13.0424, 80.2348],
    ['CHN-03', 'Velachery Stormwater Pumping Plant', 'WATER_PLANT', 'DEGRADED', 92, 81, 12.9808, 80.2175],
    ['CHN-03', 'Velachery MRTS Hub', 'TRANSIT_HUB', 'OPERATIONAL', 100, 74, 12.9792, 80.2205],
    ['CHN-04', 'Adyar Regional Medical Center', 'HOSPITAL', 'OPERATIONAL', 100, 61, 13.0021, 80.2551],
    ['CHN-04', 'IIT Madras Smart Microgrid Lab', 'SCHOOL', 'OPERATIONAL', 100, 55, 12.9915, 80.2337],
    ['CHN-05', 'Kathipara Freight Cloverleaf', 'ROAD', 'CRITICAL', 100, 93, 13.0074, 80.2055],
    ['CHN-05', 'Guindy 230kV Industrial Grid Bank', 'SUBSTATION', 'DEGRADED', 95, 89, 13.0085, 80.2185],
    ['CHN-06', 'Tambaram GST Highway Spine', 'ROAD', 'OPERATIONAL', 100, 72, 12.9255, 80.1021],
    ['CHN-06', 'Tambaram Water Distribution Plant', 'WATER_PLANT', 'OPERATIONAL', 100, 66, 12.9231, 80.1045],
    ['CHN-07', 'OMR IT Expressway Corridor', 'ROAD', 'DEGRADED', 100, 81, 12.9178, 80.2279],
    ['CHN-07', 'Tidel Park Commercial Complex', 'BUILDING', 'OPERATIONAL', 100, 75, 12.9896, 80.2485],
    ['CHN-08', 'Mylapore Heritage Civic Hall', 'BUILDING', 'OPERATIONAL', 100, 48, 13.0355, 80.2682],
    ['CHN-08', 'Thirumayilai Metro Interchange', 'TRANSIT_HUB', 'OPERATIONAL', 100, 57, 13.0381, 80.2661],
  ] as const;

  for (const [code, name, type, status, cap, load, lat, lng] of infraList) {
    insertInfra.run(zByCode[code].id, name, type, status, cap, load, lat, lng);
  }

  const baselines: Record<
    string,
    {
      corridor: string;
      vehicles: number;
      speed: number;
      congestion: number;
      capacity: number;
      accidents: number;
      weather: string;
      reroute: string;
      aqi: number;
      pm25: number;
      pm10: number;
      wqi: number;
      noise: number;
      co2: number;
      temp: number;
      humidity: number;
      mwh: number;
      renPct: number;
      mw: number;
      grid: number;
      lights: number;
      activeLights: number;
      outages: number;
      waterSupply: number;
      waterMl: number;
      reservoir: number;
      pressure: number;
      leakage: number;
      leakStatus: string;
      rain: number;
    }
  > = {
    'CHN-01': {
      corridor: 'Anna Nagar 2nd Avenue',
      vehicles: 3420,
      speed: 38.5,
      congestion: 49,
      capacity: 6000,
      accidents: 0,
      weather: 'Clear',
      reroute: 'Nominal flow — maintain green-wave signal timing at Roundtana',
      aqi: 62,
      pm25: 18.2,
      pm10: 36.4,
      wqi: 92,
      noise: 61.0,
      co2: 412,
      temp: 30.2,
      humidity: 68,
      mwh: 142.0,
      renPct: 48,
      mw: 24.5,
      grid: 61,
      lights: 2400,
      activeLights: 2380,
      outages: 0,
      waterSupply: 52.0,
      waterMl: 41.5,
      reservoir: 78,
      pressure: 4.5,
      leakage: 4.2,
      leakStatus: 'NORMAL',
      rain: 1.5,
    },
    'CHN-02': {
      corridor: 'Usman Road & Panagal Park',
      vehicles: 5480,
      speed: 19.4,
      congestion: 81,
      capacity: 5200,
      accidents: 2,
      weather: 'Humid Haze',
      reroute: 'Divert commercial deliveries to Anna Salai bypass and prioritize MTC shuttle lane',
      aqi: 112,
      pm25: 38.5,
      pm10: 74.0,
      wqi: 86,
      noise: 76.5,
      co2: 448,
      temp: 31.6,
      humidity: 71,
      mwh: 215.0,
      renPct: 32,
      mw: 38.2,
      grid: 82,
      lights: 1850,
      activeLights: 1810,
      outages: 1,
      waterSupply: 46.0,
      waterMl: 43.2,
      reservoir: 58,
      pressure: 3.9,
      leakage: 7.4,
      leakStatus: 'MINOR_LEAK',
      rain: 0.8,
    },
    'CHN-03': {
      corridor: 'Velachery Bypass & 100ft Road',
      vehicles: 4720,
      speed: 25.0,
      congestion: 71,
      capacity: 5800,
      accidents: 1,
      weather: 'Light Rain',
      reroute: 'Reroute eastbound traffic via Taramani Link Road and activate lake drainage telemetry',
      aqi: 88,
      pm25: 28.0,
      pm10: 54.2,
      wqi: 81,
      noise: 69.2,
      co2: 430,
      temp: 29.8,
      humidity: 79,
      mwh: 188.0,
      renPct: 41,
      mw: 32.4,
      grid: 74,
      lights: 2150,
      activeLights: 2090,
      outages: 1,
      waterSupply: 48.0,
      waterMl: 45.8,
      reservoir: 47,
      pressure: 3.6,
      leakage: 10.8,
      leakStatus: 'INSPECTION_REQUIRED',
      rain: 14.5,
    },
    'CHN-04': {
      corridor: 'Sardar Patel Road (Adyar)',
      vehicles: 2890,
      speed: 44.0,
      congestion: 38,
      capacity: 5500,
      accidents: 0,
      weather: 'Coastal Breeze',
      reroute: 'Optimal corridor flow — synchronize LB Road coastal signals',
      aqi: 48,
      pm25: 13.4,
      pm10: 27.1,
      wqi: 95,
      noise: 56.5,
      co2: 398,
      temp: 29.1,
      humidity: 74,
      mwh: 126.0,
      renPct: 62,
      mw: 21.0,
      grid: 54,
      lights: 1900,
      activeLights: 1892,
      outages: 0,
      waterSupply: 50.0,
      waterMl: 34.2,
      reservoir: 84,
      pressure: 4.7,
      leakage: 3.1,
      leakStatus: 'NORMAL',
      rain: 3.2,
    },
    'CHN-05': {
      corridor: 'Kathipara & Guindy Industrial Link',
      vehicles: 6420,
      speed: 14.8,
      congestion: 91,
      capacity: 5600,
      accidents: 3,
      weather: 'Industrial Haze',
      reroute: 'Shift heavy freight to Chennai Outer Ring Road and stagger SIDCO shift dispatch',
      aqi: 162,
      pm25: 61.8,
      pm10: 118.5,
      wqi: 74,
      noise: 84.2,
      co2: 492,
      temp: 32.4,
      humidity: 64,
      mwh: 294.0,
      renPct: 22,
      mw: 49.5,
      grid: 91,
      lights: 2600,
      activeLights: 2440,
      outages: 3,
      waterSupply: 56.0,
      waterMl: 54.8,
      reservoir: 38,
      pressure: 3.2,
      leakage: 14.2,
      leakStatus: 'CRITICAL_LEAK',
      rain: 0.4,
    },
    'CHN-06': {
      corridor: 'GST Road Tambaram Corridor',
      vehicles: 4310,
      speed: 31.2,
      congestion: 63,
      capacity: 6200,
      accidents: 1,
      weather: 'Clear',
      reroute: 'Encourage suburban rail park-and-ride and open reversible flyover lane',
      aqi: 74,
      pm25: 22.1,
      pm10: 45.0,
      wqi: 89,
      noise: 66.8,
      co2: 418,
      temp: 30.8,
      humidity: 66,
      mwh: 158.0,
      renPct: 45,
      mw: 27.1,
      grid: 68,
      lights: 2250,
      activeLights: 2210,
      outages: 0,
      waterSupply: 58.0,
      waterMl: 44.0,
      reservoir: 72,
      pressure: 4.3,
      leakage: 5.5,
      leakStatus: 'NORMAL',
      rain: 2.0,
    },
    'CHN-07': {
      corridor: 'OMR IT Expressway (Sholinganallur)',
      vehicles: 5190,
      speed: 27.6,
      congestion: 74,
      capacity: 6400,
      accidents: 1,
      weather: 'Clear',
      reroute: 'Stagger IT campus shuttle departures and divert southbound flow to ECR',
      aqi: 82,
      pm25: 24.9,
      pm10: 49.2,
      wqi: 88,
      noise: 70.4,
      co2: 426,
      temp: 30.5,
      humidity: 72,
      mwh: 246.0,
      renPct: 54,
      mw: 41.2,
      grid: 79,
      lights: 2800,
      activeLights: 2765,
      outages: 0,
      waterSupply: 54.0,
      waterMl: 48.6,
      reservoir: 61,
      pressure: 4.1,
      leakage: 6.4,
      leakStatus: 'MINOR_LEAK',
      rain: 4.1,
    },
    'CHN-08': {
      corridor: 'Kutchery Road & Luz Corner',
      vehicles: 2540,
      speed: 41.5,
      congestion: 42,
      capacity: 4800,
      accidents: 0,
      weather: 'Coastal Breeze',
      reroute: 'Nominal flow — preserve heritage pedestrian zone',
      aqi: 52,
      pm25: 15.0,
      pm10: 31.2,
      wqi: 94,
      noise: 58.2,
      co2: 404,
      temp: 29.4,
      humidity: 75,
      mwh: 112.0,
      renPct: 56,
      mw: 18.8,
      grid: 52,
      lights: 1700,
      activeLights: 1690,
      outages: 0,
      waterSupply: 44.0,
      waterMl: 31.0,
      reservoir: 82,
      pressure: 4.6,
      leakage: 3.4,
      leakStatus: 'NORMAL',
      rain: 2.6,
    },
  };

  const insertTraffic = db.prepare(`
    INSERT INTO traffic_data (city_id, zone_id, corridor_name, vehicle_count, avg_speed_kmh, congestion_index, congestion_level, traffic_density, road_capacity, accident_count, weather_condition, suggested_reroute, is_simulated, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const insertEnv = db.prepare(`
    INSERT INTO environmental_data (zone_id, aqi, pm25, pm10, water_quality_index, noise_db, co2_level, temperature_c, humidity_pct, pollution_level, is_simulated, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const insertEnergy = db.prepare(`
    INSERT INTO energy_data (zone_id, consumption_mwh, renewable_energy_mwh, non_renewable_energy_mwh, renewable_pct, peak_demand_mw, grid_load_pct, street_light_count, active_street_lights, power_outages, period_type, is_simulated, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const insertWater = db.prepare(`
    INSERT INTO water_data (zone_id, total_supply_ml, consumption_ml, reservoir_pct, water_quality_index, supply_pressure_bar, leakage_pct, leakage_status, rainfall_mm, period_type, is_simulated, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const now = Date.now();
  for (const [code, base] of Object.entries(baselines)) {
    const zId = zByCode[code].id;
    for (let step = 7; step >= 0; step--) {
      const ts = new Date(now - step * 3 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      const wave = Math.sin((7 - step) * 0.65) * 0.07;
      const trend = (7 - step) * (code === 'CHN-05' || code === 'CHN-02' ? 0.022 : 0.006);
      const factor = 1 + wave + trend - 0.05;

      const cIdx = Math.min(97, Math.max(14, Math.round(base.congestion * factor)));
      const cLevel = cIdx >= 80 ? 'SEVERE' : cIdx >= 65 ? 'HIGH' : cIdx >= 40 ? 'MODERATE' : 'LOW';
      insertTraffic.run(
        chennai.id,
        zId,
        base.corridor,
        Math.round(base.vehicles * factor),
        Number(Math.max(10, base.speed / Math.max(0.72, factor)).toFixed(1)),
        cIdx,
        cLevel,
        cLevel,
        base.capacity,
        step === 0 ? base.accidents : Math.max(0, base.accidents - 1),
        base.weather,
        base.reroute,
        ts
      );

      const aqi = Math.min(260, Math.max(20, Math.round(base.aqi * factor)));
      const pLevel = aqi >= 151 ? 'HAZARDOUS' : aqi >= 101 ? 'UNHEALTHY' : aqi >= 51 ? 'MODERATE' : 'GOOD';
      insertEnv.run(
        zId,
        aqi,
        Number((base.pm25 * factor).toFixed(1)),
        Number((base.pm10 * factor).toFixed(1)),
        Number(Math.max(55, Math.min(99, base.wqi - (factor - 1) * 14)).toFixed(1)),
        Number((base.noise * (0.97 + Math.abs(wave) * 0.35)).toFixed(1)),
        Number((base.co2 * (0.98 + trend * 0.5)).toFixed(1)),
        Number((base.temp + Math.sin(step) * 1.1).toFixed(1)),
        Math.round(base.humidity + Math.cos(step) * 3),
        pLevel,
        ts
      );

      const totalMwh = Number((base.mwh * factor).toFixed(1));
      const renMwh = Number(((totalMwh * base.renPct) / 100).toFixed(1));
      const nonRenMwh = Number((totalMwh - renMwh).toFixed(1));
      insertEnergy.run(
        zId,
        totalMwh,
        renMwh,
        nonRenMwh,
        base.renPct,
        Number((base.mw * factor).toFixed(1)),
        Number(Math.min(97, base.grid * factor).toFixed(1)),
        base.lights,
        base.activeLights,
        step === 0 ? base.outages : 0,
        'DAILY',
        ts
      );

      insertWater.run(
        zId,
        base.waterSupply,
        Number((base.waterMl * factor).toFixed(1)),
        Number(Math.max(22, Math.min(95, base.reservoir - (7 - step) * (code === 'CHN-05' ? 0.8 : 0.2))).toFixed(1)),
        base.wqi,
        Number((base.pressure - (factor - 1) * 0.35).toFixed(2)),
        base.leakage,
        base.leakStatus,
        base.rain,
        'DAILY',
        ts
      );
    }

    for (const [period, mult] of [
      ['WEEKLY', 7],
      ['MONTHLY', 30],
    ] as const) {
      for (let idx = 3; idx >= 0; idx--) {
        const ts = new Date(now - idx * (period === 'WEEKLY' ? 7 : 30) * 86400 * 1000)
          .toISOString()
          .replace('T', ' ')
          .slice(0, 19);
        const jitter = 1 + (3 - idx) * 0.02;
        const totalMwh = Number((base.mwh * mult * jitter).toFixed(1));
        const renMwh = Number(((totalMwh * base.renPct) / 100).toFixed(1));
        insertEnergy.run(
          zId,
          totalMwh,
          renMwh,
          Number((totalMwh - renMwh).toFixed(1)),
          base.renPct,
          Number((base.mw * jitter).toFixed(1)),
          Number(Math.min(96, base.grid * jitter).toFixed(1)),
          base.lights,
          base.activeLights,
          base.outages,
          period,
          ts
        );
        insertWater.run(
          zId,
          Number((base.waterSupply * mult).toFixed(1)),
          Number((base.waterMl * mult * jitter).toFixed(1)),
          base.reservoir,
          base.wqi,
          base.pressure,
          base.leakage,
          base.leakStatus,
          Number((base.rain * mult * 0.4).toFixed(1)),
          period,
          ts
        );
      }
    }
  }

  // Seed Chennai Emergency Incidents with real Lat/Lng coordinates
  const insertInc = db.prepare(`
    INSERT INTO emergency_incidents (zone_id, reported_by_name, title, category, priority, status, location_detail, latitude, longitude, description, response_recommendation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const chennaiIncidents = [
    [
      'CHN-05',
      'Guindy Grid Sensor',
      '230kV Industrial Substation Transformer Fault & Outage',
      'POWER_FAILURE',
      'CRITICAL',
      'DISPATCHED',
      'Guindy SIDCO Sector B Substation',
      13.0085,
      80.2185,
      'Feeder overload caused phase trip across 3 industrial blocks.',
      'Isolate Guindy Bank B2 feeder, dispatch TANGEDCO rapid crew, and reroute backup supply from Adyar grid.',
    ],
    [
      'CHN-02',
      'Traffic Control Desk',
      'Multi-Vehicle Collision at Usman Road Flyover Ramp',
      'ROAD_ACCIDENT',
      'HIGH',
      'OPEN',
      'Usman Road & South Boag Junction, T. Nagar',
      13.0402,
      80.2338,
      'Two delivery vans and passenger vehicle blocking southbound ramp.',
      'Dispatch Traffic Patrol T4, EMS Ambulance, and divert vehicles via Anna Salai.',
    ],
    [
      'CHN-03',
      'CMWSSB Telemetry',
      'Waterlogging & Storm Drain Overflow Alert',
      'FLOOD',
      'HIGH',
      'IN_PROGRESS',
      'Velachery Bypass near Vijayanagar Bus Stand',
      12.9788,
      80.2202,
      'Continuous rainfall raised road surface water above 18 cm.',
      'Activate Pumping Station V2 high-capacity dewatering pumps and broadcast transit reroute.',
    ],
    [
      'CHN-07',
      'OMR Civic Patrol',
      'Main Potable Water Pipeline Leakage',
      'WATER_LEAKAGE',
      'MEDIUM',
      'OPEN',
      'OMR Sholinganallur Junction Valve 6',
      12.901,
      80.2279,
      'Pressure telemetry indicates steady trunk drop along IT corridor.',
      'Dispatch acoustic valve repair crew and balance flow from Nemmeli desalination header.',
    ],
  ] as const;

  for (const [code, rep, title, cat, prio, stat, loc, lat, lng, desc, rec] of chennaiIncidents) {
    insertInc.run(zByCode[code].id, rep, title, cat, prio, stat, loc, lat, lng, desc, rec);
  }
}
