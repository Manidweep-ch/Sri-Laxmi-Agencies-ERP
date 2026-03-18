package com.srilaxmi.erp.controller;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.entity.SalesReturnRefund;
import com.srilaxmi.erp.service.SalesReturnRefundService;

@RestController
@RequestMapping("/api/sales-returns/{returnId}/refunds")
public class SalesReturnRefundController {

    @Autowired private SalesReturnRefundService refundService;

    @PostMapping
    public SalesReturnRefund recordRefund(@PathVariable Long returnId, @RequestBody SalesReturnRefund refund) {
        return refundService.recordRefund(returnId, refund);
    }

    @GetMapping
    public List<SalesReturnRefund> getRefunds(@PathVariable Long returnId) {
        return refundService.getRefundsByReturn(returnId);
    }

    @GetMapping("/total-refunded")
    public BigDecimal getTotalRefunded(@PathVariable Long returnId) {
        return refundService.getTotalRefunded(returnId);
    }
}
