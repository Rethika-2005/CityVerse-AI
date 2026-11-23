import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapZoneItem {
  id: number;
  code: string;
  name: string;
  area_name?: string;
  zone_type: string;
  latitude: number;
  longitude: number;
  status: string;
  health_score?: number;
  infrastructure_details?: string;
  traffic?: { congestion_index?: number; avg_speed_kmh?: number };
  environment?: { aqi?: number };
}

export interface MapIncidentItem {
  id: number;
  title: string;
  category: string;
  priority: string;
  status: string;
  location_detail: string;
  latitude: number;
  longitude: number;
  zone_name?: string;
}

interface CityMapProps {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  zones: MapZoneItem[];
  incidents?: MapIncidentItem[];
  selectedZoneId?: number | null;
  pickedCoords?: { lat: number; lng: number } | null;
  onSelectZone?: (zone: MapZoneItem) => void;
  onPickCoords?: (lat: number, lng: number) => void;
  heightClass?: string;
}

function markerColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'CRITICAL':
      return '#F43F5E';
    case 'WARNING':
      return '#F59E0B';
    case 'ADVISORY':
      return '#06B6D4';
    default:
      return '#10B981';
  }
}

export function CityMap({
  centerLat = 13.025,
  centerLng = 80.225,
  zoom = 11,
  zones,
  incidents = [],
  selectedZoneId,
  pickedCoords,
  onSelectZone,
  onPickCoords,
  heightClass = 'h-[430px]',
}: CityMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const onPickRef = useRef(onPickCoords);
  const onSelectZoneRef = useRef(onSelectZone);

  onPickRef.current = onPickCoords;
  onSelectZoneRef.current = onSelectZone;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onPickRef.current) {
        onPickRef.current(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
      }
    });

    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([centerLat, centerLng], zoom, { animate: true });
    }
  }, [centerLat, centerLng, zoom]);

  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    for (const z of zones) {
      if (!Number.isFinite(z.latitude) || !Number.isFinite(z.longitude)) continue;
      const color = markerColor(z.status);
      const isSelected = selectedZoneId === z.id;

      const circle = L.circleMarker([z.latitude, z.longitude], {
        radius: isSelected ? 12 : 9,
        color: isSelected ? '#FFFFFF' : color,
        weight: isSelected ? 2.5 : 2,
        fillColor: color,
        fillOpacity: 0.78,
      });

      const popupLines = [
        `<strong>${z.name}</strong> (${z.code})`,
        `Type: ${z.zone_type} · Status: ${z.status}`,
        z.health_score !== undefined ? `Health: ${z.health_score.toFixed(1)}` : '',
        z.traffic?.congestion_index !== undefined
          ? `Traffic: ${z.traffic.congestion_index}% (${z.traffic.avg_speed_kmh ?? '—'} km/h)`
          : '',
        z.environment?.aqi !== undefined ? `AQI: ${z.environment.aqi}` : '',
        z.infrastructure_details ? `Infra: ${z.infrastructure_details}` : '',
      ]
        .filter(Boolean)
        .join('<br/>');

      circle.bindPopup(`<div style="font-size:12px;line-height:1.45;color:#0f172a;">${popupLines}</div>`);
      circle.bindTooltip(`${z.name}`, {
        direction: 'top',
        offset: [0, -8],
      });

      circle.on('click', () => {
        if (onSelectZoneRef.current) {
          onSelectZoneRef.current(z);
        }
      });

      circle.addTo(group);
    }

    for (const inc of incidents) {
      if (!Number.isFinite(inc.latitude) || !Number.isFinite(inc.longitude)) continue;
      const pinColor = inc.priority === 'CRITICAL' ? '#DC2626' : inc.priority === 'HIGH' ? '#EA580C' : '#D97706';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;background:${pinColor};border:2px solid #fff;border-radius:3px;transform:rotate(45deg);box-shadow:0 1px 4px rgba(0,0,0,0.45);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon });
      marker.bindPopup(
        `<div style="font-size:12px;line-height:1.45;color:#0f172a;">
          <strong>${inc.title}</strong><br/>
          Priority: ${inc.priority} · ${inc.category.replaceAll('_', ' ')}<br/>
          Status: ${inc.status}<br/>
          Location: ${inc.location_detail}
        </div>`
      );
      marker.addTo(group);
    }

    if (pickedCoords && Number.isFinite(pickedCoords.lat) && Number.isFinite(pickedCoords.lng)) {
      const pickIcon = L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;background:#06B6D4;border:3px solid #0F172A;border-radius:9999px;box-shadow:0 0 0 2px #22D3EE;"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([pickedCoords.lat, pickedCoords.lng], { icon: pickIcon })
        .bindTooltip(`Selected: ${pickedCoords.lat.toFixed(4)}, ${pickedCoords.lng.toFixed(4)}`, { permanent: false })
        .addTo(group);
    }
  }, [zones, incidents, selectedZoneId, pickedCoords]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClass} rounded-lg overflow-hidden border border-slate-800/80 z-0`}
    />
  );
}
