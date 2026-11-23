package com.cityverse.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Service
public class GeminiDecisionService {

    @Value("${cityverse.gemini.api-key}")
    private String apiKey;

    @Value("${cityverse.gemini.model:gemini-4-hydrogen}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();

    public String queryGroundedAssistant(String question, String liveCitySnapshotJson) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("GEMINI_API_KEY is not configured on the Spring Boot server.");
        }

        String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
        String systemPrompt = "You are CityVerse AI Decision Support. Ground every answer strictly in the LIVE DATABASE SNAPSHOT below and never invent live city metrics.\n\n" + liveCitySnapshotJson;

        Map<String, Object> payload = Map.of(
            "systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
            "contents", List.of(Map.of("parts", List.of(Map.of("text", question))))
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        ResponseEntity<Map> response = restTemplate.exchange(endpoint, HttpMethod.POST, entity, Map.class);
        Map body = response.getBody();
        if (body == null || !body.containsKey("candidates")) {
            throw new IllegalStateException("Empty response from Gemini API.");
        }
        List candidates = (List) body.get("candidates");
        Map first = (Map) candidates.get(0);
        Map content = (Map) first.get("content");
        List parts = (List) content.get("parts");
        return String.valueOf(((Map) parts.get(0)).get("text"));
    }
}
