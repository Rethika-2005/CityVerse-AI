package com.cityverse.controller;

import com.cityverse.agent.CentralCoordinationService;
import com.cityverse.entity.*;
import com.cityverse.repository.CityZoneRepository;
import com.cityverse.repository.TelemetryRepositories.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class DataInputController {
    private final CityZoneRepository zoneRepository;
    private final TrafficDataRepository trafficRepository;
    private final EnvironmentalDataRepository envRepository;
    private final EnergyDataRepository energyRepository;
    private final WaterDataRepository waterRepository;
    private final EmergencyIncidentRepository emergencyRepository;
    private final CentralCoordinationService coordinationService;

    public DataInputController(
        CityZoneRepository zoneRepository,
        TrafficDataRepository trafficRepository,
        EnvironmentalDataRepository envRepository,
        EnergyDataRepository energyRepository,
        WaterDataRepository waterRepository,
        EmergencyIncidentRepository emergencyRepository,
        CentralCoordinationService coordinationService
    ) {
        this.zoneRepository = zoneRepository;
        this.trafficRepository = trafficRepository;
        this.envRepository = envRepository;
        this.energyRepository = energyRepository;
        this.waterRepository = waterRepository;
        this.emergencyRepository = emergencyRepository;
        this.coordinationService = coordinationService;
    }

    private CityZone resolveZone(Object zoneIdObj) {
        Long zoneId = Long.valueOf(zoneIdObj.toString());
        return zoneRepository.findById(zoneId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "City zone not found."));
    }

    @PostMapping("/traffic")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> recordTraffic(@RequestBody Map<String, Object> body) {
        CityZone zone = resolveZone(body.get("zoneId"));
        int vehicles = Integer.parseInt(body.get("vehicleCount").toString());
        int capacity = Integer.parseInt(body.getOrDefault("roadCapacity", 5000).toString());
        double avgSpeed = Double.parseDouble(body.get("avgSpeed").toString());
        double congestionIdx = Math.min(100.0, Math.max(5.0, ((double) vehicles / capacity) * 85.0 + Math.max(0.0, 45.0 - avgSpeed) * 0.45));

        TrafficData td = new TrafficData();
        td.setCityId(Long.valueOf(body.getOrDefault("cityId", 1).toString()));
        td.setZone(zone);
        td.setCorridorName(body.get("roadName").toString());
        td.setVehicleCount(vehicles);
        td.setAvgSpeedKmh(avgSpeed);
        td.setCongestionIndex(congestionIdx);
        td.setCongestionLevel(body.getOrDefault("trafficDensity", congestionIdx >= 70 ? "HIGH" : "MODERATE").toString());
        td.setTrafficDensity(td.getCongestionLevel());
        td.setRoadCapacity(capacity);
        td.setAccidentCount(Integer.parseInt(body.getOrDefault("accidentCount", 0).toString()));
        td.setWeatherCondition(body.getOrDefault("weatherCondition", "Clear").toString());
        td.setSuggestedReroute(congestionIdx >= 70 ? "Divert onto parallel ring corridor" : "Nominal signal phase");
        td.setIsSimulated(false);
        trafficRepository.save(td);

        return Map.of(
            "message", "Traffic telemetry stored and Traffic Management Agent triggered.",
            "congestionIndex", congestionIdx,
            "coordination", coordinationService.executeCoordinationCycle()
        );
    }

    @PostMapping("/environment/reading")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> recordEnvironment(@RequestBody Map<String, Object> body) {
        CityZone zone = resolveZone(body.get("zoneId"));
        int aqi = Integer.parseInt(body.get("aqi").toString());

        EnvironmentalData ed = new EnvironmentalData();
        ed.setZone(zone);
        ed.setAqi(aqi);
        ed.setPm25(Double.parseDouble(body.getOrDefault("pm25", 18.0).toString()));
        ed.setPm10(Double.parseDouble(body.getOrDefault("pm10", 35.0).toString()));
        ed.setWaterQualityIndex(Double.parseDouble(body.getOrDefault("waterQualityIndex", 90.0).toString()));
        ed.setNoiseDb(Double.parseDouble(body.getOrDefault("noiseDb", 60.0).toString()));
        ed.setCo2Level(Double.parseDouble(body.getOrDefault("co2Level", 412.0).toString()));
        ed.setTemperatureC(Double.parseDouble(body.getOrDefault("temperatureC", 30.0).toString()));
        ed.setHumidityPct(Integer.parseInt(body.getOrDefault("humidityPct", 68).toString()));
        ed.setPollutionLevel(aqi >= 151 ? "HAZARDOUS" : aqi >= 101 ? "UNHEALTHY" : aqi >= 51 ? "MODERATE" : "GOOD");
        ed.setIsSimulated(false);
        envRepository.save(ed);

        return Map.of(
            "message", "Environmental reading stored and Environmental Agent triggered.",
            "coordination", coordinationService.executeCoordinationCycle()
        );
    }

    @PostMapping("/energy")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> recordEnergy(@RequestBody Map<String, Object> body) {
        CityZone zone = resolveZone(body.get("zoneId"));
        double total = Double.parseDouble(body.get("totalEnergyConsumption").toString());
        double renewable = Double.parseDouble(body.getOrDefault("renewableEnergy", 0.0).toString());
        double nonRenewable = Double.parseDouble(body.getOrDefault("nonRenewableEnergy", Math.max(0.0, total - renewable)).toString());
        double peakMw = Double.parseDouble(body.getOrDefault("peakDemandMw", total * 0.17).toString());

        EnergyData eg = new EnergyData();
        eg.setZone(zone);
        eg.setConsumptionMwh(total);
        eg.setRenewableEnergyMwh(renewable);
        eg.setNonRenewableEnergyMwh(nonRenewable);
        eg.setRenewablePct(Math.min(100.0, (renewable / total) * 100.0));
        eg.setPeakDemandMw(peakMw);
        eg.setGridLoadPct(Math.min(99.0, Math.max(20.0, (peakMw / 52.0) * 100.0)));
        eg.setStreetLightCount(Integer.parseInt(body.getOrDefault("streetLightCount", 1800).toString()));
        eg.setActiveStreetLights(Integer.parseInt(body.getOrDefault("activeStreetLights", 1750).toString()));
        eg.setPowerOutages(Integer.parseInt(body.getOrDefault("powerOutages", 0).toString()));
        eg.setIsSimulated(false);
        energyRepository.save(eg);

        return Map.of(
            "message", "Energy telemetry stored and Energy Agent triggered.",
            "coordination", coordinationService.executeCoordinationCycle()
        );
    }

    @PostMapping("/water")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> recordWater(@RequestBody Map<String, Object> body) {
        CityZone zone = resolveZone(body.get("zoneId"));
        WaterData wd = new WaterData();
        wd.setZone(zone);
        wd.setTotalSupplyMl(Double.parseDouble(body.get("totalWaterSupply").toString()));
        wd.setConsumptionMl(Double.parseDouble(body.get("waterConsumption").toString()));
        wd.setReservoirPct(Double.parseDouble(body.get("waterTankLevel").toString()));
        wd.setWaterQualityIndex(Double.parseDouble(body.getOrDefault("waterQuality", 90.0).toString()));
        wd.setSupplyPressureBar(Double.parseDouble(body.getOrDefault("waterPressure", 4.2).toString()));
        wd.setLeakageStatus(body.getOrDefault("leakageStatus", "NORMAL").toString());
        wd.setLeakagePct("CRITICAL_LEAK".equals(wd.getLeakageStatus()) ? 14.5 : 3.8);
        wd.setRainfallMm(Double.parseDouble(body.getOrDefault("rainfall", 0.0).toString()));
        wd.setIsSimulated(false);
        waterRepository.save(wd);

        return Map.of(
            "message", "Water telemetry stored and Water Management Agent triggered.",
            "coordination", coordinationService.executeCoordinationCycle()
        );
    }

    @PostMapping("/emergencies")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> reportEmergency(@RequestBody Map<String, Object> body) {
        CityZone zone = resolveZone(body.get("zoneId"));
        EmergencyIncident inc = new EmergencyIncident();
        inc.setZone(zone);
        inc.setTitle(body.get("title").toString());
        inc.setCategory(body.get("category").toString());
        inc.setPriority(body.get("priority").toString());
        inc.setLocationDetail(body.get("locationDetail").toString());
        inc.setLatitude(Double.valueOf(body.getOrDefault("latitude", zone.getLatitude()).toString()));
        inc.setLongitude(Double.valueOf(body.getOrDefault("longitude", zone.getLongitude()).toString()));
        inc.setDescription(body.getOrDefault("description", "").toString());
        inc.setReportedByName(body.getOrDefault("reportedByName", "Operator").toString());
        inc.setResponseRecommendation("Dispatch emergency response crew to " + inc.getLocationDetail());
        EmergencyIncident saved = emergencyRepository.save(inc);

        return Map.of(
            "id", saved.getId(),
            "message", "Emergency incident logged and Emergency Agent triggered.",
            "coordination", coordinationService.executeCoordinationCycle()
        );
    }
}
