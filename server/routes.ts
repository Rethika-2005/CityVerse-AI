import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from './auth.ts';
import { runCentralCoordinationCycle, simulateSensorTick, triggerDomainAgent } from './agents.ts';
import { generatePredictions, generateCustomForecast } from './analytics.ts';
import { askCityAssistant, generateExecutiveBriefing } from './gemini.ts';

export function createApiRouter(db: DatabaseSync): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'CityVerse AI API', timestamp: new Date().toISOString() });
  });

  // ── AUTHENTICATION & PROFILE ─────────────────────────────────────────────
  router.get('/auth/bootstrap-status', (_req, res) => {
    const adminRow = db
      .prepare(
        `SELECT COUNT(*) as cnt FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'ROLE_ADMIN'`
      )
      .get() as { cnt: number };
    res.json({
      adminInitialized: adminRow.cnt > 0,
      requiresPasscode: Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0),
    });
  });

  router.post('/auth/bootstrap-admin', (req, res) => {
    const { fullName, email, password, passcode } = req.body ?? {};
    const existingAdmin = db
      .prepare(
        `SELECT COUNT(*) as cnt FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'ROLE_ADMIN'`
      )
      .get() as { cnt: number };
    if (existingAdmin.cnt > 0) {
      res.status(409).json({ error: 'Primary administrator account is already initialized. Please sign in.' });
      return;
    }

    const requiredPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (requiredPasscode && passcode !== requiredPasscode) {
      res.status(403).json({ error: 'Invalid administrator setup passcode.' });
      return;
    }

    if (
      typeof fullName !== 'string' ||
      fullName.trim().length < 2 ||
      typeof email !== 'string' ||
      !email.includes('@') ||
      typeof password !== 'string' ||
      password.length < 6
    ) {
      res.status(400).json({ error: 'Provide a valid full name, email address, and password (min 6 characters).' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existingEmail) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'ROLE_ADMIN'").get() as { id: number };
    const passwordHash = hashPassword(password);
    const result = db
      .prepare(
        `INSERT INTO users (full_name, email, password_hash, role_id, department, zone_preference, status)
         VALUES (?, ?, ?, ?, 'Central Operations Command', 'CHN-01', 'ACTIVE')`
      )
      .run(fullName.trim(), normalizedEmail, passwordHash, adminRole.id);

    const userId = Number(result.lastInsertRowid);
    const token = signToken({
      userId,
      email: normalizedEmail,
      fullName: fullName.trim(),
      role: 'ROLE_ADMIN',
    });

    res.status(201).json({
      token,
      user: {
        id: userId,
        fullName: fullName.trim(),
        email: normalizedEmail,
        role: 'ROLE_ADMIN',
        department: 'Central Operations Command',
        zonePreference: 'CHN-01',
      },
    });
  });

  router.post('/auth/register', (req, res) => {
    const { fullName, email, password, zonePreference } = req.body ?? {};
    if (
      typeof fullName !== 'string' ||
      fullName.trim().length < 2 ||
      typeof email !== 'string' ||
      !email.includes('@') ||
      typeof password !== 'string' ||
      password.length < 6
    ) {
      res.status(400).json({ error: 'Valid name, email, and password (min 6 chars) are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (exists) {
      res.status(409).json({ error: 'Email is already registered.' });
      return;
    }

    const citizenRole = db.prepare("SELECT id FROM roles WHERE name = 'ROLE_CITIZEN'").get() as { id: number };
    const passwordHash = hashPassword(password);
    const zonePref = typeof zonePreference === 'string' && zonePreference.trim() ? zonePreference.trim() : 'CHN-01';

    const result = db
      .prepare(
        `INSERT INTO users (full_name, email, password_hash, role_id, department, zone_preference, status)
         VALUES (?, ?, ?, ?, 'Citizen Portal', ?, 'ACTIVE')`
      )
      .run(fullName.trim(), normalizedEmail, passwordHash, citizenRole.id, zonePref);

    const userId = Number(result.lastInsertRowid);
    const token = signToken({
      userId,
      email: normalizedEmail,
      fullName: fullName.trim(),
      role: 'ROLE_CITIZEN',
    });

    res.status(201).json({
      token,
      user: {
        id: userId,
        fullName: fullName.trim(),
        email: normalizedEmail,
        role: 'ROLE_CITIZEN',
        department: 'Citizen Portal',
        zonePreference: zonePref,
      },
    });
  });

  router.post('/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const row = db
      .prepare(
        `SELECT u.id, u.full_name, u.email, u.password_hash, u.department, u.zone_preference, u.status, r.name as role_name
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.email = ?`
      )
      .get(email.trim().toLowerCase()) as
      | {
          id: number;
          full_name: string;
          email: string;
          password_hash: string;
          department: string;
          zone_preference: string;
          status: string;
          role_name: 'ROLE_ADMIN' | 'ROLE_CITIZEN';
        }
      | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (row.status !== 'ACTIVE') {
      res.status(403).json({ error: 'This account has been suspended by an administrator.' });
      return;
    }

    const token = signToken({
      userId: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role_name,
    });

    res.json({
      token,
      user: {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        role: row.role_name,
        department: row.department,
        zonePreference: row.zone_preference,
      },
    });
  });

  router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const row = db
      .prepare(
        `SELECT u.id, u.full_name, u.email, u.department, u.zone_preference, u.status, u.created_at, r.name as role_name
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.id = ?`
      )
      .get(req.user!.userId) as
      | {
          id: number;
          full_name: string;
          email: string;
          department: string;
          zone_preference: string;
          status: string;
          created_at: string;
          role_name: 'ROLE_ADMIN' | 'ROLE_CITIZEN';
        }
      | undefined;

    if (!row) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      role: row.role_name,
      department: row.department,
      zonePreference: row.zone_preference,
      status: row.status,
      createdAt: row.created_at,
    });
  });

  router.put('/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const { fullName, department, zonePreference, newPassword } = req.body ?? {};
    if (typeof fullName !== 'string' || fullName.trim().length < 2) {
      res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      return;
    }

    if (typeof newPassword === 'string' && newPassword.length > 0) {
      if (newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters.' });
        return;
      }
      const newHash = hashPassword(newPassword);
      db.prepare(
        `UPDATE users SET full_name = ?, department = ?, zone_preference = ?, password_hash = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(
        fullName.trim(),
        typeof department === 'string' ? department.trim() : 'Citizen Portal',
        typeof zonePreference === 'string' ? zonePreference.trim() : 'CHN-01',
        newHash,
        req.user!.userId
      );
    } else {
      db.prepare(
        `UPDATE users SET full_name = ?, department = ?, zone_preference = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(
        fullName.trim(),
        typeof department === 'string' ? department.trim() : 'Citizen Portal',
        typeof zonePreference === 'string' ? zonePreference.trim() : 'CHN-01',
        req.user!.userId
      );
    }

    res.json({ message: 'Profile updated successfully.' });
  });

  // ── CITIES & LOCATION MANAGEMENT (CRUD) ──────────────────────────────────
  router.get('/cities', requireAuth, (_req, res) => {
    const cities = db.prepare('SELECT * FROM cities ORDER BY id ASC').all();
    res.json(cities);
  });

  router.post('/cities', requireAuth, requireRole('ROLE_ADMIN'), (req, res) => {
    const { country, state, name, latitude, longitude } = req.body ?? {};
    if (
      typeof country !== 'string' ||
      country.trim().length < 2 ||
      typeof state !== 'string' ||
      state.trim().length < 2 ||
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      !Number.isFinite(Number(latitude)) ||
      !Number.isFinite(Number(longitude))
    ) {
      res.status(400).json({ error: 'Provide country, state, city name, latitude, and longitude.' });
      return;
    }

    const exists = db.prepare('SELECT id FROM cities WHERE LOWER(name) = LOWER(?)').get(name.trim());
    if (exists) {
      res.status(409).json({ error: 'City already exists.' });
      return;
    }

    const result = db
      .prepare('INSERT INTO cities (country, state, name, latitude, longitude) VALUES (?, ?, ?, ?, ?)')
      .run(country.trim(), state.trim(), name.trim(), Number(latitude), Number(longitude));

    res.status(201).json({ id: Number(result.lastInsertRowid), message: `City ${name.trim()} added.` });
  });

  router.get('/locations', requireAuth, (req, res) => {
    const cityId = req.query.cityId ? Number(req.query.cityId) : null;
    const zoneType = String(req.query.zoneType ?? 'ALL').toUpperCase();
    const search = String(req.query.search ?? '').trim().toLowerCase();

    let query = `
      SELECT cz.*, c.name as city_name, c.state as state_name, c.country as country_name
      FROM city_zones cz
      LEFT JOIN cities c ON c.id = cz.city_id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (cityId && Number.isFinite(cityId)) {
      query += ' AND cz.city_id = ?';
      params.push(cityId);
    }
    if (zoneType !== 'ALL') {
      query += ' AND cz.zone_type = ?';
      params.push(zoneType);
    }
    if (search) {
      query += ' AND (LOWER(cz.name) LIKE ? OR LOWER(cz.area_name) LIKE ? OR LOWER(cz.code) LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY cz.code ASC';

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  });

  router.post('/locations', requireAuth, requireRole('ROLE_ADMIN'), (req, res) => {
    const {
      cityId,
      code,
      name,
      areaName,
      zoneType,
      population,
      areaSqKm,
      latitude,
      longitude,
      infrastructureDetails,
    } = req.body ?? {};

    const validTypes = ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'CIVIC', 'MIXED'];
    if (
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      !validTypes.includes(String(zoneType)) ||
      !Number.isFinite(Number(latitude)) ||
      !Number.isFinite(Number(longitude))
    ) {
      res.status(400).json({ error: 'Provide zone name, valid zoneType, latitude, and longitude.' });
      return;
    }

    const targetCityId = Number.isFinite(Number(cityId))
      ? Number(cityId)
      : ((db.prepare('SELECT id FROM cities ORDER BY id ASC LIMIT 1').get() as { id: number } | undefined)?.id ?? 1);

    const existingCount = (db.prepare('SELECT COUNT(*) as cnt FROM city_zones').get() as { cnt: number }).cnt;
    const zoneCode =
      typeof code === 'string' && code.trim().length >= 2
        ? code.trim().toUpperCase()
        : `LOC-${String(existingCount + 1).padStart(2, '0')}`;

    const gx = existingCount % 3;
    const gy = Math.floor(existingCount / 3) % 3;

    const result = db
      .prepare(
        `INSERT INTO city_zones (city_id, code, name, area_name, zone_type, population, area_sq_km, latitude, longitude, infrastructure_details, health_score, grid_x, grid_y, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 90.0, ?, ?, 'OPTIMAL')`
      )
      .run(
        targetCityId,
        zoneCode,
        name.trim(),
        typeof areaName === 'string' && areaName.trim() ? areaName.trim() : name.trim(),
        String(zoneType),
        Math.max(1000, Number(population ?? 80000)),
        Math.max(0.5, Number(areaSqKm ?? 10)),
        Number(latitude),
        Number(longitude),
        typeof infrastructureDetails === 'string' ? infrastructureDetails.trim() : '',
        gx,
        gy
      );

    const newZoneId = Number(result.lastInsertRowid);

    // Seed baseline sensor rows so new locations immediately participate in dashboards & predictions
    db.prepare(
      `INSERT INTO traffic_data (city_id, zone_id, corridor_name, vehicle_count, avg_speed_kmh, congestion_index, congestion_level, traffic_density, road_capacity, accident_count, weather_condition, suggested_reroute, is_simulated)
       VALUES (?, ?, ?, 2100, 42.0, 40, 'MODERATE', 'MODERATE', 5000, 0, 'Clear', 'Nominal arterial flow', 1)`
    ).run(targetCityId, newZoneId, `${name.trim()} Main Corridor`);
    db.prepare(
      `INSERT INTO environmental_data (zone_id, aqi, pm25, pm10, water_quality_index, noise_db, co2_level, temperature_c, humidity_pct, pollution_level, is_simulated)
       VALUES (?, 55, 16.0, 34.0, 90.0, 58.0, 408.0, 30.0, 68, 'MODERATE', 1)`
    ).run(newZoneId);
    db.prepare(
      `INSERT INTO energy_data (zone_id, consumption_mwh, renewable_energy_mwh, non_renewable_energy_mwh, renewable_pct, peak_demand_mw, grid_load_pct, street_light_count, active_street_lights, power_outages, period_type, is_simulated)
       VALUES (?, 120.0, 54.0, 66.0, 45.0, 20.0, 56.0, 1400, 1380, 0, 'DAILY', 1)`
    ).run(newZoneId);
    db.prepare(
      `INSERT INTO water_data (zone_id, total_supply_ml, consumption_ml, reservoir_pct, water_quality_index, supply_pressure_bar, leakage_pct, leakage_status, rainfall_mm, period_type, is_simulated)
       VALUES (?, 48.0, 36.0, 76.0, 90.0, 4.4, 4.5, 'NORMAL', 2.0, 'DAILY', 1)`
    ).run(newZoneId);

    res.status(201).json({ id: newZoneId, code: zoneCode, message: `Location ${name.trim()} added.` });
  });

  router.put('/locations/:id', requireAuth, requireRole('ROLE_ADMIN'), (req, res) => {
    const id = Number(req.params.id);
    const {
      cityId,
      name,
      areaName,
      zoneType,
      population,
      areaSqKm,
      latitude,
      longitude,
      infrastructureDetails,
    } = req.body ?? {};

    const existing = db.prepare('SELECT id FROM city_zones WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Location not found.' });
      return;
    }

    db.prepare(
      `UPDATE city_zones
       SET city_id = COALESCE(?, city_id),
           name = COALESCE(?, name),
           area_name = COALESCE(?, area_name),
           zone_type = COALESCE(?, zone_type),
           population = COALESCE(?, population),
           area_sq_km = COALESCE(?, area_sq_km),
           latitude = COALESCE(?, latitude),
           longitude = COALESCE(?, longitude),
           infrastructure_details = COALESCE(?, infrastructure_details),
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      Number.isFinite(Number(cityId)) ? Number(cityId) : null,
      typeof name === 'string' && name.trim() ? name.trim() : null,
      typeof areaName === 'string' ? areaName.trim() : null,
      typeof zoneType === 'string' ? zoneType : null,
      Number.isFinite(Number(population)) ? Number(population) : null,
      Number.isFinite(Number(areaSqKm)) ? Number(areaSqKm) : null,
      Number.isFinite(Number(latitude)) ? Number(latitude) : null,
      Number.isFinite(Number(longitude)) ? Number(longitude) : null,
      typeof infrastructureDetails === 'string' ? infrastructureDetails.trim() : null,
      id
    );

    res.json({ message: 'Location updated successfully.' });
  });

  router.delete('/locations/:id', requireAuth, requireRole('ROLE_ADMIN'), (req, res) => {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM city_zones WHERE id = ?').run(id);
    res.json({ message: 'Location deleted.' });
  });

  // ── DASHBOARD OVERVIEW ───────────────────────────────────────────────────
  router.get('/dashboard/overview', requireAuth, (_req, res) => {
    const popRow = db.prepare('SELECT SUM(population) as totalPop, AVG(health_score) as avgHealth, COUNT(*) as totalZones FROM city_zones').get() as {
      totalPop: number;
      avgHealth: number;
      totalZones: number;
    };
    const userRow = db.prepare('SELECT COUNT(*) as totalUsers FROM users').get() as { totalUsers: number };
    const incRow = db
      .prepare("SELECT COUNT(*) as activeEmergencies FROM emergency_incidents WHERE status != 'RESOLVED'")
      .get() as { activeEmergencies: number };

    const latestTraffic = db
      .prepare(
        `SELECT cz.code, cz.name, td.*
         FROM traffic_data td
         JOIN city_zones cz ON cz.id = td.zone_id
         WHERE td.id IN (SELECT MAX(id) FROM traffic_data GROUP BY zone_id)
         ORDER BY cz.code`
      )
      .all() as { congestion_index: number; code: string; name: string; vehicle_count: number; avg_speed_kmh: number }[];

    const latestEnv = db
      .prepare(
        `SELECT cz.code, cz.name, ed.*
         FROM environmental_data ed
         JOIN city_zones cz ON cz.id = ed.zone_id
         WHERE ed.id IN (SELECT MAX(id) FROM environmental_data GROUP BY zone_id)
         ORDER BY cz.code`
      )
      .all() as { aqi: number; pm25: number; water_quality_index: number; noise_db: number; code: string; name: string }[];

    const latestEnergy = db
      .prepare(
        `SELECT cz.code, cz.name, eg.*
         FROM energy_data eg
         JOIN city_zones cz ON cz.id = eg.zone_id
         WHERE eg.period_type = 'DAILY' AND eg.id IN (SELECT MAX(id) FROM energy_data WHERE period_type = 'DAILY' GROUP BY zone_id)
         ORDER BY cz.code`
      )
      .all() as { consumption_mwh: number; renewable_pct: number; grid_load_pct: number; code: string; name: string }[];

    const latestWater = db
      .prepare(
        `SELECT cz.code, cz.name, wd.*
         FROM water_data wd
         JOIN city_zones cz ON cz.id = wd.zone_id
         WHERE wd.period_type = 'DAILY' AND wd.id IN (SELECT MAX(id) FROM water_data WHERE period_type = 'DAILY' GROUP BY zone_id)
         ORDER BY cz.code`
      )
      .all() as { consumption_ml: number; reservoir_pct: number; leakage_pct: number; code: string; name: string }[];

    const avgCongestion = latestTraffic.length
      ? Number((latestTraffic.reduce((s, r) => s + r.congestion_index, 0) / latestTraffic.length).toFixed(1))
      : 0;
    const avgAqi = latestEnv.length
      ? Math.round(latestEnv.reduce((s, r) => s + r.aqi, 0) / latestEnv.length)
      : 0;
    const avgWaterReserve = latestWater.length
      ? Number((latestWater.reduce((s, r) => s + r.reservoir_pct, 0) / latestWater.length).toFixed(1))
      : 0;
    const totalEnergyMwh = Number(latestEnergy.reduce((s, r) => s + r.consumption_mwh, 0).toFixed(1));

    const trafficTrend = db
      .prepare(
        `SELECT substr(recorded_at, 12, 5) as timeLabel,
                ROUND(AVG(congestion_index), 1) as avgCongestion,
                ROUND(AVG(avg_speed_kmh), 1) as avgSpeed
         FROM traffic_data
         GROUP BY recorded_at
         ORDER BY recorded_at ASC
         LIMIT 12`
      )
      .all();

    const envTrend = db
      .prepare(
        `SELECT substr(recorded_at, 12, 5) as timeLabel,
                ROUND(AVG(aqi), 0) as avgAqi,
                ROUND(AVG(pm25), 1) as avgPm25,
                ROUND(AVG(noise_db), 1) as avgNoise
         FROM environmental_data
         GROUP BY recorded_at
         ORDER BY recorded_at ASC
         LIMIT 12`
      )
      .all();

    const resourceByZone = latestEnergy.map((eg) => {
      const wt = latestWater.find((w) => w.code === eg.code);
      return {
        zone: eg.name,
        zoneCode: eg.code,
        energyMwh: eg.consumption_mwh,
        renewablePct: eg.renewable_pct,
        waterMl: wt?.consumption_ml ?? 0,
        reservoirPct: wt?.reservoir_pct ?? 0,
      };
    });

    const recentAlerts = db
      .prepare(
        `SELECT n.*, cz.code as zone_code, cz.name as zone_name
         FROM notifications n
         LEFT JOIN city_zones cz ON cz.id = n.zone_id
         ORDER BY n.id DESC
         LIMIT 6`
      )
      .all();

    const recentIncidents = db
      .prepare(
        `SELECT ei.*, cz.code as zone_code, cz.name as zone_name
         FROM emergency_incidents ei
         JOIN city_zones cz ON cz.id = ei.zone_id
         ORDER BY ei.id DESC
         LIMIT 5`
      )
      .all();

    const zones = db.prepare('SELECT * FROM city_zones ORDER BY code').all();

    res.json({
      kpis: {
        totalPopulation: popRow.totalPop ?? 0,
        totalZones: popRow.totalZones ?? 0,
        totalRegisteredUsers: userRow.totalUsers ?? 0,
        trafficCongestionPct: avgCongestion,
        airQualityIndex: avgAqi,
        waterAvailabilityPct: avgWaterReserve,
        electricityConsumptionMwh: totalEnergyMwh,
        activeEmergencyIncidents: incRow.activeEmergencies ?? 0,
        overallCityHealthScore: Number((popRow.avgHealth ?? 0).toFixed(1)),
      },
      charts: {
        trafficTrend,
        envTrend,
        resourceByZone,
      },
      recentAlerts,
      recentIncidents,
      zones,
    });
  });

  // ── DIGITAL TWIN & ZONES ─────────────────────────────────────────────────
  router.get('/zones', requireAuth, (req, res) => {
    const cityId = req.query.cityId ? Number(req.query.cityId) : null;
    const zones = (
      cityId && Number.isFinite(cityId)
        ? db.prepare('SELECT cz.*, c.name as city_name FROM city_zones cz LEFT JOIN cities c ON c.id = cz.city_id WHERE cz.city_id = ? ORDER BY cz.code').all(cityId)
        : db.prepare('SELECT cz.*, c.name as city_name FROM city_zones cz LEFT JOIN cities c ON c.id = cz.city_id ORDER BY cz.code').all()
    ) as unknown as {
      id: number;
      city_id: number;
      city_name: string;
      code: string;
      name: string;
      area_name: string;
      zone_type: string;
      population: number;
      area_sq_km: number;
      latitude: number;
      longitude: number;
      infrastructure_details: string;
      health_score: number;
      grid_x: number;
      grid_y: number;
      status: string;
    }[];

    const enriched = zones.map((z) => {
      const traffic = db
        .prepare('SELECT * FROM traffic_data WHERE zone_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1')
        .get(z.id);
      const environment = db
        .prepare('SELECT * FROM environmental_data WHERE zone_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1')
        .get(z.id);
      const energy = db
        .prepare("SELECT * FROM energy_data WHERE zone_id = ? AND period_type = 'DAILY' ORDER BY recorded_at DESC, id DESC LIMIT 1")
        .get(z.id);
      const water = db
        .prepare("SELECT * FROM water_data WHERE zone_id = ? AND period_type = 'DAILY' ORDER BY recorded_at DESC, id DESC LIMIT 1")
        .get(z.id);
      const infra = db.prepare('SELECT * FROM infrastructure WHERE zone_id = ?').all(z.id);
      const openIncidents = db
        .prepare("SELECT * FROM emergency_incidents WHERE zone_id = ? AND status != 'RESOLVED'")
        .all(z.id);
      return {
        ...z,
        traffic,
        environment,
        energy,
        water,
        infrastructure: infra,
        openIncidents,
      };
    });

    res.json(enriched);
  });

  // ── TRAFFIC MODULE & INPUT ───────────────────────────────────────────────
  router.get('/traffic', requireAuth, (_req, res) => {
    const latest = db
      .prepare(
        `SELECT td.*, cz.code as zone_code, cz.name as zone_name
         FROM traffic_data td
         JOIN city_zones cz ON cz.id = td.zone_id
         WHERE td.id IN (SELECT MAX(id) FROM traffic_data GROUP BY zone_id)
         ORDER BY td.congestion_index DESC`
      )
      .all();

    const records = db
      .prepare(
        `SELECT td.*, cz.code as zone_code, cz.name as zone_name, c.name as city_name
         FROM traffic_data td
         JOIN city_zones cz ON cz.id = td.zone_id
         LEFT JOIN cities c ON c.id = td.city_id
         ORDER BY td.recorded_at DESC, td.id DESC
         LIMIT 50`
      )
      .all();

    res.json({ latest, records });
  });

  router.post('/traffic', requireAuth, requireRole('ROLE_ADMIN'), (req, res) => {
    const {
      cityId,
      zoneId,
      roadName,
      vehicleCount,
      trafficDensity,
      avgSpeed,
      roadCapacity,
      accidentCount,
      weatherCondition,
      recordedAt,
    } = req.body ?? {};

    const numZone = Number(zoneId);
    const numVehicles = Number(vehicleCount);
    const numSpeed = Number(avgSpeed);
    const numCap = Math.max(100, Number(roadCapacity ?? 5000));

    if (
      !Number.isFinite(numZone) ||
      typeof roadName !== 'string' ||
      roadName.trim().length < 2 ||
      !Number.isFinite(numVehicles) ||
      !Number.isFinite(numSpeed)
    ) {
      res.status(400).json({ error: 'Provide valid zone, road name, vehicle count, and average speed.' });
      return;
    }

    const congestionIndex = Math.min(100, Math.max(5, Math.round((numVehicles / numCap) * 85 + Math.max(0, 45 - numSpeed) * 0.45)));
    const level =
      trafficDensity === 'SEVERE' || trafficDensity === 'HIGH' || trafficDensity === 'MODERATE' || trafficDensity === 'LOW'
        ? trafficDensity
        : congestionIndex >= 80
          ? 'SEVERE'
          : congestionIndex >= 65
            ? 'HIGH'
            : congestionIndex >= 40
              ? 'MODERATE'
              : 'LOW';

    const reroute =
      congestionIndex >= 70
        ? `Divert traffic from ${roadName.trim()} onto parallel ring corridor & optimize signal green phase`
        : `Nominal flow along ${roadName.trim()} — maintain adaptive corridor signals`;

    const ts =
      typeof recordedAt === 'string' && recordedAt.trim()
        ? recordedAt.replace('T', ' ').slice(0, 19)
        : new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.prepare(
      `INSERT INTO traffic_data (city_id, zone_id, corridor_name, vehicle_count, avg_speed_kmh, congestion_index, congestion_level, traffic_density, road_capacity, accident_count, weather_condition, suggested_reroute, is_simulated, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(
      Number.isFinite(Number(cityId)) ? Number(cityId) : 1,
      numZone,
      roadName.trim(),
      Math.round(numVehicles),
      numSpeed,
      congestionIndex,
      level,
      level,
      numCap,
      Math.max(0, Number(accidentCount ?? 0)),
      typeof weatherCondition === 'string' && weatherCondition.trim() ? weatherCondition.trim() : 'Clear',
      reroute,
      ts
    );

    const agentResult = triggerDomainAgent(db, 'traffic_agent', numZone);
    res.status(201).json({
      message: 'Traffic telemetry stored and Traffic Management Agent triggered.',
      congestionIndex,
      agentAnalysis: agentResult.domainFinding ?? agentResult.batch.summary,
      batchId: agentResult.batch.batchId,
    });
  });

  router.post('/traffic/simulate', requireAuth, requireRole('ROLE_ADMIN'), (_req, res) => {
    simulateSensorTick(db);
    const coord = runCentralCoordinationCycle(db);
    res.json({ message: 'Traffic and city telemetry updated (simulated)', coordination: coord });
  });

  // ── ENVIRONMENTAL MONITORING & INPUT ─────────────────────────────────────
  router.get('/environment', requireAuth, (_req, res) => {
    const latest = db
      .prepare(
        `SELECT ed.*, cz.code as zone_code, cz.name as zone_name
         FROM environmental_data ed
         JOIN city_zones cz ON cz.id = ed.zone_id
         WHERE ed.id IN (SELECT MAX(id) FROM environmental_data GROUP BY zone_id)
         ORDER BY ed.aqi DESC`
      )
      .all();

    const history = db
      .prepare(
        `SELECT ed.*, substr(ed.recorded_at, 12, 5) as timeLabel, cz.code as zone_code, cz.name as zone_name
         FROM environmental_data ed
         JOIN city_zones cz ON cz.id = ed.zone_id
         ORDER BY ed.recorded_at DESC, ed.id DESC
         LIMIT 50`
      )
      .all();

    res.json({ latest, history });
  });

  router.post('/environment/reading', requireAuth, requireRole('ROLE_ADMIN'), (req, res) => {
    const {
      zoneId,
      aqi,
      pm25,
      pm10,
      waterQualityIndex,
      noiseDb,
      co2Level,
      temperatureC,
      humidityPct,
      recordedAt,
    } = req.body ?? {};
    const numZone = Number(zoneId);
    const numAqi = Number(aqi);
    if (!Number.isFinite(numZone) || !Number.isFinite(numAqi) || numAqi < 0 || numAqi > 500) {
      res.status(400).json({ error: 'Valid zoneId and AQI (0–500) are required.' });
      return;
    }

    const level = numAqi >= 151 ? 'HAZARDOUS' : numAqi >= 101 ? 'UNHEALTHY' : numAqi >= 51 ? 'MODERATE' : 'GOOD';
    const ts =
      typeof recordedAt === 'string' && recordedAt.trim()
        ? recordedAt.replace('T', ' ').slice(0, 19)
        : new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.prepare(
      `INSERT INTO environmental_data (zone_id, aqi, pm25, pm10, water_quality_index, noise_db, co2_level, temperature_c, humidity_pct, pollution_level, is_simulated, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(
      numZone,
      Math.round(numAqi),
      Number(pm25 ?? 18),
      Number(pm10 ?? 40),
      Number(waterQualityIndex ?? 90),
      Number(noiseDb ?? 60),
      Number(co2Level ?? 415),
      Number(temperatureC ?? 30),
      Math.round(Number(humidityPct ?? 68)),
      level,
      ts
    );

    if (numAqi >= 120) {
      db.prepare(
        `INSERT INTO notifications (zone_id, title, message, severity, category)
         VALUES (?, 'Environmental Sensor Alert', ?, 'CRITICAL', 'ENVIRONMENT')`
      ).run(numZone, `Recorded elevated AQI ${Math.round(numAqi)} (${level}).`);
    }

    const agentResult = triggerDomainAgent(db, 'environment_agent', numZone);
    res.status(201).json({
      message: 'Environmental reading recorded and Environmental Agent triggered.',
      agentAnalysis: agentResult.domainFinding ?? agentResult.batch.summary,
      batchId: agentResult.batch.batchId,
    });
  });

  // ── ENERGY & WATER RESOURCE MANAGEMENT + INPUTS ──────────────────────────
  router.get('/resources', requireAuth, (req, res) => {
    const rawPeriod = String(req.query.period ?? 'DAILY').toUpperCase();
    const period = rawPeriod === 'WEEKLY' || rawPeriod === 'MONTHLY' ? rawPeriod : 'DAILY';

    const energy = db
      .prepare(
        `SELECT eg.*, cz.code as zone_code, cz.name as zone_name
         FROM energy_data eg
         JOIN city_zones cz ON cz.id = eg.zone_id
         WHERE eg.period_type = ?
         ORDER BY eg.recorded_at DESC, eg.id DESC
         LIMIT 50`
      )
      .all(period);

    const water = db
      .prepare(
        `SELECT wd.*, cz.code as zone_code, cz.name as zone_name
         FROM water_data wd
         JOIN city_zones cz ON cz.id = wd.zone_id
         WHERE wd.period_type = ?
         ORDER BY wd.recorded_at DESC, wd.id DESC
         LIMIT 50`
      )
      .all(period);

    const latestEnergy = db
      .prepare(
        `SELECT eg.*, cz.code as zone_code, cz.name as zone_name
         FROM energy_data eg
         JOIN city_zones cz ON cz.id = eg.zone_id
         WHERE eg.period_type = ? AND eg.id IN (SELECT MAX(id) FROM energy_data WHERE period_type = ? GROUP BY zone_id)
         ORDER BY cz.code`
      )
      .all(period, period) as unknown as {
      zone_code: string;
      zone_name: string;
      consumption_mwh: number;
      renewable_pct: number;
      grid_load_pct: number;
      power_outages: number;
    }[];

    const latestWater = db
      .prepare(
        `SELECT wd.*, cz.code as zone_code, cz.name as zone_name
         FROM water_data wd
         JOIN city_zones cz ON cz.id = wd.zone_id
         WHERE wd.period_type = ? AND wd.id IN (SELECT MAX(id) FROM water_data WHERE period_type = ? GROUP BY zone_id)
         ORDER BY cz.code`
      )
      .all(period, period) as unknown as {
      zone_code: string;
      zone_name: string;
      consumption_ml: number;
      reservoir_pct: number;
      leakage_pct: number;
      leakage_status: string;
    }[];

    const recommendations: string[] = [];
    for (const eg of latestEnergy) {
      if (eg.grid_load_pct >= 78 || eg.power_outages > 0) {
        recommendations.push(
          `Peak load balancing advised in ${eg.zone_name} (${eg.zone_code}): grid load ${eg.grid_load_pct}%, outages ${eg.power_outages}.`
        );
      }
      if (eg.renewable_pct < 35) {
        recommendations.push(
          `Increase solar/wind dispatch into ${eg.zone_name} (${eg.zone_code}) where renewable mix is ${eg.renewable_pct}%.`
        );
      }
    }
    for (const wt of latestWater) {
      if (wt.leakage_pct >= 10 || wt.reservoir_pct <= 52 || wt.leakage_status === 'CRITICAL_LEAK') {
        recommendations.push(
          `Water conservation alert in ${wt.zone_name} (${wt.zone_code}): tank level ${wt.reservoir_pct}%, leakage ${wt.leakage_pct}% (${wt.leakage_status}).`
        );
      }
    }

    res.json({ period, energy, water, latestEnergy, latestWater, recommendations });
  });

  router.post('/energy', requireAuth, requireRole('ROLE_ADMIN'), (req, res) => {
    const {
      zoneId,
      totalEnergyConsumption,
      renewableEnergy,
      nonRenewableEnergy,
      streetLightCount,
      activeStreetLights,
      powerOutages,
      peakDemandMw,
      recordedAt,
    } = req.body ?? {};

    const numZone = Number(zoneId);
    const total = Number(totalEnergyConsumption);
    const ren = Number(renewableEnergy ?? 0);
    const nonRen = Number(nonRenewableEnergy ?? Math.max(0, total - ren));

    if (!Number.isFinite(numZone) || !Number.isFinite(total) || total <= 0) {
      res.status(400).json({ error: 'Provide valid zone and positive total energy consumption.' });
      return;
    }

    const renewablePct = Number(Math.min(100, Math.max(0, (ren / total) * 100)).toFixed(1));
    const peakMw = Number.isFinite(Number(peakDemandMw)) ? Number(peakDemandMw) : Number((total * 0.17).toFixed(1));
    const gridLoad = Number(Math.min(99, Math.max(20, (peakMw / 52) * 100)).toFixed(1));
    const ts =
      typeof recordedAt === 'string' && recordedAt.trim()
        ? recordedAt.replace('T', ' ').slice(0, 19)
        : new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.prepare(
      `INSERT INTO energy_data (zone_id, consumption_mwh, renewable_energy_mwh, non_renewable_energy_mwh, renewable_pct, peak_demand_mw, grid_load_pct, street_light_count, active_street_lights, power_outages, period_type, is_simulated, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DAILY', 0, ?)`
    ).run(
      numZone,
      total,
      ren,
      nonRen,
      renewablePct,
      peakMw,
      gridLoad,
      Math.max(0, Number(streetLightCount ?? 1800)),
      Math.max(0, Number(activeStreetLights ?? 1750)),
      Math.max(0, Number(powerOutages ?? 0)),
      ts
    );

    const agentResult = triggerDomainAgent(db, 'energy_agent', numZone);
    res.status(201).json({
      message: 'Energy consumption reading recorded and Energy Agent triggered.',
      agentAnalysis: agentResult.domainFinding ?? agentResult.batch.summary,
      batchId: agentResult.batch.batchId,
    });
  });

  router.post('/water', requireAuth, requireRole('ROLE_ADMIN'), (req, res) => {
    const {
      zoneId,
      totalWaterSupply,
      waterConsumption,
      waterTankLevel,
      waterQuality,
      leakageStatus,
      waterPressure,
      rainfall,
      recordedAt,
    } = req.body ?? {};

    const numZone = Number(zoneId);
    const supply = Number(totalWaterSupply);
    const consumption = Number(waterConsumption);
    const tank = Number(waterTankLevel);

    if (!Number.isFinite(numZone) || !Number.isFinite(supply) || !Number.isFinite(consumption) || !Number.isFinite(tank)) {
      res.status(400).json({ error: 'Provide valid zone, supply, consumption, and tank level.' });
      return;
    }

    const leakStatus = typeof leakageStatus === 'string' && leakageStatus.trim() ? leakageStatus.trim() : 'NORMAL';
    const leakagePct =
      leakStatus === 'CRITICAL_LEAK' ? 14.5 : leakStatus === 'INSPECTION_REQUIRED' ? 10.5 : leakStatus === 'MINOR_LEAK' ? 6.8 : 3.5;

    const ts =
      typeof recordedAt === 'string' && recordedAt.trim()
        ? recordedAt.replace('T', ' ').slice(0, 19)
        : new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.prepare(
      `INSERT INTO water_data (zone_id, total_supply_ml, consumption_ml, reservoir_pct, water_quality_index, supply_pressure_bar, leakage_pct, leakage_status, rainfall_mm, period_type, is_simulated, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DAILY', 0, ?)`
    ).run(
      numZone,
      supply,
      consumption,
      Math.min(100, Math.max(0, tank)),
      Number(waterQuality ?? 90),
      Number(waterPressure ?? 4.2),
      leakagePct,
      leakStatus,
      Number(rainfall ?? 0),
      ts
    );

    const agentResult = triggerDomainAgent(db, 'water_agent', numZone);
    res.status(201).json({
      message: 'Water resource reading recorded and Water Management Agent triggered.',
      agentAnalysis: agentResult.domainFinding ?? agentResult.batch.summary,
      batchId: agentResult.batch.batchId,
    });
  });

  // ── MULTI-AGENT AI COORDINATION ──────────────────────────────────────────
  router.get('/agents', requireAuth, (_req, res) => {
    const agents = db.prepare('SELECT * FROM ai_agents ORDER BY id ASC').all();
    const activities = db
      .prepare(
        `SELECT aa.*, ag.name as agent_name, ag.agent_key, cz.code as zone_code, cz.name as zone_name
         FROM agent_activities aa
         JOIN ai_agents ag ON ag.id = aa.agent_id
         LEFT JOIN city_zones cz ON cz.id = aa.zone_id
         ORDER BY aa.id DESC
         LIMIT 40`
      )
      .all();
    const recommendations = db
      .prepare('SELECT * FROM ai_recommendations ORDER BY id DESC LIMIT 15')
      .all()
      .map((r: Record<string, unknown>) => ({
        ...r,
        priorityActions: JSON.parse(String(r.priority_actions_json || '[]')),
        contributingAgents: JSON.parse(String(r.contributing_agents_json || '[]')),
      }));

    res.json({ agents, activities, recommendations });
  });

  router.post('/agents/coordinate', requireAuth, requireRole('ROLE_ADMIN'), (_req, res) => {
    const result = runCentralCoordinationCycle(db);
    res.json(result);
  });

  router.post('/agents/simulate-tick', requireAuth, requireRole('ROLE_ADMIN'), (_req, res) => {
    simulateSensorTick(db);
    const coordination = runCentralCoordinationCycle(db);
    const predictionsUpdated = generatePredictions(db);
    res.json({
      message: 'Simulated sensor telemetry tick completed across all zones.',
      coordination,
      predictionsUpdated,
    });
  });

  router.patch('/agents/recommendations/:id', requireAuth, requireRole('ROLE_ADMIN'), (req, res) => {
    const { status } = req.body ?? {};
    if (status !== 'ACKNOWLEDGED' && status !== 'APPLIED') {
      res.status(400).json({ error: 'Status must be ACKNOWLEDGED or APPLIED.' });
      return;
    }
    const id = Number(req.params.id);
    db.prepare('UPDATE ai_recommendations SET status = ? WHERE id = ?').run(status, id);
    res.json({ message: 'Recommendation status updated.' });
  });

  // ── PREDICTIVE ANALYTICS ─────────────────────────────────────────────────
  router.get('/predictions', requireAuth, (req, res) => {
    const domain = String(req.query.domain ?? 'ALL').toUpperCase();
    const sql =
      domain === 'ALL'
        ? `SELECT p.*, cz.code as zone_code, cz.name as zone_name
           FROM predictions p
           JOIN city_zones cz ON cz.id = p.zone_id
           ORDER BY CASE p.risk_level WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, cz.code`
        : `SELECT p.*, cz.code as zone_code, cz.name as zone_name
           FROM predictions p
           JOIN city_zones cz ON cz.id = p.zone_id
           WHERE p.domain = ?
           ORDER BY CASE p.risk_level WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, cz.code`;

    const rows = (domain === 'ALL' ? db.prepare(sql).all() : db.prepare(sql).all(domain)) as Record<string, unknown>[];
    const parsed = rows.map((r) => ({
      ...r,
      forecastSeries: JSON.parse(String(r.forecast_series_json || '[]')),
    }));

    res.json({
      methodologyNote:
        'Forecasts are generated from historical database readings using a simulated linear-trend & smoothing baseline (LINEAR_TREND_SIMULATED). Do not treat sample forecasts as calibrated live ML output.',
      predictions: parsed,
    });
  });

  router.post('/predictions/forecast', requireAuth, (req, res) => {
    const { zoneId, category, historyLimit, durationHours } = req.body ?? {};
    const validCategories = ['TRAFFIC', 'AIR_POLLUTION', 'ENERGY', 'WATER_DEMAND'];
    if (!Number.isFinite(Number(zoneId)) || !validCategories.includes(String(category))) {
      res.status(400).json({ error: 'Provide valid zoneId and prediction category.' });
      return;
    }

    try {
      const forecast = generateCustomForecast(db, {
        zoneId: Number(zoneId),
        category: category as 'TRAFFIC' | 'AIR_POLLUTION' | 'ENERGY' | 'WATER_DEMAND',
        historyLimit: Number(historyLimit ?? 10),
        durationHours: Number(durationHours ?? 24),
      });
      res.json(forecast);
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  router.post('/predictions/recompute', requireAuth, requireRole('ROLE_ADMIN'), (_req, res) => {
    const count = generatePredictions(db);
    res.json({ message: `Recomputed ${count} simulated 24-hour zone forecasts.` });
  });

  // ── EMERGENCY MANAGEMENT ─────────────────────────────────────────────────
  router.get('/emergencies', requireAuth, (req, res) => {
    const priority = String(req.query.priority ?? 'ALL').toUpperCase();
    const status = String(req.query.status ?? 'ALL').toUpperCase();

    let query = `
      SELECT ei.*, cz.code as zone_code, cz.name as zone_name, u.full_name as reporter_name
      FROM emergency_incidents ei
      JOIN city_zones cz ON cz.id = ei.zone_id
      LEFT JOIN users u ON u.id = ei.reported_by_user_id
      WHERE 1=1
    `;
    const params: string[] = [];
    if (priority !== 'ALL') {
      query += ' AND ei.priority = ?';
      params.push(priority);
    }
    if (status !== 'ALL') {
      query += ' AND ei.status = ?';
      params.push(status);
    }
    query += ` ORDER BY CASE ei.status WHEN 'OPEN' THEN 1 WHEN 'DISPATCHED' THEN 2 WHEN 'IN_PROGRESS' THEN 3 ELSE 4 END, ei.id DESC`;

    const incidents = db.prepare(query).all(...params);
    res.json(incidents);
  });

  router.post('/emergencies', requireAuth, (req: AuthenticatedRequest, res) => {
    const {
      zoneId,
      title,
      category,
      priority,
      locationDetail,
      latitude,
      longitude,
      description,
      reportedByName,
      incidentDate,
      status,
    } = req.body ?? {};

    const validCategories = [
      'FIRE',
      'ROAD_ACCIDENT',
      'FLOOD',
      'FLOOD_WARNING',
      'WATER_LEAKAGE',
      'POWER_FAILURE',
      'ENVIRONMENTAL_ALERT',
      'INFRASTRUCTURE_FAILURE',
      'OTHER',
    ];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const validStatuses = ['OPEN', 'DISPATCHED', 'IN_PROGRESS', 'RESOLVED'];

    const numZone = Number(zoneId);
    if (
      !Number.isFinite(numZone) ||
      typeof title !== 'string' ||
      title.trim().length < 3 ||
      !validCategories.includes(String(category)) ||
      !validPriorities.includes(String(priority)) ||
      typeof locationDetail !== 'string' ||
      locationDetail.trim().length < 2
    ) {
      res.status(400).json({ error: 'Provide valid zone, incident title, type, priority, and location details.' });
      return;
    }

    const zoneRow = db.prepare('SELECT latitude, longitude FROM city_zones WHERE id = ?').get(numZone) as
      | { latitude: number; longitude: number }
      | undefined;

    const lat = Number.isFinite(Number(latitude)) ? Number(latitude) : (zoneRow?.latitude ?? 13.0827);
    const lng = Number.isFinite(Number(longitude)) ? Number(longitude) : (zoneRow?.longitude ?? 80.2707);

    const recommendationsByCategory: Record<string, string> = {
      FIRE: 'Dispatch nearest fire suppression battalion, isolate adjacent power feeders, and establish 250m safety perimeter.',
      ROAD_ACCIDENT: 'Dispatch traffic response patrol + EMS ambulance and activate smart corridor signal diversion.',
      FLOOD: 'Deploy stormwater dewatering pumps, raise drainage alerts, and broadcast zone transit reroutes.',
      FLOOD_WARNING: 'Deploy stormwater dewatering pumps, raise flood barriers, and broadcast zone transit reroutes.',
      WATER_LEAKAGE: 'Dispatch acoustic valve repair crew, isolate leaking trunk segment, and rebalance zone pressure.',
      POWER_FAILURE: 'Dispatch TANGEDCO substation crew, isolate faulted feeder, and engage backup microgrid transfer.',
      ENVIRONMENTAL_ALERT: 'Dispatch mobile air/water hazmat inspection unit and issue public health advisory.',
      INFRASTRUCTURE_FAILURE: 'Dispatch municipal engineering crew, isolate damaged trunk/feeder, and activate zone redundancy.',
      OTHER: 'Dispatch municipal field response officer to assess and coordinate cross-agency support.',
    };

    const recommendation = recommendationsByCategory[String(category)] ?? recommendationsByCategory.OTHER;
    const incStatus = validStatuses.includes(String(status)) && req.user?.role === 'ROLE_ADMIN' ? String(status) : 'OPEN';
    const ts =
      typeof incidentDate === 'string' && incidentDate.trim()
        ? incidentDate.replace('T', ' ').slice(0, 19)
        : new Date().toISOString().replace('T', ' ').slice(0, 19);

    const result = db
      .prepare(
        `INSERT INTO emergency_incidents (zone_id, reported_by_user_id, reported_by_name, title, category, priority, status, location_detail, latitude, longitude, description, response_recommendation, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        numZone,
        req.user!.userId,
        typeof reportedByName === 'string' && reportedByName.trim() ? reportedByName.trim() : req.user!.fullName,
        title.trim(),
        String(category),
        String(priority),
        incStatus,
        locationDetail.trim(),
        lat,
        lng,
        typeof description === 'string' ? description.trim() : '',
        recommendation,
        ts
      );

    db.prepare(
      `INSERT INTO notifications (zone_id, title, message, severity, category)
       VALUES (?, ?, ?, ?, 'EMERGENCY')`
    ).run(
      numZone,
      `${priority} ${String(category).replaceAll('_', ' ')} Reported`,
      `${title.trim()} at ${locationDetail.trim()}`,
      priority === 'CRITICAL' || priority === 'HIGH' ? 'CRITICAL' : 'WARNING'
    );

    const agentResult = triggerDomainAgent(db, 'emergency_agent', numZone);
    res.status(201).json({
      id: Number(result.lastInsertRowid),
      message: 'Emergency incident logged and Emergency Response Agent triggered.',
      agentAnalysis: agentResult.domainFinding ?? agentResult.batch.summary,
    });
  });

  router.patch('/emergencies/:id/status', requireAuth, requireRole('ROLE_ADMIN'), (req, res) => {
    const { status } = req.body ?? {};
    const valid = ['OPEN', 'DISPATCHED', 'IN_PROGRESS', 'RESOLVED'];
    if (!valid.includes(status)) {
      res.status(400).json({ error: 'Invalid status transition.' });
      return;
    }
    db.prepare("UPDATE emergency_incidents SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
      status,
      Number(req.params.id)
    );
    res.json({ message: `Incident updated to ${status}.` });
  });

  // ── GEMINI AI DECISION SUPPORT ───────────────────────────────────────────
  router.post('/ai/chat', requireAuth, async (req, res) => {
    const { question, history } = req.body ?? {};
    if (typeof question !== 'string' || question.trim().length < 2) {
      res.status(400).json({ error: 'Please enter a valid question for CityVerse AI.' });
      return;
    }
    try {
      const result = await askCityAssistant(db, question.trim(), Array.isArray(history) ? history : []);
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reach Gemini AI service.';
      res.status(msg.includes('GEMINI_API_KEY') ? 503 : 500).json({ error: msg });
    }
  });

  router.post('/ai/executive-briefing', requireAuth, requireRole('ROLE_ADMIN'), async (_req, res) => {
    try {
      const result = await generateExecutiveBriefing(db);
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate executive briefing.';
      res.status(msg.includes('GEMINI_API_KEY') ? 503 : 500).json({ error: msg });
    }
  });

  // ── ADMIN & INFRASTRUCTURE MANAGEMENT ────────────────────────────────────
  router.get('/admin/users', requireAuth, requireRole('ROLE_ADMIN'), (_req, res) => {
    const users = db
      .prepare(
        `SELECT u.id, u.full_name, u.email, u.department, u.zone_preference, u.status, u.created_at, r.name as role
         FROM users u
         JOIN roles r ON r.id = u.role_id
         ORDER BY u.id ASC`
      )
      .all();
    res.json(users);
  });

  router.post('/admin/users', requireAuth, requireRole('ROLE_ADMIN'), (req, res) => {
    const { fullName, email, password, role, department, zonePreference } = req.body ?? {};
    if (
      typeof fullName !== 'string' ||
      fullName.trim().length < 2 ||
      typeof email !== 'string' ||
      !email.includes('@') ||
      typeof password !== 'string' ||
      password.length < 6 ||
      (role !== 'ROLE_ADMIN' && role !== 'ROLE_CITIZEN')
    ) {
      res.status(400).json({ error: 'Valid name, email, password (min 6 chars), and role are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (exists) {
      res.status(409).json({ error: 'Email already exists.' });
      return;
    }

    const roleRow = db.prepare('SELECT id FROM roles WHERE name = ?').get(role) as { id: number };
    const pwHash = hashPassword(password);
    const result = db
      .prepare(
        `INSERT INTO users (full_name, email, password_hash, role_id, department, zone_preference, status)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`
      )
      .run(
        fullName.trim(),
        normalizedEmail,
        pwHash,
        roleRow.id,
        typeof department === 'string' && department.trim() ? department.trim() : role === 'ROLE_ADMIN' ? 'Operations' : 'Citizen Services',
        typeof zonePreference === 'string' && zonePreference.trim() ? zonePreference.trim() : 'CHN-01'
      );

    res.status(201).json({ id: Number(result.lastInsertRowid), message: 'User created.' });
  });

  router.patch('/admin/users/:id', requireAuth, requireRole('ROLE_ADMIN'), (req: AuthenticatedRequest, res) => {
    const targetId = Number(req.params.id);
    const { status, role } = req.body ?? {};
    if (targetId === req.user!.userId && status === 'SUSPENDED') {
      res.status(400).json({ error: 'You cannot suspend your own active administrator account.' });
      return;
    }

    if (status === 'ACTIVE' || status === 'SUSPENDED') {
      db.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, targetId);
    }
    if (role === 'ROLE_ADMIN' || role === 'ROLE_CITIZEN') {
      const roleRow = db.prepare('SELECT id FROM roles WHERE name = ?').get(role) as { id: number };
      db.prepare("UPDATE users SET role_id = ?, updated_at = datetime('now') WHERE id = ?").run(roleRow.id, targetId);
    }

    res.json({ message: 'User updated.' });
  });

  router.post('/admin/zones', requireAuth, requireRole('ROLE_ADMIN'), (req, res) => {
    const { code, name, zoneType, population, areaSqKm, gridX, gridY, latitude, longitude } = req.body ?? {};
    const validTypes = ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'CIVIC', 'MIXED'];
    if (
      typeof code !== 'string' ||
      code.trim().length < 2 ||
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      !validTypes.includes(zoneType)
    ) {
      res.status(400).json({ error: 'Valid zone code, name, and zoneType are required.' });
      return;
    }

    const defaultCity = db.prepare('SELECT id FROM cities ORDER BY id ASC LIMIT 1').get() as { id: number } | undefined;
    const result = db
      .prepare(
        `INSERT INTO city_zones (city_id, code, name, area_name, zone_type, population, area_sq_km, latitude, longitude, health_score, grid_x, grid_y, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 90.0, ?, ?, 'OPTIMAL')`
      )
      .run(
        defaultCity?.id ?? 1,
        code.trim().toUpperCase(),
        name.trim(),
        name.trim(),
        zoneType,
        Math.max(1000, Number(population ?? 50000)),
        Math.max(1, Number(areaSqKm ?? 10)),
        Number(latitude ?? 13.0827),
        Number(longitude ?? 80.2707),
        Number(gridX ?? 0),
        Number(gridY ?? 2)
      );

    res.status(201).json({ id: Number(result.lastInsertRowid), message: 'City zone created.' });
  });

  router.get('/infrastructure', requireAuth, (_req, res) => {
    const assets = db
      .prepare(
        `SELECT i.*, cz.code as zone_code, cz.name as zone_name
         FROM infrastructure i
         JOIN city_zones cz ON cz.id = i.zone_id
         ORDER BY cz.code, i.asset_type, i.name`
      )
      .all();
    res.json(assets);
  });

  router.post('/infrastructure', requireAuth, requireRole('ROLE_ADMIN'), (req, res) => {
    const { zoneId, name, assetType, status, capacityPct, loadPct } = req.body ?? {};
    const validAssets = ['ROAD', 'HOSPITAL', 'SCHOOL', 'SUBSTATION', 'WATER_PLANT', 'TRANSIT_HUB', 'BUILDING'];
    const validStatus = ['OPERATIONAL', 'DEGRADED', 'MAINTENANCE', 'CRITICAL'];
    if (!Number.isFinite(Number(zoneId)) || typeof name !== 'string' || name.trim().length < 2 || !validAssets.includes(assetType)) {
      res.status(400).json({ error: 'Valid zoneId, asset name, and assetType are required.' });
      return;
    }
    const zone = db.prepare('SELECT latitude, longitude FROM city_zones WHERE id = ?').get(Number(zoneId)) as
      | { latitude: number; longitude: number }
      | undefined;

    const result = db
      .prepare(
        `INSERT INTO infrastructure (zone_id, name, asset_type, status, capacity_pct, load_pct, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        Number(zoneId),
        name.trim(),
        assetType,
        validStatus.includes(status) ? status : 'OPERATIONAL',
        Number(capacityPct ?? 100),
        Number(loadPct ?? 45),
        zone?.latitude ?? 13.0827,
        zone?.longitude ?? 80.2707
      );
    res.status(201).json({ id: Number(result.lastInsertRowid), message: 'Infrastructure asset added.' });
  });

  router.patch('/infrastructure/:id', requireAuth, requireRole('ROLE_ADMIN'), (req, res) => {
    const { status, loadPct } = req.body ?? {};
    const validStatus = ['OPERATIONAL', 'DEGRADED', 'MAINTENANCE', 'CRITICAL'];
    if (status && !validStatus.includes(status)) {
      res.status(400).json({ error: 'Invalid infrastructure status.' });
      return;
    }
    if (status) {
      db.prepare("UPDATE infrastructure SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
        status,
        Number(req.params.id)
      );
    }
    if (Number.isFinite(Number(loadPct))) {
      db.prepare("UPDATE infrastructure SET load_pct = ?, updated_at = datetime('now') WHERE id = ?").run(
        Number(loadPct),
        Number(req.params.id)
      );
    }
    res.json({ message: 'Infrastructure asset updated.' });
  });

  router.get('/notifications', requireAuth, (_req, res) => {
    const rows = db
      .prepare(
        `SELECT n.*, cz.code as zone_code, cz.name as zone_name
         FROM notifications n
         LEFT JOIN city_zones cz ON cz.id = n.zone_id
         ORDER BY n.id DESC
         LIMIT 30`
      )
      .all();
    res.json(rows);
  });

  router.patch('/notifications/:id/read', requireAuth, (req, res) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(Number(req.params.id));
    res.json({ message: 'Notification marked as read.' });
  });

  // ── REPORTS & ANALYTICS ──────────────────────────────────────────────────
  router.get('/reports/summary', requireAuth, (req, res) => {
    const reportType = String(req.query.type ?? 'OVERALL').toUpperCase();
    const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : '2000-01-01';
    const to = typeof req.query.to === 'string' && req.query.to ? `${req.query.to} 23:59:59` : '2099-12-31 23:59:59';

    const zones = db.prepare('SELECT * FROM city_zones ORDER BY code').all();
    const traffic = db
      .prepare(
        `SELECT cz.code as zone_code, cz.name as zone_name, ROUND(AVG(td.congestion_index), 1) as avg_congestion,
                ROUND(AVG(td.avg_speed_kmh), 1) as avg_speed, MAX(td.vehicle_count) as peak_vehicles
         FROM traffic_data td JOIN city_zones cz ON cz.id = td.zone_id
         WHERE td.recorded_at BETWEEN ? AND ?
         GROUP BY cz.id ORDER BY cz.code`
      )
      .all(from, to);

    const environment = db
      .prepare(
        `SELECT cz.code as zone_code, cz.name as zone_name, ROUND(AVG(ed.aqi), 1) as avg_aqi,
                ROUND(AVG(ed.pm25), 1) as avg_pm25, ROUND(AVG(ed.noise_db), 1) as avg_noise,
                ROUND(AVG(ed.water_quality_index), 1) as avg_wqi
         FROM environmental_data ed JOIN city_zones cz ON cz.id = ed.zone_id
         WHERE ed.recorded_at BETWEEN ? AND ?
         GROUP BY cz.id ORDER BY cz.code`
      )
      .all(from, to);

    const energy = db
      .prepare(
        `SELECT cz.code as zone_code, cz.name as zone_name, ROUND(SUM(eg.consumption_mwh), 1) as total_mwh,
                ROUND(AVG(eg.renewable_pct), 1) as avg_renewable_pct, ROUND(MAX(eg.grid_load_pct), 1) as max_grid_load
         FROM energy_data eg JOIN city_zones cz ON cz.id = eg.zone_id
         WHERE eg.period_type = 'DAILY' AND eg.recorded_at BETWEEN ? AND ?
         GROUP BY cz.id ORDER BY cz.code`
      )
      .all(from, to);

    const water = db
      .prepare(
        `SELECT cz.code as zone_code, cz.name as zone_name, ROUND(SUM(wd.consumption_ml), 1) as total_ml,
                ROUND(AVG(wd.reservoir_pct), 1) as avg_reservoir_pct, ROUND(AVG(wd.leakage_pct), 1) as avg_leakage_pct
         FROM water_data wd JOIN city_zones cz ON cz.id = wd.zone_id
         WHERE wd.period_type = 'DAILY' AND wd.recorded_at BETWEEN ? AND ?
         GROUP BY cz.id ORDER BY cz.code`
      )
      .all(from, to);

    const emergencies = db
      .prepare(
        `SELECT ei.*, cz.code as zone_code, cz.name as zone_name
         FROM emergency_incidents ei JOIN city_zones cz ON cz.id = ei.zone_id
         WHERE ei.created_at BETWEEN ? AND ?
         ORDER BY ei.id DESC`
      )
      .all(from, to);

    const predictions = db
      .prepare(
        `SELECT p.domain, p.risk_level, p.current_value, p.predicted_value, p.unit, p.confidence_pct, p.is_simulated, cz.code as zone_code, cz.name as zone_name
         FROM predictions p JOIN city_zones cz ON cz.id = p.zone_id
         ORDER BY cz.code, p.domain`
      )
      .all();

    res.json({
      reportType,
      dateRange: { from, to },
      generatedAt: new Date().toISOString(),
      zones,
      traffic,
      environment,
      energy,
      water,
      emergencies,
      predictions,
    });
  });

  return router;
}
