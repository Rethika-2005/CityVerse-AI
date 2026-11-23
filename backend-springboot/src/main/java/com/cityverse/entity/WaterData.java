package com.cityverse.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "water_data")
public class WaterData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "zone_id", nullable = false)
    private CityZone zone;

    @Column(name = "total_supply_ml", nullable = false)
    private Double totalSupplyMl = 50.0;

    @Column(name = "consumption_ml", nullable = false)
    private Double consumptionMl;

    @Column(name = "reservoir_pct", nullable = false)
    private Double reservoirPct;

    @Column(name = "water_quality_index", nullable = false)
    private Double waterQualityIndex = 90.0;

    @Column(name = "supply_pressure_bar", nullable = false)
    private Double supplyPressureBar;

    @Column(name = "leakage_pct", nullable = false)
    private Double leakagePct;

    @Column(name = "leakage_status", nullable = false, length = 32)
    private String leakageStatus = "NORMAL";

    @Column(name = "rainfall_mm", nullable = false)
    private Double rainfallMm = 0.0;

    @Column(name = "period_type", nullable = false, length = 20)
    private String periodType = "DAILY";

    @Column(name = "is_simulated", nullable = false)
    private Boolean isSimulated = false;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt = Instant.now();

    public Long getId() { return id; }
    public CityZone getZone() { return zone; }
    public void setZone(CityZone zone) { this.zone = zone; }
    public Double getTotalSupplyMl() { return totalSupplyMl; }
    public void setTotalSupplyMl(Double totalSupplyMl) { this.totalSupplyMl = totalSupplyMl; }
    public Double getConsumptionMl() { return consumptionMl; }
    public void setConsumptionMl(Double consumptionMl) { this.consumptionMl = consumptionMl; }
    public Double getReservoirPct() { return reservoirPct; }
    public void setReservoirPct(Double reservoirPct) { this.reservoirPct = reservoirPct; }
    public Double getWaterQualityIndex() { return waterQualityIndex; }
    public void setWaterQualityIndex(Double waterQualityIndex) { this.waterQualityIndex = waterQualityIndex; }
    public Double getSupplyPressureBar() { return supplyPressureBar; }
    public void setSupplyPressureBar(Double supplyPressureBar) { this.supplyPressureBar = supplyPressureBar; }
    public Double getLeakagePct() { return leakagePct; }
    public void setLeakagePct(Double leakagePct) { this.leakagePct = leakagePct; }
    public String getLeakageStatus() { return leakageStatus; }
    public void setLeakageStatus(String leakageStatus) { this.leakageStatus = leakageStatus; }
    public Double getRainfallMm() { return rainfallMm; }
    public void setRainfallMm(Double rainfallMm) { this.rainfallMm = rainfallMm; }
    public String getPeriodType() { return periodType; }
    public void setPeriodType(String periodType) { this.periodType = periodType; }
    public Boolean getIsSimulated() { return isSimulated; }
    public void setIsSimulated(Boolean isSimulated) { this.isSimulated = isSimulated; }
    public Instant getRecordedAt() { return recordedAt; }
    public void setRecordedAt(Instant recordedAt) { this.recordedAt = recordedAt; }
}
