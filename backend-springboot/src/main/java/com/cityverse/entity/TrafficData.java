package com.cityverse.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "traffic_data")
public class TrafficData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "city_id", nullable = false)
    private Long cityId = 1L;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "zone_id", nullable = false)
    private CityZone zone;

    @Column(name = "corridor_name", nullable = false)
    private String corridorName;

    @Column(name = "vehicle_count", nullable = false)
    private Integer vehicleCount;

    @Column(name = "avg_speed_kmh", nullable = false)
    private Double avgSpeedKmh;

    @Column(name = "congestion_index", nullable = false)
    private Double congestionIndex;

    @Column(name = "congestion_level", nullable = false, length = 20)
    private String congestionLevel;

    @Column(name = "traffic_density", nullable = false, length = 32)
    private String trafficDensity = "MODERATE";

    @Column(name = "road_capacity", nullable = false)
    private Integer roadCapacity = 5000;

    @Column(name = "accident_count", nullable = false)
    private Integer accidentCount = 0;

    @Column(name = "weather_condition", nullable = false, length = 64)
    private String weatherCondition = "Clear";

    @Column(name = "suggested_reroute", nullable = false)
    private String suggestedReroute;

    @Column(name = "is_simulated", nullable = false)
    private Boolean isSimulated = false;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt = Instant.now();

    public Long getId() { return id; }
    public Long getCityId() { return cityId; }
    public void setCityId(Long cityId) { this.cityId = cityId; }
    public CityZone getZone() { return zone; }
    public void setZone(CityZone zone) { this.zone = zone; }
    public String getCorridorName() { return corridorName; }
    public void setCorridorName(String corridorName) { this.corridorName = corridorName; }
    public Integer getVehicleCount() { return vehicleCount; }
    public void setVehicleCount(Integer vehicleCount) { this.vehicleCount = vehicleCount; }
    public Double getAvgSpeedKmh() { return avgSpeedKmh; }
    public void setAvgSpeedKmh(Double avgSpeedKmh) { this.avgSpeedKmh = avgSpeedKmh; }
    public Double getCongestionIndex() { return congestionIndex; }
    public void setCongestionIndex(Double congestionIndex) { this.congestionIndex = congestionIndex; }
    public String getCongestionLevel() { return congestionLevel; }
    public void setCongestionLevel(String congestionLevel) { this.congestionLevel = congestionLevel; }
    public String getTrafficDensity() { return trafficDensity; }
    public void setTrafficDensity(String trafficDensity) { this.trafficDensity = trafficDensity; }
    public Integer getRoadCapacity() { return roadCapacity; }
    public void setRoadCapacity(Integer roadCapacity) { this.roadCapacity = roadCapacity; }
    public Integer getAccidentCount() { return accidentCount; }
    public void setAccidentCount(Integer accidentCount) { this.accidentCount = accidentCount; }
    public String getWeatherCondition() { return weatherCondition; }
    public void setWeatherCondition(String weatherCondition) { this.weatherCondition = weatherCondition; }
    public String getSuggestedReroute() { return suggestedReroute; }
    public void setSuggestedReroute(String suggestedReroute) { this.suggestedReroute = suggestedReroute; }
    public Boolean getIsSimulated() { return isSimulated; }
    public void setIsSimulated(Boolean isSimulated) { this.isSimulated = isSimulated; }
    public Instant getRecordedAt() { return recordedAt; }
    public void setRecordedAt(Instant recordedAt) { this.recordedAt = recordedAt; }
}
