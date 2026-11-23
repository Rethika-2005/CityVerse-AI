import React, { useState } from 'react';
import {
  Building2,
  Hospital,
  GraduationCap,
  Zap,
  Droplets,
  TrainFront,
  Route,
  Siren,
} from 'lucide-react';
import { useApiData } from '../hooks/useApiData';
import { CityMap, type MapIncidentItem } from '../components/CityMap';
import { StatusText } from '../components/StatusText';
import { SkeletonGrid } from '../components/SkeletonLoader';
import { formatNumber } from '../utils/formatters';

interface InfraAsset {
  id: number;
  name: string;
  asset_type: 'ROAD' | 'HOSPITAL' | 'SCHOOL' | 'SUBSTATION' | 'WATER_PLANT' | 'TRANSIT_HUB' | 'BUILDING';
  status: string;
  load_pct: number;
  capacity_pct: number;
}

interface TwinZone {
  id: number;
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
  status: string;
  traffic?: { corridor_name: string; congestion_index: number; avg_speed_kmh: number; congestion_level: string };
  environment?: { aqi: number; pm25: number; noise_db: number; water_quality_index: number; pollution_level: string };
  energy?: { consumption_mwh: number; renewable_pct: number; grid_load_pct: number };
  water?: { consumption_ml: number; reservoir_pct: number; leakage_pct: number };
  infrastructure: InfraAsset[];
  openIncidents: MapIncidentItem[];
}

type ZoneTypeFilter = 'ALL' | 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'CIVIC' | 'MIXED';

function assetIcon(type: InfraAsset['asset_type']) {
  switch (type) {
    case 'HOSPITAL':
      return Hospital;
    case 'SCHOOL':
      return GraduationCap;
    case 'SUBSTATION':
      return Zap;
    case 'WATER_PLANT':
      return Droplets;
    case 'TRANSIT_HUB':
      return TrainFront;
    case 'ROAD':
      return Route;
    default:
      return Building2;
  }
}

