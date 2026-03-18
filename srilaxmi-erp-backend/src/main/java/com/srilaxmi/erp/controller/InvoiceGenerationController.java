package com.srilaxmi.erp.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.entity.Invoice;
import com.srilaxmi.erp.service.InvoiceGenerationService;

@RestController
@RequestMapping("/api/invoice-generation")
public class InvoiceGenerationController {

    @Autowired
    private InvoiceGenerationService invoiceGenerationService;

    @PostMapping("/{salesOrderId}")
    public Invoice generateInvoice(@PathVariable Long salesOrderId) {

        return invoiceGenerationService.generateInvoice(salesOrderId);

    }
}