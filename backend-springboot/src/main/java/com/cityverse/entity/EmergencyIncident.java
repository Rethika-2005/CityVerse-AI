package com.cityverse.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "emergency_incidents")
public class EmergencyIncident {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "zone_id", nullable = false)
    private CityZone zone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by_user_id")
    private User reportedBy;

    @Column(name = "reported_by_name", length = 120)
    private String reportedByName;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, length = 40)
    private String category;

    @Column(nullable = false, length = 20)
    private String priority;

    @Column(nullable = false, length = 20)
    private String status = "OPEN";

    @Column(name = "location_detail", nullable = false)
    private String locationDetail;

    @Column(nullable = false)
    private Double latitude = 13.0827;

    @Column(nullable = false)
    private Double longitude = 80.2707;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "response_recommendation", nullable = false, columnDefinition = "TEXT")
    private String responseRecommendation;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void preUpdate() { this.updatedAt = Instant.now(); }

    public Long getId() { return id; }
    public CityZone getZone() { return zone; }
    public void setZone(CityZone zone) { this.zone = zone; }
    public User getReportedBy() { return reportedBy; }
    public void setReportedBy(User reportedBy) { this.reportedBy = reportedBy; }
    public String getReportedByName() { return reportedByName; }
    public void setReportedByName(String reportedByName) { this.reportedByName = reportedByName; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getLocationDetail() { return locationDetail; }
    public void setLocationDetail(String locationDetail) { this.locationDetail = locationDetail; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getResponseRecommendation() { return responseRecommendation; }
    public void setResponseRecommendation(String responseRecommendation) { this.responseRecommendation = responseRecommendation; }
}
