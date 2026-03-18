package com.srilaxmi.erp.controller;

import com.srilaxmi.erp.entity.Vehicle;
import com.srilaxmi.erp.entity.VehicleStatus;
import com.srilaxmi.erp.service.VehicleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    @Autowired private VehicleService vehicleService;

    @GetMapping
    public List<Vehicle> getAll() { return vehicleService.getAll(); }

    @GetMapping("/available")
    public List<Vehicle> getAvailable() { return vehicleService.getAvailable(); }

    @GetMapping("/{id}")
    public Vehicle getById(@PathVariable Long id) { return vehicleService.getById(id); }

    @PostMapping
    public Vehicle create(@RequestBody Vehicle vehicle) { return vehicleService.save(vehicle); }

    @PutMapping("/{id}")
    public Vehicle update(@PathVariable Long id, @RequestBody Vehicle vehicle) {
        vehicle.setId(id);
        return vehicleService.save(vehicle);
    }

    @PutMapping("/{id}/status")
    public Vehicle updateStatus(@PathVariable Long id, @RequestBody VehicleStatus status) {
        return vehicleService.updateStatus(id, status);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { vehicleService.delete(id); }
}
