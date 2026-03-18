package com.srilaxmi.erp.controller;

import com.srilaxmi.erp.entity.PayrollRun;
import com.srilaxmi.erp.service.PayrollService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payroll")
public class PayrollController {

    @Autowired private PayrollService payrollService;

    // GET all payroll runs (history)
    @GetMapping
    public List<PayrollRun> getAll() {
        return payrollService.getAllRuns();
    }

    // GET single run with items
    @GetMapping("/{id}")
    public PayrollRun getOne(@PathVariable Long id) {
        return payrollService.getById(id);
    }

    // POST prepare a new draft for month/year
    @PostMapping("/prepare")
    public PayrollRun prepare(@RequestBody Map<String, Integer> body) {
        return payrollService.preparePayroll(body.get("month"), body.get("year"));
    }

    // PUT update draft items (adjust amounts, deductions, skip)
    @PutMapping("/{id}/items")
    public PayrollRun updateItems(@PathVariable Long id, @RequestBody List<Map<String, Object>> items) {
        return payrollService.updateDraft(id, items);
    }

    // POST confirm payroll — records all salary payments
    @PostMapping("/{id}/confirm")
    public PayrollRun confirm(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return payrollService.confirmPayroll(id, body.getOrDefault("paymentMethod", "BANK_TRANSFER"));
    }
}
