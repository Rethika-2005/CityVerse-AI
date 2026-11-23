package com.cityverse.agent;

import com.cityverse.entity.CityZone;
import com.cityverse.repository.CityZoneRepository;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class CentralCoordinationService {
    private final List<SmartCityAgent> agents;
    private final CityZoneRepository zoneRepository;

    public CentralCoordinationService(List<SmartCityAgent> agents, CityZoneRepository zoneRepository) {
        this.agents = agents;
        this.zoneRepository = zoneRepository;
    }

    public Map<String, Object> executeCoordinationCycle() {
        List<CityZone> zones = zoneRepository.findAllByOrderByCodeAsc();
        List<SmartCityAgent.AgentFinding> allFindings = new ArrayList<>();
        for (SmartCityAgent agent : agents) {
            allFindings.addAll(agent.analyze(zones));
        }
        String batchId = "COORD-" + Long.toString(System.currentTimeMillis(), 36).toUpperCase();
        return Map.of(
            "batchId", batchId,
            "agentsExecuted", agents.size(),
            "findingsCount", allFindings.size(),
            "findings", allFindings
        );
    }
}
