package com.srilaxmi.erp.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.dto.InvoiceSummary;
import com.srilaxmi.erp.entity.Invoice;
import com.srilaxmi.erp.service.InvoiceService;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    @Autowired
    private InvoiceService invoiceService;

    @PostMapping
    public Invoice createInvoice(@RequestBody Invoice invoice){
        return invoiceService.saveInvoice(invoice);
    }

    @GetMapping
    public List<Invoice> getInvoices(){
        return invoiceService.getInvoices();
    }
    
    @GetMapping("/{id}")
    public Optional<Invoice> getInvoiceById(@PathVariable Long id){
        return invoiceService.getInvoiceById(id);
    }
    
    @PutMapping("/{id}/payment-status")
    public Invoice updatePaymentStatus(@PathVariable Long id, @RequestBody String paymentStatus){
        return invoiceService.updatePaymentStatus(id, paymentStatus);
    }

    @DeleteMapping("/{id}")
    public void deleteInvoice(@PathVariable Long id) {
        invoiceService.deleteInvoice(id);
    }

    @GetMapping("/summary")
    public List<InvoiceSummary> getInvoiceSummaries(){
        return invoiceService.getInvoiceSummaries();
    }
}