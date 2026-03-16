package com.srilaxmi.erp.controller;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.entity.SupplierPayment;
import com.srilaxmi.erp.service.SupplierPaymentService;

@RestController
@RequestMapping("/api/purchase-orders/{poId}/payments")
public class SupplierPaymentController {

    @Autowired private SupplierPaymentService supplierPaymentService;

    @PostMapping
    public SupplierPayment recordPayment(@PathVariable Long poId, @RequestBody SupplierPayment payment) {
        return supplierPaymentService.recordPayment(poId, payment);
    }

    @GetMapping
    public List<SupplierPayment> getPayments(@PathVariable Long poId) {
        return supplierPaymentService.getPaymentsByPO(poId);
    }

    @GetMapping("/total-paid")
    public BigDecimal getTotalPaid(@PathVariable Long poId) {
        return supplierPaymentService.getTotalPaid(poId);
    }
}
