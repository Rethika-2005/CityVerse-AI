import React, { useState, useEffect } from 'react';
import { Siren, Plus, MapPin } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApiData } from '../hooks/useApiData';
import { StatusText } from '../components/StatusText';
import { SkeletonTable } from '../components/SkeletonLoader';
import { CityMap, type MapZoneItem } from '../components/CityMap';
import { formatTimestamp } from '../utils/formatters';

interface IncidentRow {
  id: number;
  zone_id: number;
  zone_code: string;
  zone_name: string;
  reporter_name: string | null;
  reported_by_name?: string | null;
  title: string;
  category: string;
  priority: string;
  status: string;
  location_detail: string;
  latitude: number;
  longitude: number;
  description?: string;
  response_recommendation: string;
  created_at: string;
}

interface LocationOption extends MapZoneItem {
  id: number;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
}

const INCIDENT_TYPE_OPTIONS = [
  { value: 'ROAD_ACCIDENT', label: 'Road Accident' },
  { value: 'FIRE', label: 'Fire Accident' },
  { value: 'FLOOD', label: 'Flood' },
  { value: 'WATER_LEAKAGE', label: 'Water Leakage' },
  { value: 'POWER_FAILURE', label: 'Power Failure' },
  { value: 'ENVIRONMENTAL_ALERT', label: 'Environmental Emergency' },
  { value: 'OTHER', label: 'Other' },
];

