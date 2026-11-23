package com.cityverse.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "environmental_data")
public class EnvironmentalData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "zone_id", nullable = false)
    private CityZone zone;

    @Column(nullable = false)
    private Integer aqi;

    @Column(nullable = false)
    private Double pm25;

    @Column(nullable = false)
    private Double pm10 = 35.0;

    @Column(name = "water_quality_index", nullable = false)
    private Double waterQualityIndex;

    @Column(name = "noise_db", nullable = false)
    private Double noiseDb;

    @Column(name = "co2_level", nullable = false)
    private Double co2Level = 410.0;

    @Column(name = "temperature_c", nullable = false)
    private Double temperatureC;

    @Column(name = "humidity_pct", nullable = false)
    private Integer humidityPct;

    @Column(name = "pollution_level", nullable = false, length = 20)
    private String pollutionLevel;

    @Column(name = "is_simulated", nullable = false)
    private Boolean isSimulated = false;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt = Instant.now();

    public Long getId() { return id; }
    public CityZone getZone() { return zone; }
    public void setZone(CityZone zone) { this.zone = zone; }
    public Integer getAqi() { return aqi; }
    public void setAqi(Integer aqi) { this.aqi = aqi; }
    public Double getPm25() { return pm25; }
    public void setPm25(Double pm25) { this.pm25 = pm25; }
    public Double getPm10() { return pm10; }
    public void setPm10(Double pm10) { this.pm10 = pm10; }
    public Double getWaterQualityIndex() { return waterQualityIndex; }
    public void setWaterQualityIndex(Double waterQualityIndex) { this.waterQualityIndex = waterQualityIndex; }
    public Double getNoiseDb() { return noiseDb; }
    public void setNoiseDb(Double noiseDb) { this.noiseDb = noiseDb; }
    public Double getCo2Level() { return co2Level; }
    public void setCo2Level(Double co2Level) { this.co2Level = co2Level; }
    public Double getTemperatureC() { return temperatureC; }
    public void setTemperatureC(Double temperatureC) { this.temperatureC = temperatureC; }
    public Integer getHumidityPct() { return humidityPct; }
    public void setHumidityPct(Integer humidityPct) { this.humidityPct = humidityPct; }
    public String getPollutionLevel() { return pollutionLevel; }
    public void setPollutionLevel(String pollutionLevel) { this.pollutionLevel = pollutionLevel; }
    public Boolean getIsSimulated() { return isSimulated; }
    public void setIsSimulated(Boolean isSimulated) { this.isSimulated = isSimulated; }
    public Instant getRecordedAt() { return recordedAt; }
    public void setRecordedAt(Instant recordedAt) { this.recordedAt = recordedAt; }
}
