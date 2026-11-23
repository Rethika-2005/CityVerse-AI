package com.cityverse.controller;

import com.cityverse.agent.CentralCoordinationService;
import com.cityverse.ai.GeminiDecisionService;
import com.cityverse.dto.AuthDtos;
import com.cityverse.entity.CityZone;
import com.cityverse.service.CityZoneService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class CityController {
    private final CityZoneService zoneService;
    private final CentralCoordinationService coordinationService;
    private final GeminiDecisionService geminiService;

    public CityController(
        CityZoneService zoneService,
        CentralCoordinationService coordinationService,
        GeminiDecisionService geminiService
    ) {
        this.zoneService = zoneService;
        this.coordinationService = coordinationService;
        this.geminiService = geminiService;
    }

    @GetMapping("/zones")
    public List<CityZone> listZones() {
        return zoneService.getAllZones();
    }

    @PostMapping("/agents/coordinate")
    public Map<String, Object> coordinateAgents() {
        return coordinationService.executeCoordinationCycle();
    }

    @PostMapping("/ai/chat")
    public Map<String, String> chat(@Valid @RequestBody AuthDtos.AiChatRequest request) {
        String snapshot = zoneService.getAllZones().toString();
        String answer = geminiService.queryGroundedAssistant(request.question(), snapshot);
        return Map.of("answer", answer);
    }
}
