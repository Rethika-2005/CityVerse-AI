package com.cityverse.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "city_zones")
public class CityZone {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "city_id")
    private City city;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "area_name", nullable = false, length = 160)
    private String areaName = "";

    @Column(name = "zone_type", nullable = false, length = 30)
    private String zoneType;

    @Column(nullable = false)
    private Integer population;

    @Column(name = "area_sq_km", nullable = false)
    private Double areaSqKm;

    @Column(nullable = false)
    private Double latitude = 13.0827;

    @Column(nullable = false)
    private Double longitude = 80.2707;

    @Column(name = "infrastructure_details", columnDefinition = "TEXT")
    private String infrastructureDetails;

    @Column(name = "health_score", nullable = false)
    private Double healthScore = 85.0;

    @Column(name = "grid_x", nullable = false)
    private Integer gridX = 0;

    @Column(name = "grid_y", nullable = false)
    private Integer gridY = 0;

    @Column(nullable = false, length = 20)
    private String status = "OPTIMAL";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void preUpdate() { this.updatedAt = Instant.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public City getCity() { return city; }
    public void setCity(City city) { this.city = city; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAreaName() { return areaName; }
    public void setAreaName(String areaName) { this.areaName = areaName; }
    public String getZoneType() { return zoneType; }
    public void setZoneType(String zoneType) { this.zoneType = zoneType; }
    public Integer getPopulation() { return population; }
    public void setPopulation(Integer population) { this.population = population; }
    public Double getAreaSqKm() { return areaSqKm; }
    public void setAreaSqKm(Double areaSqKm) { this.areaSqKm = areaSqKm; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public String getInfrastructureDetails() { return infrastructureDetails; }
    public void setInfrastructureDetails(String infrastructureDetails) { this.infrastructureDetails = infrastructureDetails; }
    public Double getHealthScore() { return healthScore; }
    public void setHealthScore(Double healthScore) { this.healthScore = healthScore; }
    public Integer getGridX() { return gridX; }
    public void setGridX(Integer gridX) { this.gridX = gridX; }
    public Integer getGridY() { return gridY; }
    public void setGridY(Integer gridY) { this.gridY = gridY; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
