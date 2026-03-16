package com.srilaxmi.erp.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.dto.InvoiceSummary;
import com.srilaxmi.erp.entity.Invoice;
import com.srilaxmi.erp.repository.CreditNoteRepository;
import com.srilaxmi.erp.repository.InvoiceRepository;
import com.srilaxmi.erp.repository.PaymentRepository;

@Service
public class InvoiceService {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private CreditNoteRepository creditNoteRepository;

    public Invoice saveInvoice(Invoice invoice){
        if (invoice == null) {
            throw new IllegalArgumentException("Invoice cannot be null");
        }
        // Auto-generate invoice number if not provided
        if (invoice.getInvoiceNumber() == null || invoice.getInvoiceNumber().isEmpty()) {
            invoice.setInvoiceNumber("INV-" + System.currentTimeMillis());
        }
        // Set default payment status if not provided
        if (invoice.getPaymentStatus() == null || invoice.getPaymentStatus().isEmpty()) {
            invoice.setPaymentStatus("PENDING");
        }
        return invoiceRepository.save(invoice);
    }

    public List<Invoice> getInvoices(){
        return invoiceRepository.findAll();
    }
    
    public Optional<Invoice> getInvoiceById(Long id){
        return invoiceRepository.findById(id);
    }
    
    public Invoice updatePaymentStatus(Long id, String paymentStatus){
        if (id == null) {
            throw new IllegalArgumentException("Invoice ID cannot be null");
        }
        if (paymentStatus == null || paymentStatus.isEmpty()) {
            throw new IllegalArgumentException("Payment status cannot be null or empty");
        }
        Optional<Invoice> invoiceOpt = invoiceRepository.findById(id);
        if (invoiceOpt.isPresent()) {
            Invoice invoice = invoiceOpt.get();
            invoice.setPaymentStatus(paymentStatus);
            return invoiceRepository.save(invoice);
        }
        throw new RuntimeException("Invoice not found");
    }

    public void deleteInvoice(Long id) {
        if (id == null) throw new IllegalArgumentException("Invoice ID cannot be null");
        com.srilaxmi.erp.entity.Invoice inv = invoiceRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Invoice not found"));
        inv.setActive(false);
        invoiceRepository.save(inv);
    }

    public List<InvoiceSummary> getInvoiceSummaries() {
        return invoiceRepository.findAll().stream()
            .filter(inv -> inv.isActive())
            .map(inv -> {
                InvoiceSummary s = new InvoiceSummary();
                s.setId(inv.getId());
                s.setInvoiceNumber(inv.getInvoiceNumber());
                s.setInvoiceDate(inv.getInvoiceDate() != null ? inv.getInvoiceDate().toString() : null);
                s.setDueDate(inv.getDueDate() != null ? inv.getDueDate().toString() : null);
                s.setCustomerName(inv.getCustomer() != null ? inv.getCustomer().getName() : null);
                s.setSupplierName(inv.getPurchaseOrder() != null && inv.getPurchaseOrder().getSupplier() != null
                    ? inv.getPurchaseOrder().getSupplier().getName() : null);
                BigDecimal total = inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO;
                BigDecimal paid = paymentRepository.sumByInvoiceId(inv.getId());
                BigDecimal credited = creditNoteRepository.sumByInvoiceId(inv.getId());
                s.setTotalAmount(total);
                s.setPaidAmount(paid);
                s.setDueAmount(total.subtract(paid).subtract(credited).max(BigDecimal.ZERO));
                s.setPaymentStatus(inv.getPaymentStatus());
                s.setInvoiceType(inv.getInvoiceType());
                s.setSalesOrderId(inv.getSalesOrder() != null ? inv.getSalesOrder().getId() : null);
                s.setPurchaseOrderId(inv.getPurchaseOrder() != null ? inv.getPurchaseOrder().getId() : null);
                return s;
            }).collect(Collectors.toList());
    }
}