export function DigitalTwinPage() {
  const { data: zones, loading, error } = useApiData<TwinZone[]>('/zones');
  const { data: incidents } = useApiData<MapIncidentItem[]>('/emergencies');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [zoneFilter, setZoneFilter] = useState<ZoneTypeFilter>('ALL');

  const filteredZones = (zones ?? []).filter(
    (z) => zoneFilter === 'ALL' || z.zone_type === zoneFilter
  );
  const selectedZone =
    filteredZones.find((z) => z.id === selectedId) ?? filteredZones[0] ?? zones?.[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-50 tracking-tight">
            Smart City Digital Twin Map
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Live OpenStreetMap spatial twin with zone telemetry, infrastructure loads, and active emergency markers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0D1526] border border-slate-800 rounded-lg">
          {(['ALL', 'RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'CIVIC', 'MIXED'] as ZoneTypeFilter[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setZoneFilter(l)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                zoneFilter === l ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {l === 'ALL' ? 'All Zones' : l.charAt(0) + l.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/70 rounded-lg text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading && !zones ? (
        <SkeletonGrid count={6} />
      ) : zones ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 bg-[#0A1120] border border-slate-800/80 rounded-lg p-5 space-y-5">
            <CityMap
              centerLat={selectedZone?.latitude ?? 13.025}
              centerLng={selectedZone?.longitude ?? 80.225}
              zoom={11}
              zones={filteredZones}
              incidents={(incidents ?? []).filter((i) => i.status !== 'RESOLVED')}
              selectedZoneId={selectedZone?.id ?? null}
              onSelectZone={(z) => setSelectedId(z.id)}
              heightClass="h-[460px]"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredZones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setSelectedId(z.id)}
                  className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    selectedZone?.id === z.id
                      ? 'border-cyan-400 bg-cyan-950/20'
                      : 'border-slate-800/80 bg-[#0D1526] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-cyan-400">{z.code}</span>
                    <StatusText status={z.status} />
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-100 truncate">{z.name}</div>
                  <div className="mt-1.5 text-xs text-slate-400 font-mono tabular-nums">
                    Health {z.health_score.toFixed(1)} · AQI {z.environment?.aqi ?? '—'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="xl:col-span-4 bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 space-y-5">
            {selectedZone && (
              <>
                <div className="pb-4 border-b border-slate-800/80">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-cyan-400">
                      {selectedZone.code} · {selectedZone.zone_type}
                    </span>
                    <StatusText status={selectedZone.status} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-50 mt-1">{selectedZone.name}</h3>
                  <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
                    Pop {formatNumber(selectedZone.population)} · Area {selectedZone.area_sq_km} km² · Score {selectedZone.health_score.toFixed(1)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#070D19] rounded-md border border-slate-800/70">
                    <div className="text-slate-400">Traffic Flow</div>
                    <div className="mt-1 font-mono tabular-nums text-sm font-semibold text-slate-100">
                      {selectedZone.traffic?.congestion_index ?? '—'}% ({selectedZone.traffic?.avg_speed_kmh ?? '—'} km/h)
                    </div>
                  </div>
                  <div className="p-3 bg-[#070D19] rounded-md border border-slate-800/70">
                    <div className="text-slate-400">Air Quality</div>
                    <div className="mt-1 font-mono tabular-nums text-sm font-semibold text-slate-100">
                      {selectedZone.environment?.aqi ?? '—'} AQI ({selectedZone.environment?.pm25 ?? '—'} PM2.5)
                    </div>
                  </div>
                  <div className="p-3 bg-[#070D19] rounded-md border border-slate-800/70">
                    <div className="text-slate-400">Grid Load</div>
                    <div className="mt-1 font-mono tabular-nums text-sm font-semibold text-slate-100">
                      {selectedZone.energy?.grid_load_pct ?? '—'}% ({selectedZone.energy?.renewable_pct ?? '—'}% ren)
                    </div>
                  </div>
                  <div className="p-3 bg-[#070D19] rounded-md border border-slate-800/70">
                    <div className="text-slate-400">Water Reserve</div>
                    <div className="mt-1 font-mono tabular-nums text-sm font-semibold text-slate-100">
                      {selectedZone.water?.reservoir_pct ?? '—'}% ({selectedZone.water?.leakage_pct ?? '—'}% loss)
                    </div>
                  </div>
                </div>

                {selectedZone.infrastructure_details && (
                  <div className="p-3 bg-[#070D19] border border-slate-800/70 rounded-md text-xs text-slate-300">
                    <span className="text-slate-400 font-medium">Zone Infrastructure: </span>
                    {selectedZone.infrastructure_details}
                  </div>
                )}

                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-slate-300">Monitored Infrastructure Assets</h4>
                  <div className="divide-y divide-slate-800/60 border border-slate-800/70 rounded-md bg-[#070D19]">
                    {selectedZone.infrastructure.map((asset) => {
                      const Icon = assetIcon(asset.asset_type);
                      return (
                        <div key={asset.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
                            <div className="min-w-0">
                              <div className="text-slate-200 font-medium truncate">{asset.name}</div>
                              <div className="text-slate-500 font-mono tabular-nums">
                                {asset.asset_type} · Load {asset.load_pct}%
                              </div>
                            </div>
                          </div>
                          <StatusText status={asset.status} />
                        </div>
                      );
                    })}
                    {selectedZone.infrastructure.length === 0 && (
                      <div className="p-3 text-xs text-slate-500">No individual sub-assets registered yet.</div>
                    )}
                  </div>
                </div>

                {selectedZone.openIncidents.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                      <Siren className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Active Incidents in {selectedZone.name}</span>
                    </h4>
                    <div className="space-y-2">
                      {selectedZone.openIncidents.map((inc) => (
                        <div key={inc.id} className="p-3 bg-rose-950/30 border border-rose-800/60 rounded-md text-xs">
                          <div className="font-medium text-rose-100">{inc.title}</div>
                          <div className="text-rose-300/80 mt-0.5">
                            {inc.priority} · {inc.category.replaceAll('_', ' ')} · {inc.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
