package com.cityverse.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "predictions")
public class Prediction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "zone_id", nullable = false)
    private CityZone zone;

    @Column(nullable = false, length = 30)
    private String domain;

    @Column(name = "model_type", nullable = false, length = 64)
    private String modelType = "LINEAR_TREND_SIMULATED";

    @Column(name = "horizon_hours", nullable = false)
    private Integer horizonHours = 24;

    @Column(name = "current_value", nullable = false)
    private Double currentValue;

    @Column(name = "predicted_value", nullable = false)
    private Double predictedValue;

    @Column(nullable = false, length = 32)
    private String unit;

    @Column(name = "risk_level", nullable = false, length = 20)
    private String riskLevel;

    @Column(name = "confidence_pct", nullable = false)
    private Double confidencePct;

    @Column(name = "is_simulated", nullable = false)
    private Boolean isSimulated = true;

    @Column(name = "forecast_series_json", nullable = false, columnDefinition = "JSON")
    private String forecastSeriesJson;

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt = Instant.now();

    public Long getId() { return id; }
    public CityZone getZone() { return zone; }
    public void setZone(CityZone zone) { this.zone = zone; }
    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }
    public String getModelType() { return modelType; }
    public void setModelType(String modelType) { this.modelType = modelType; }
    public Integer getHorizonHours() { return horizonHours; }
    public void setHorizonHours(Integer horizonHours) { this.horizonHours = horizonHours; }
    public Double getCurrentValue() { return currentValue; }
    public void setCurrentValue(Double currentValue) { this.currentValue = currentValue; }
    public Double getPredictedValue() { return predictedValue; }
    public void setPredictedValue(Double predictedValue) { this.predictedValue = predictedValue; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
    public Double getConfidencePct() { return confidencePct; }
    public void setConfidencePct(Double confidencePct) { this.confidencePct = confidencePct; }
    public Boolean getIsSimulated() { return isSimulated; }
    public void setIsSimulated(Boolean isSimulated) { this.isSimulated = isSimulated; }
    public String getForecastSeriesJson() { return forecastSeriesJson; }
    public void setForecastSeriesJson(String forecastSeriesJson) { this.forecastSeriesJson = forecastSeriesJson; }
}
