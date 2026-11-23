package com.cityverse.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "agent_activities")
public class AgentActivity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "agent_id", nullable = false)
    private AiAgent agent;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "zone_id")
    private CityZone zone;

    @Column(nullable = false, length = 20)
    private String severity;

    @Column(name = "detected_issue", nullable = false)
    private String detectedIssue;

    @Column(name = "analysis_summary", nullable = false, columnDefinition = "TEXT")
    private String analysisSummary;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String recommendation;

    @Column(name = "coordinated_batch_id", nullable = false, length = 64)
    private String coordinatedBatchId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public AiAgent getAgent() { return agent; }
    public void setAgent(AiAgent agent) { this.agent = agent; }
    public CityZone getZone() { return zone; }
    public void setZone(CityZone zone) { this.zone = zone; }
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
    public String getDetectedIssue() { return detectedIssue; }
    public void setDetectedIssue(String detectedIssue) { this.detectedIssue = detectedIssue; }
    public String getAnalysisSummary() { return analysisSummary; }
    public void setAnalysisSummary(String analysisSummary) { this.analysisSummary = analysisSummary; }
    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }
    public String getCoordinatedBatchId() { return coordinatedBatchId; }
    public void setCoordinatedBatchId(String coordinatedBatchId) { this.coordinatedBatchId = coordinatedBatchId; }
}
