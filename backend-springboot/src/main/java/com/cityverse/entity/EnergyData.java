package com.cityverse.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "energy_data")
public class EnergyData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "zone_id", nullable = false)
    private CityZone zone;

    @Column(name = "consumption_mwh", nullable = false)
    private Double consumptionMwh;

    @Column(name = "renewable_energy_mwh", nullable = false)
    private Double renewableEnergyMwh = 0.0;

    @Column(name = "non_renewable_energy_mwh", nullable = false)
    private Double nonRenewableEnergyMwh = 0.0;

    @Column(name = "renewable_pct", nullable = false)
    private Double renewablePct;

    @Column(name = "peak_demand_mw", nullable = false)
    private Double peakDemandMw;

    @Column(name = "grid_load_pct", nullable = false)
    private Double gridLoadPct;

    @Column(name = "street_light_count", nullable = false)
    private Integer streetLightCount = 1500;

    @Column(name = "active_street_lights", nullable = false)
    private Integer activeStreetLights = 1450;

    @Column(name = "power_outages", nullable = false)
    private Integer powerOutages = 0;

    @Column(name = "period_type", nullable = false, length = 20)
    private String periodType = "DAILY";

    @Column(name = "is_simulated", nullable = false)
    private Boolean isSimulated = false;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt = Instant.now();

    public Long getId() { return id; }
    public CityZone getZone() { return zone; }
    public void setZone(CityZone zone) { this.zone = zone; }
    public Double getConsumptionMwh() { return consumptionMwh; }
    public void setConsumptionMwh(Double consumptionMwh) { this.consumptionMwh = consumptionMwh; }
    public Double getRenewableEnergyMwh() { return renewableEnergyMwh; }
    public void setRenewableEnergyMwh(Double renewableEnergyMwh) { this.renewableEnergyMwh = renewableEnergyMwh; }
    public Double getNonRenewableEnergyMwh() { return nonRenewableEnergyMwh; }
    public void setNonRenewableEnergyMwh(Double nonRenewableEnergyMwh) { this.nonRenewableEnergyMwh = nonRenewableEnergyMwh; }
    public Double getRenewablePct() { return renewablePct; }
    public void setRenewablePct(Double renewablePct) { this.renewablePct = renewablePct; }
    public Double getPeakDemandMw() { return peakDemandMw; }
    public void setPeakDemandMw(Double peakDemandMw) { this.peakDemandMw = peakDemandMw; }
    public Double getGridLoadPct() { return gridLoadPct; }
    public void setGridLoadPct(Double gridLoadPct) { this.gridLoadPct = gridLoadPct; }
    public Integer getStreetLightCount() { return streetLightCount; }
    public void setStreetLightCount(Integer streetLightCount) { this.streetLightCount = streetLightCount; }
    public Integer getActiveStreetLights() { return activeStreetLights; }
    public void setActiveStreetLights(Integer activeStreetLights) { this.activeStreetLights = activeStreetLights; }
    public Integer getPowerOutages() { return powerOutages; }
    public void setPowerOutages(Integer powerOutages) { this.powerOutages = powerOutages; }
    public String getPeriodType() { return periodType; }
    public void setPeriodType(String periodType) { this.periodType = periodType; }
    public Boolean getIsSimulated() { return isSimulated; }
    public void setIsSimulated(Boolean isSimulated) { this.isSimulated = isSimulated; }
    public Instant getRecordedAt() { return recordedAt; }
    public void setRecordedAt(Instant recordedAt) { this.recordedAt = recordedAt; }
}
