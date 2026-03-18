package com.srilaxmi.erp.controller;

import com.srilaxmi.erp.entity.SalaryPayment;
import com.srilaxmi.erp.entity.Staff;
import com.srilaxmi.erp.service.StaffService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/staff")
public class StaffController {

    @Autowired private StaffService staffService;

    @GetMapping
    public List<Staff> getAll() {
        return staffService.getAllStaff();
    }

    @GetMapping("/drivers")
    public List<Staff> getDrivers() {
        return staffService.getDrivers();
    }

    @GetMapping("/owner-defaults")
    public Map<String, String> getOwnerDefaults() {
        return staffService.getOwnerDefaults();
    }

    @GetMapping("/admins")
    public List<Staff> getAdminStaff() {
        return staffService.getOwnerAdminStaff();
    }

    @DeleteMapping("/{id}")
    public void deleteStaff(@PathVariable Long id) {
        staffService.deleteStaff(id);
    }

    @GetMapping("/{id}")
    public Staff getOne(@PathVariable Long id) {
        return staffService.getById(id);
    }

    @PostMapping
    public Staff create(@RequestBody Staff staff) {
        return staffService.createStaff(staff);
    }

    @PutMapping("/{id}")
    public Staff update(@PathVariable Long id, @RequestBody Staff staff) {
        return staffService.updateStaff(id, staff);
    }

    @PutMapping("/{id}/active")
    public Staff setActive(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        return staffService.setActive(id, body.get("active"));
    }

    // ── Salary endpoints ──────────────────────────────────────────────────────

    @PostMapping("/{id}/salary")
    public SalaryPayment paySalary(@PathVariable Long id, @RequestBody SalaryPayment payment) {
        return staffService.paySalary(id, payment);
    }

    @GetMapping("/{id}/salary")
    public List<SalaryPayment> getSalaryHistory(@PathVariable Long id) {
        return staffService.getSalaryHistory(id);
    }

    @GetMapping("/{id}/salary/summary")
    public Map<String, Object> getSalarySummary(@PathVariable Long id) {
        return staffService.getSalarySummary(id);
    }
}
