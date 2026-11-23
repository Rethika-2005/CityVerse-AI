package com.cityverse.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "infrastructure")
public class Infrastructure {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "zone_id", nullable = false)
    private CityZone zone;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(name = "asset_type", nullable = false, length = 30)
    private String assetType;

    @Column(nullable = false, length = 20)
    private String status = "OPERATIONAL";

    @Column(name = "capacity_pct", nullable = false)
    private Double capacityPct = 100.0;

    @Column(name = "load_pct", nullable = false)
    private Double loadPct = 50.0;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "last_inspected_at", nullable = false)
    private Instant lastInspectedAt = Instant.now();

    public Long getId() { return id; }
    public CityZone getZone() { return zone; }
    public void setZone(CityZone zone) { this.zone = zone; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAssetType() { return assetType; }
    public void setAssetType(String assetType) { this.assetType = assetType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Double getCapacityPct() { return capacityPct; }
    public void setCapacityPct(Double capacityPct) { this.capacityPct = capacityPct; }
    public Double getLoadPct() { return loadPct; }
    public void setLoadPct(Double loadPct) { this.loadPct = loadPct; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
}
