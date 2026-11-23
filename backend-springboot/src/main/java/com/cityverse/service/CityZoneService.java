package com.cityverse.service;

import com.cityverse.entity.CityZone;
import com.cityverse.repository.CityZoneRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class CityZoneService {
    private final CityZoneRepository zoneRepository;

    public CityZoneService(CityZoneRepository zoneRepository) {
        this.zoneRepository = zoneRepository;
    }

    public List<CityZone> getAllZones() {
        return zoneRepository.findAllByOrderByCodeAsc();
    }
}
