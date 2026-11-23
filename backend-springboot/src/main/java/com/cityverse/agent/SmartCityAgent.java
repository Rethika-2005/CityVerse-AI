package com.cityverse.agent;

import com.cityverse.entity.CityZone;
import java.util.List;

public interface SmartCityAgent {
    String getAgentKey();
    String getAgentName();
    List<AgentFinding> analyze(List<CityZone> zones);

    record AgentFinding(
        String agentKey,
        String agentName,
        Long zoneId,
        String zoneCode,
        String severity,
        String issue,
        String analysis,
        String recommendation
    ) {}
}
