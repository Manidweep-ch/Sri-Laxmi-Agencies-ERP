package com.srilaxmi.erp.controller;

import com.srilaxmi.erp.entity.Delivery;
import com.srilaxmi.erp.service.DeliveryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/deliveries")
public class DeliveryController {

    @Autowired private DeliveryService deliveryService;

    @GetMapping
    public List<Delivery> getAll() { return deliveryService.getAll(); }

    @GetMapping("/{id}")
    public Delivery getById(@PathVariable Long id) { return deliveryService.getById(id); }

    @GetMapping("/by-sales-order/{soId}")
    public Map<String, Object> getBySalesOrder(@PathVariable Long soId) {
        return deliveryService.getBySalesOrderId(soId)
            .map(d -> Map.<String, Object>of("delivery", d))
            .orElse(Map.of());
    }

    // Deliveries for a specific driver (by staff id)
    @GetMapping("/driver/{staffId}")
    public List<Delivery> getByDriver(@PathVariable Long staffId) {
        return deliveryService.getByDriverStaffId(staffId);
    }

    @GetMapping("/driver/{staffId}/active")
    public List<Delivery> getActiveByDriver(@PathVariable Long staffId) {
        return deliveryService.getActiveByDriverStaffId(staffId);
    }

    @PostMapping
    public Delivery create(@RequestBody Delivery delivery) {
        return deliveryService.createOrUpdate(delivery);
    }

    @PutMapping("/{id}")
    public Delivery update(@PathVariable Long id, @RequestBody Delivery delivery) {
        delivery.setId(id);
        return deliveryService.createOrUpdate(delivery);
    }

    @PostMapping("/{id}/confirm")
    public Delivery confirm(@PathVariable Long id) {
        return deliveryService.confirm(id);
    }

    @PostMapping("/{id}/delivered")
    public Delivery markDelivered(@PathVariable Long id) {
        return deliveryService.markDelivered(id);
    }

    @PostMapping("/{id}/returned")
    public Delivery markReturned(@PathVariable Long id) {
        return deliveryService.markReturned(id);
    }

    @PostMapping("/{id}/vehicle-returned")
    public Delivery markVehicleReturned(@PathVariable Long id) {
        return deliveryService.markVehicleReturned(id);
    }

    @PostMapping("/{id}/cancelled")
    public Delivery markCancelled(@PathVariable Long id) {
        return deliveryService.markCancelled(id);
    }
}
