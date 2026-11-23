package com.cityverse.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "ai_recommendations")
public class AiRecommendation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false, unique = true, length = 64)
    private String batchId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(name = "priority_actions_json", nullable = false, columnDefinition = "JSON")
    private String priorityActionsJson;

    @Column(name = "contributing_agents_json", nullable = false, columnDefinition = "JSON")
    private String contributingAgentsJson;

    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public String getBatchId() { return batchId; }
    public void setBatchId(String batchId) { this.batchId = batchId; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getPriorityActionsJson() { return priorityActionsJson; }
    public void setPriorityActionsJson(String priorityActionsJson) { this.priorityActionsJson = priorityActionsJson; }
    public String getContributingAgentsJson() { return contributingAgentsJson; }
    public void setContributingAgentsJson(String contributingAgentsJson) { this.contributingAgentsJson = contributingAgentsJson; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
