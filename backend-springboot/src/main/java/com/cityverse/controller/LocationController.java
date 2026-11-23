package com.cityverse.controller;

import com.cityverse.entity.City;
import com.cityverse.entity.CityZone;
import com.cityverse.repository.CityRepository;
import com.cityverse.repository.CityZoneRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class LocationController {
    private final CityRepository cityRepository;
    private final CityZoneRepository zoneRepository;

    public LocationController(CityRepository cityRepository, CityZoneRepository zoneRepository) {
        this.cityRepository = cityRepository;
        this.zoneRepository = zoneRepository;
    }

    @GetMapping("/cities")
    public List<City> listCities() {
        return cityRepository.findAll();
    }

    @PostMapping("/cities")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public City createCity(@RequestBody City city) {
        if (cityRepository.findByNameIgnoreCase(city.getName()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "City already exists.");
        }
        return cityRepository.save(city);
    }

    @GetMapping("/locations")
    public List<CityZone> listLocations(
        @RequestParam(required = false) Long cityId,
        @RequestParam(defaultValue = "ALL") String zoneType,
        @RequestParam(defaultValue = "") String search
    ) {
        String q = search.trim().toLowerCase();
        return zoneRepository.findAllByOrderByCodeAsc().stream()
            .filter(z -> cityId == null || (z.getCity() != null && z.getCity().getId().equals(cityId)))
            .filter(z -> "ALL".equalsIgnoreCase(zoneType) || z.getZoneType().equalsIgnoreCase(zoneType))
            .filter(z -> q.isEmpty()
                || z.getName().toLowerCase().contains(q)
                || z.getAreaName().toLowerCase().contains(q)
                || z.getCode().toLowerCase().contains(q))
            .collect(Collectors.toList());
    }

    @PostMapping("/locations")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public CityZone createLocation(@RequestBody Map<String, Object> body) {
        Long cityId = body.get("cityId") != null ? Long.valueOf(body.get("cityId").toString()) : 1L;
        City city = cityRepository.findById(cityId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "City not found."));

        CityZone zone = new CityZone();
        zone.setCity(city);
        zone.setCode(body.getOrDefault("code", "CHN-" + (zoneRepository.count() + 1)).toString());
        zone.setName(body.get("name").toString());
        zone.setAreaName(body.getOrDefault("areaName", zone.getName()).toString());
        zone.setZoneType(body.get("zoneType").toString());
        zone.setPopulation(Integer.valueOf(body.getOrDefault("population", 80000).toString()));
        zone.setAreaSqKm(Double.valueOf(body.getOrDefault("areaSqKm", 10.0).toString()));
        zone.setLatitude(Double.valueOf(body.get("latitude").toString()));
        zone.setLongitude(Double.valueOf(body.get("longitude").toString()));
        zone.setInfrastructureDetails(body.getOrDefault("infrastructureDetails", "").toString());
        return zoneRepository.save(zone);
    }

    @PutMapping("/locations/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CityZone updateLocation(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        CityZone zone = zoneRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found."));

        if (body.get("name") != null) zone.setName(body.get("name").toString());
        if (body.get("areaName") != null) zone.setAreaName(body.get("areaName").toString());
        if (body.get("zoneType") != null) zone.setZoneType(body.get("zoneType").toString());
        if (body.get("population") != null) zone.setPopulation(Integer.valueOf(body.get("population").toString()));
        if (body.get("areaSqKm") != null) zone.setAreaSqKm(Double.valueOf(body.get("areaSqKm").toString()));
        if (body.get("latitude") != null) zone.setLatitude(Double.valueOf(body.get("latitude").toString()));
        if (body.get("longitude") != null) zone.setLongitude(Double.valueOf(body.get("longitude").toString()));
        if (body.get("infrastructureDetails") != null) zone.setInfrastructureDetails(body.get("infrastructureDetails").toString());
        return zoneRepository.save(zone);
    }

    @DeleteMapping("/locations/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> deleteLocation(@PathVariable Long id) {
        zoneRepository.deleteById(id);
        return Map.of("message", "Location deleted.");
    }
}
