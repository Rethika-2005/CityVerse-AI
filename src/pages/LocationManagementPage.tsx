import React, { useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, Search, Eye } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApiData } from '../hooks/useApiData';
import { CityMap, type MapZoneItem } from '../components/CityMap';
import { StatusText } from '../components/StatusText';
import { SkeletonTable } from '../components/SkeletonLoader';
import { formatNumber } from '../utils/formatters';

interface CityItem {
  id: number;
  country: string;
  state: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface LocationItem extends MapZoneItem {
  city_id: number;
  city_name: string;
  state_name: string;
  country_name: string;
  population: number;
  area_sq_km: number;
}

export function LocationManagementPage() {
  const { isAdmin } = useAuth();
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [zoneTypeFilter, setZoneTypeFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const { data: cities, reload: reloadCities } = useApiData<CityItem[]>('/cities');
  const { data: locations, loading, error, reload: reloadLocations } = useApiData<LocationItem[]>(
    `/locations?cityId=${selectedCityId}&zoneType=${zoneTypeFilter}&search=${encodeURIComponent(search)}`,
    [selectedCityId, zoneTypeFilter, search]
  );

  // Selected / inspected location
  const [viewedLocation, setViewedLocation] = useState<LocationItem | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Add City inline toggle
  const [showAddCity, setShowAddCity] = useState(false);
  const [cityCountry, setCityCountry] = useState('India');
  const [cityState, setCityState] = useState('Tamil Nadu');
  const [cityName, setCityName] = useState('');
  const [cityLat, setCityLat] = useState('13.0827');
  const [cityLng, setCityLng] = useState('80.2707');

  // Location Form Fields
  const [country, setCountry] = useState('India');
  const [stateName, setStateName] = useState('Tamil Nadu');
  const [formCityId, setFormCityId] = useState('1');
  const [zoneCode, setZoneCode] = useState('');
  const [cityZoneName, setCityZoneName] = useState('');
  const [areaName, setAreaName] = useState('');
  const [latitude, setLatitude] = useState('13.0827');
  const [longitude, setLongitude] = useState('80.2707');
  const [population, setPopulation] = useState('120000');
  const [areaSize, setAreaSize] = useState('12.5');
  const [zoneType, setZoneType] = useState('RESIDENTIAL');
  const [infrastructureDetails, setInfrastructureDetails] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const activeCity =
    cities?.find((c) => String(c.id) === selectedCityId) ?? cities?.[0];

  function handleMapPick(lat: number, lng: number) {
    setLatitude(String(lat));
    setLongitude(String(lng));
    setFeedback({ type: 'ok', text: `Map coordinates selected: ${lat}, ${lng}` });
  }

  function startEdit(loc: LocationItem) {
    setEditingId(loc.id);
    setCountry(loc.country_name || 'India');
    setStateName(loc.state_name || 'Tamil Nadu');
    setFormCityId(String(loc.city_id || 1));
    setZoneCode(loc.code);
    setCityZoneName(loc.name);
    setAreaName(loc.area_name || loc.name);
    setLatitude(String(loc.latitude));
    setLongitude(String(loc.longitude));
    setPopulation(String(loc.population));
    setAreaSize(String(loc.area_sq_km));
    setZoneType(loc.zone_type);
    setInfrastructureDetails(loc.infrastructure_details || '');
    setViewedLocation(loc);
  }

  function resetForm() {
    setEditingId(null);
    setZoneCode('');
    setCityZoneName('');
    setAreaName('');
    setInfrastructureDetails('');
  }

  async function handleAddCity(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await api.post('/cities', {
        country: cityCountry,
        state: cityState,
        name: cityName,
        latitude: Number(cityLat),
        longitude: Number(cityLng),
      });
      setCityName('');
      setShowAddCity(false);
      setFeedback({ type: 'ok', text: `City ${cityName} added successfully.` });
      await reloadCities();
    } catch (err: unknown) {
      setFeedback({
        type: 'err',
        text: (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to add city.',
      });
    }
  }

  async function handleSaveLocation(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        cityId: Number(formCityId || activeCity?.id || 1),
        code: zoneCode || undefined,
        name: cityZoneName,
        areaName,
        zoneType,
        population: Number(population),
        areaSqKm: Number(areaSize),
        latitude: Number(latitude),
        longitude: Number(longitude),
        infrastructureDetails,
      };

      if (editingId) {
        await api.put(`/locations/${editingId}`, payload);
        setFeedback({ type: 'ok', text: `Updated location ${cityZoneName}.` });
      } else {
        await api.post('/locations', payload);
        setFeedback({ type: 'ok', text: `Added new location ${cityZoneName}.` });
      }
      resetForm();
      await reloadLocations();
    } catch (err: unknown) {
      setFeedback({
        type: 'err',
        text: (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Unable to save location.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(loc: LocationItem) {
    setFeedback(null);
    try {
      await api.delete(`/locations/${loc.id}`);
      if (viewedLocation?.id === loc.id) setViewedLocation(null);
      if (editingId === loc.id) resetForm();
      setFeedback({ type: 'ok', text: `Deleted location ${loc.name}.` });
      await reloadLocations();
    } catch {
      setFeedback({ type: 'err', text: 'Failed to delete location.' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-50 tracking-tight">
            City &amp; Location Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage cities, Chennai smart zones, geographic coordinates, and OpenStreetMap markers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCityId}
            onChange={(e) => setSelectedCityId(e.target.value)}
            className="px-3 py-2 text-xs bg-[#0D1526] border border-slate-700/80 rounded-md text-slate-100"
            aria-label="Select city"
          >
            <option value="">All Cities ({cities?.length ?? 1})</option>
            {(cities ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}, {c.state} ({c.country})
              </option>
            ))}
          </select>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddCity(!showAddCity)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showAddCity ? 'Close City Form' : 'Add New City'}</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-md border text-xs ${
            feedback.type === 'ok'
              ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-200'
              : 'bg-rose-950/40 border-rose-800/70 text-rose-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {showAddCity && isAdmin && (
        <form
          onSubmit={handleAddCity}
          className="bg-[#0D1526] border border-cyan-500/40 rounded-lg p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end text-xs"
        >
          <div>
            <label className="block text-slate-400 mb-1">Country</label>
            <input
              type="text"
              required
              value={cityCountry}
              onChange={(e) => setCityCountry(e.target.value)}
              className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">State</label>
            <input
              type="text"
              required
              value={cityState}
              onChange={(e) => setCityState(e.target.value)}
              className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">City Name</label>
            <input
              type="text"
              required
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="e.g., Coimbatore"
              className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Center Lat</label>
            <input
              type="number"
              step="0.0001"
              required
              value={cityLat}
              onChange={(e) => setCityLat(e.target.value)}
              className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Center Lng</label>
            <input
              type="number"
              step="0.0001"
              required
              value={cityLng}
              onChange={(e) => setCityLng(e.target.value)}
              className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono"
            />
          </div>
          <button
            type="submit"
            className="py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded cursor-pointer"
          >
            Save City
          </button>
        </form>
      )}

      {/* Interactive OpenStreetMap + Form */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className={`${isAdmin ? 'xl:col-span-7' : 'xl:col-span-12'} bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Interactive City Map (OpenStreetMap · {activeCity?.name ?? 'Chennai'})
              </h3>
              <p className="text-xs text-slate-400">
                {isAdmin
                  ? 'Click any zone marker to inspect, or click anywhere on the map to populate Latitude & Longitude.'
                  : 'Click any zone marker to view infrastructure and monitoring details.'}
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#070D19] border border-slate-800 rounded-md overflow-x-auto">
              {(['ALL', 'RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'CIVIC', 'MIXED'] as const).map((zt) => (
                <button
                  key={zt}
                  type="button"
                  onClick={() => setZoneTypeFilter(zt)}
                  className={`px-2 py-1 text-xs rounded transition-colors cursor-pointer whitespace-nowrap ${
                    zoneTypeFilter === zt ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {zt === 'ALL' ? 'All' : zt.charAt(0) + zt.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <CityMap
            centerLat={activeCity?.latitude ?? 13.025}
            centerLng={activeCity?.longitude ?? 80.225}
            zoom={11}
            zones={locations ?? []}
            selectedZoneId={viewedLocation?.id ?? null}
            pickedCoords={
              isAdmin && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
                ? { lat: Number(latitude), lng: Number(longitude) }
                : null
            }
            onSelectZone={(z) => setViewedLocation(z as LocationItem)}
            onPickCoords={isAdmin ? handleMapPick : undefined}
            heightClass="h-[440px]"
          />

          {viewedLocation && (
            <div className="p-4 bg-[#070D19] border border-slate-800/80 rounded-md space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm text-slate-100">
                  {viewedLocation.name} ({viewedLocation.code}) · {viewedLocation.area_name}
                </div>
                <StatusText status={viewedLocation.status} />
              </div>
              <div className="text-slate-400 font-mono tabular-nums">
                Lat {viewedLocation.latitude} · Lng {viewedLocation.longitude} · Pop {formatNumber(viewedLocation.population)} · Area {viewedLocation.area_sq_km} km²
              </div>
              <div className="text-slate-300">
                <span className="text-slate-400 font-medium">Infrastructure: </span>
                {viewedLocation.infrastructure_details || 'Standard municipal assets'}
              </div>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="xl:col-span-5 bg-[#0D1526] border border-slate-800/80 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <MapPin className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                <span>{editingId ? 'Edit Location Details' : 'Add City Zone / Location'}</span>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">City</label>
                  <select
                    value={formCityId}
                    onChange={(e) => setFormCityId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
                  >
                    {(cities ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">City Zone</label>
                  <input
                    type="text"
                    required
                    value={cityZoneName}
                    onChange={(e) => setCityZoneName(e.target.value)}
                    placeholder="e.g., Sholinganallur"
                    className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Area Name</label>
                  <input
                    type="text"
                    required
                    value={areaName}
                    onChange={(e) => setAreaName(e.target.value)}
                    placeholder="e.g., OMR Tech Corridor South"
                    className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
                  />
                </div>
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
                    className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono"
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
                    className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Population</label>
                  <input
                    type="number"
                    required
                    value={population}
                    onChange={(e) => setPopulation(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Area Size (km²)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={areaSize}
                    onChange={(e) => setAreaSize(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Zone Type</label>
                  <select
                    value={zoneType}
                    onChange={(e) => setZoneType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
                  >
                    <option value="RESIDENTIAL">RESIDENTIAL</option>
                    <option value="COMMERCIAL">COMMERCIAL</option>
                    <option value="INDUSTRIAL">INDUSTRIAL</option>
                    <option value="CIVIC">CIVIC</option>
                    <option value="MIXED">MIXED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Infrastructure Details</label>
                <textarea
                  rows={2}
                  value={infrastructureDetails}
                  onChange={(e) => setInfrastructureDetails(e.target.value)}
                  placeholder="Transit hubs, substations, hospitals, water treatment plants..."
                  className="w-full px-3 py-2 bg-[#070D19] border border-slate-700/80 rounded text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-semibold rounded-md transition-colors cursor-pointer"
              >
                {saving ? 'Saving Location...' : editingId ? 'Update Location' : 'Register Zone Location'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Search & Registered Locations Table */}
      <div className="bg-[#0D1526] border border-slate-800/80 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-100">
            Registered City Locations ({locations?.length ?? 0})
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search zone, area, or code..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#070D19] border border-slate-700/80 rounded-md text-slate-100"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 text-xs text-rose-300">{error}</div>
        )}

        {loading && !locations ? (
          <SkeletonTable rows={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-400">
                  <th className="py-3 px-4 font-medium">Code</th>
                  <th className="py-3 px-4 font-medium">City Zone &amp; Area</th>
                  <th className="py-3 px-4 font-medium">City</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">Coordinates</th>
                  <th className="py-3 px-4 font-medium text-right">Population</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(locations ?? []).map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono text-cyan-400">{loc.code}</td>
                    <td className="py-3 px-4">
                      <div className="text-slate-100 font-medium">{loc.name}</div>
                      <div className="text-slate-500">{loc.area_name}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{loc.city_name || 'Chennai'}</td>
                    <td className="py-3 px-4 text-slate-400">{loc.zone_type}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-400">
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-200">
                      {formatNumber(loc.population)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={loc.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => setViewedLocation(loc)}
                        className="p-1.5 text-slate-300 hover:text-cyan-400 cursor-pointer"
                        title="View location details"
                        aria-label={`View ${loc.name}`}
                      >
                        <Eye className="w-3.5 h-3.5 inline" />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(loc)}
                            className="p-1.5 text-slate-300 hover:text-cyan-400 cursor-pointer"
                            title="Edit location"
                            aria-label={`Edit ${loc.name}`}
                          >
                            <Pencil className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(loc)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer"
                            title="Delete location"
                            aria-label={`Delete ${loc.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
