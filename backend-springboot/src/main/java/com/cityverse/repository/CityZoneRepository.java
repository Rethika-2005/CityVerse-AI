package com.cityverse.repository;

import com.cityverse.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CityZoneRepository extends JpaRepository<CityZone, Long> {
    Optional<CityZone> findByCode(String code);
    List<CityZone> findAllByOrderByCodeAsc();
}
