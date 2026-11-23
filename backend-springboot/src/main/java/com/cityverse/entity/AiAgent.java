package com.cityverse.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "ai_agents")
public class AiAgent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agent_key", nullable = false, unique = true, length = 64)
    private String agentKey;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 120)
    private String domain;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "last_run_at", nullable = false)
    private Instant lastRunAt = Instant.now();

    @Column(name = "findings_count", nullable = false)
    private Integer findingsCount = 0;

    @Column(name = "confidence_score", nullable = false)
    private Double confidenceScore = 0.92;

    public Long getId() { return id; }
    public String getAgentKey() { return agentKey; }
    public void setAgentKey(String agentKey) { this.agentKey = agentKey; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getLastRunAt() { return lastRunAt; }
    public void setLastRunAt(Instant lastRunAt) { this.lastRunAt = lastRunAt; }
    public Integer getFindingsCount() { return findingsCount; }
    public void setFindingsCount(Integer findingsCount) { this.findingsCount = findingsCount; }
    public Double getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(Double confidenceScore) { this.confidenceScore = confidenceScore; }
}
