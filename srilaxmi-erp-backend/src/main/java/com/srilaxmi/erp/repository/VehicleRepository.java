package com.srilaxmi.erp.repository;

import com.srilaxmi.erp.entity.Vehicle;
import com.srilaxmi.erp.entity.VehicleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findByActiveTrue();
    List<Vehicle> findByStatusAndActiveTrue(VehicleStatus status);
}
