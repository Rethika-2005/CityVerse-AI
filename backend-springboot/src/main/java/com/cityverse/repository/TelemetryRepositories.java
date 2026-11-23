package com.cityverse.repository;

import com.cityverse.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TelemetryRepositories {
    interface TrafficDataRepository extends JpaRepository<TrafficData, Long> {
        List<TrafficData> findTop50ByOrderByRecordedAtDesc();
    }
    interface EnvironmentalDataRepository extends JpaRepository<EnvironmentalData, Long> {
        List<EnvironmentalData> findTop50ByOrderByRecordedAtDesc();
    }
    interface EnergyDataRepository extends JpaRepository<EnergyData, Long> {
        List<EnergyData> findTop50ByOrderByRecordedAtDesc();
    }
    interface WaterDataRepository extends JpaRepository<WaterData, Long> {
        List<WaterData> findTop50ByOrderByRecordedAtDesc();
    }
    interface EmergencyIncidentRepository extends JpaRepository<EmergencyIncident, Long> {
        List<EmergencyIncident> findAllByOrderByIdDesc();
    }
    interface PredictionRepository extends JpaRepository<Prediction, Long> {
        List<Prediction> findByZoneIdAndDomainOrderByIdDesc(Long zoneId, String domain);
    }
}
