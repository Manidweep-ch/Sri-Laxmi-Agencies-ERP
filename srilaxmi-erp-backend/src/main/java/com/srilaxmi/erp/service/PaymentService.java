package com.srilaxmi.erp.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.dto.OutstandingResponse;
import com.srilaxmi.erp.entity.CreditNote;
import com.srilaxmi.erp.entity.Invoice;
import com.srilaxmi.erp.entity.Payment;
import com.srilaxmi.erp.repository.CreditNoteRepository;
import com.srilaxmi.erp.repository.InvoiceRepository;
import com.srilaxmi.erp.repository.PaymentRepository;

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;
    
    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private CreditNoteRepository creditNoteRepository;

    public OutstandingResponse getOutstanding(Long invoiceId){
        if (invoiceId == null) {
            throw new IllegalArgumentException("Invoice ID cannot be null");
        }

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));

        BigDecimal total = invoice.getTotalAmount() != null ? invoice.getTotalAmount() : BigDecimal.ZERO;

        List<Payment> payments = paymentRepository.findByInvoiceId(invoiceId);

        BigDecimal paid = payments.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<CreditNote> credits =
                creditNoteRepository.findByInvoiceId(invoiceId);

        BigDecimal creditAmount = credits.stream()
                .map(CreditNote::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal outstanding = total.subtract(paid).subtract(creditAmount);

        return new OutstandingResponse(
                invoiceId,
                total,
                paid,
                outstanding
        );
    }

    @org.springframework.transaction.annotation.Transactional
    public Payment savePayment(Payment payment){
        if (payment == null) {
            throw new IllegalArgumentException("Payment cannot be null");
        }
        if (payment.getInvoice() == null || payment.getInvoice().getId() == null) {
            throw new IllegalArgumentException("Payment must have a valid invoice");
        }
        if (payment.getAmount() == null || payment.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero");
        }
        
        Invoice invoice = invoiceRepository.findById(payment.getInvoice().getId())
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
        
        OutstandingResponse outstanding = getOutstanding(invoice.getId());
        
        if (payment.getAmount().compareTo(outstanding.getOutstandingAmount()) > 0) {
            throw new RuntimeException("Payment amount exceeds outstanding balance");
        }

        Payment saved = paymentRepository.save(payment);
        
        // Update Invoice Status based on outstanding and due date
        BigDecimal newOutstanding = outstanding.getOutstandingAmount().subtract(payment.getAmount());
        LocalDate today = LocalDate.now();
        
        if (newOutstanding.compareTo(BigDecimal.ZERO) <= 0) {
            invoice.setPaymentStatus("PAID");
        } else if (invoice.getDueDate() != null && today.isAfter(invoice.getDueDate())) {
            invoice.setPaymentStatus("OVERDUE");
        } else {
            invoice.setPaymentStatus("PARTIALLY_PAID");
        }
        invoiceRepository.save(invoice);
        
        return saved;
    }

    public List<Payment> getPaymentsByInvoice(Long invoiceId){
        return paymentRepository.findByInvoiceId(invoiceId);
    }
    
    public List<Payment> getAllPayments(){
        return paymentRepository.findAll();
    }
}