package com.srilaxmi.erp.service;

import com.srilaxmi.erp.entity.Vehicle;
import com.srilaxmi.erp.entity.VehicleStatus;
import com.srilaxmi.erp.repository.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class VehicleService {

    @Autowired private VehicleRepository vehicleRepository;

    public List<Vehicle> getAll() {
        return vehicleRepository.findByActiveTrue();
    }

    public List<Vehicle> getAvailable() {
        return vehicleRepository.findByStatusAndActiveTrue(VehicleStatus.AVAILABLE);
    }

    public Vehicle getById(Long id) {
        return vehicleRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Vehicle not found: " + id));
    }

    public Vehicle save(Vehicle vehicle) {
        return vehicleRepository.save(vehicle);
    }

    public Vehicle updateStatus(Long id, VehicleStatus status) {
        Vehicle v = getById(id);
        v.setStatus(status);
        return vehicleRepository.save(v);
    }

    public void delete(Long id) {
        Vehicle v = getById(id);
        v.setActive(false);
        vehicleRepository.save(v);
    }
}