export function EmergencyPage() {
  const { user, isAdmin } = useAuth();
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { data: incidents, loading, error, reload } = useApiData<IncidentRow[]>(
    `/emergencies?priority=${priorityFilter}&status=${statusFilter}`,
    [priorityFilter, statusFilter]
  );
  const { data: zones } = useApiData<LocationOption[]>('/locations');

  const [zoneId, setZoneId] = useState('1');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ROAD_ACCIDENT');
  const [priority, setPriority] = useState('HIGH');
  const [locationDetail, setLocationDetail] = useState('');
  const [latitude, setLatitude] = useState('13.0850');
  const [longitude, setLongitude] = useState('80.2101');
  const [description, setDescription] = useState('');
  const [reportedByName, setReportedByName] = useState(user?.fullName ?? '');
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [incidentStatus, setIncidentStatus] = useState('OPEN');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (user?.fullName && !reportedByName) {
      setReportedByName(user.fullName);
    }
  }, [user?.fullName, reportedByName]);

  useEffect(() => {
    if (!zones || zones.length === 0) return;
    const match = zones.find((z) => String(z.id) === zoneId);
    if (match) {
      setLatitude(String(match.latitude));
      setLongitude(String(match.longitude));
    }
  }, [zoneId, zones]);

  function handlePickMapCoords(lat: number, lng: number) {
    setLatitude(String(lat));
    setLongitude(String(lng));
    setFeedback(`Map pin coordinates populated: ${lat}, ${lng}`);
  }

  async function handleReport(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.post<{
        message: string;
        agentAnalysis: { issue?: string; recommendation?: string } | string;
      }>('/emergencies', {
        zoneId: Number(zoneId),
        title,
        category,
        priority,
        locationDetail,
        latitude: Number(latitude),
        longitude: Number(longitude),
        description,
        reportedByName,
        incidentDate,
        status: isAdmin ? incidentStatus : 'OPEN',
      });
      const analysis =
        typeof res.data.agentAnalysis === 'string'
          ? res.data.agentAnalysis
          : `${res.data.agentAnalysis?.issue ?? ''} — ${res.data.agentAnalysis?.recommendation ?? ''}`;
      setTitle('');
      setLocationDetail('');
      setDescription('');
      setFeedback(`${res.data.message} Agent Dispatch Analysis: ${analysis}`);
      await reload();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to submit incident.';
      setFeedback(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: number, status: string) {
    await api.patch(`/emergencies/${id}/status`, { status });
    await reload();
  }

  const parsedLat = Number(latitude);
  const parsedLng = Number(longitude);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-50 tracking-tight">Emergency Incident Management</h2>
        <p className="text-xs text-slate-400 mt-1">
          Report Chennai zone incidents with interactive map coordinates, Emergency Response Agent triage, and live dispatch map
        </p>
      </div>

      {/* Live Incident & Zone Map */}
      <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Live Emergency Incident Map (OpenStreetMap)
            </h3>
            <p className="text-xs text-slate-400">
              Diamond markers denote geolocated incidents. Click anywhere on the map to auto-fill incident Latitude and Longitude.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-rose-500 rotate-45 inline-block" /> Critical Incident
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-amber-500 rotate-45 inline-block" /> High / Medium
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> Selected Pin
            </span>
          </div>
        </div>
        <CityMap
          zones={zones ?? []}
          incidents={(incidents ?? []).map((inc) => ({
            id: inc.id,
            title: inc.title,
            category: inc.category,
            priority: inc.priority,
            status: inc.status,
            location_detail: inc.location_detail,
            latitude: inc.latitude,
            longitude: inc.longitude,
            zone_name: inc.zone_name,
          }))}
          pickedCoords={
            Number.isFinite(parsedLat) && Number.isFinite(parsedLng)
              ? { lat: parsedLat, lng: parsedLng }
              : null
          }
          onPickCoords={handlePickMapCoords}
          heightClass="h-[360px]"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Emergency Reporting Form */}
        <div className="xl:col-span-5 bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Siren className="w-4 h-4 text-rose-400" aria-hidden="true" />
            <span>Emergency Reporting Form</span>
          </div>
          {feedback && (
            <div className="p-3 bg-cyan-950/40 border border-cyan-700/50 rounded text-xs text-cyan-200">
              {feedback}
            </div>
          )}
          <form onSubmit={handleReport} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Incident Type</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
                >
                  {INCIDENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">City Zone</label>
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
                >
                  {(zones ?? []).map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.code} · {z.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Incident Title</label>
              <input
                type="text"
                required
                minLength={3}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Feeder outage near Velachery Bypass"
                className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Incident Location / Landmark</label>
              <input
                type="text"
                required
                minLength={2}
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                placeholder="Street, junction, or public facility"
                className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Latitude (click map)</label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Longitude (click map)</label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Severity</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Incident Status</label>
                <select
                  value={isAdmin ? incidentStatus : 'OPEN'}
                  disabled={!isAdmin}
                  onChange={(e) => setIncidentStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100 disabled:opacity-70"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="DISPATCHED">DISPATCHED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Reported By</label>
                <input
                  type="text"
                  required
                  value={reportedByName}
                  onChange={(e) => setReportedByName(e.target.value)}
                  placeholder="Reporter full name"
                  className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Incident Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Incident Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Observed hazards, affected lanes, or impacted utilities..."
                className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-semibold rounded-md transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{submitting ? 'Submitting & Analyzing...' : 'Submit Incident Report'}</span>
            </button>
          </form>
        </div>

        {/* Incident Table & Filters */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0D1526] border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center gap-1">
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriorityFilter(p)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                    priorityFilter === p ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#070D19] border border-slate-700/80 rounded-md text-slate-200"
              aria-label="Filter incidents by status"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          {error && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/70 rounded-lg text-sm text-rose-200">{error}</div>
          )}

          {loading && !incidents ? (
            <SkeletonTable rows={5} />
          ) : (
            <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg divide-y divide-slate-800/60">
              {(incidents ?? []).map((inc) => (
                <div key={inc.id} className="p-5 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-cyan-400">#{inc.id} · {inc.zone_code}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-300">{inc.category.replaceAll('_', ' ')}</span>
                      <span className="text-slate-500">·</span>
                      <StatusText status={inc.priority} />
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400">{formatTimestamp(inc.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusText status={inc.status} />
                      {isAdmin && inc.status !== 'RESOLVED' && (
                        <select
                          value={inc.status}
                          onChange={(e) => handleStatusChange(inc.id, e.target.value)}
                          className="ml-2 px-2 py-1 text-xs bg-[#070D19] border border-slate-700 rounded text-slate-200"
                          aria-label={`Update status for incident ${inc.id}`}
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="DISPATCHED">DISPATCHED</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="RESOLVED">RESOLVED</option>
                        </select>
                      )}
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100">{inc.title}</h3>
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400" aria-hidden="true" />
                      {inc.location_detail} ({inc.zone_name})
                    </span>
                    <span className="font-mono tabular-nums text-slate-500">
                      [{Number(inc.latitude).toFixed(4)}, {Number(inc.longitude).toFixed(4)}]
                    </span>
                    <span>Reported by: {inc.reported_by_name || inc.reporter_name || 'Operations'}</span>
                  </div>
                  {inc.description && <p className="text-xs text-slate-300">{inc.description}</p>}
                  <div className="p-3 bg-[#070D19] border border-slate-800/70 rounded text-xs text-slate-300">
                    <span className="font-medium text-cyan-400">Response Protocol: </span>
                    {inc.response_recommendation}
                  </div>
                </div>
              ))}
              {incidents && incidents.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-400">
                  No emergency incidents match the selected filters.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
