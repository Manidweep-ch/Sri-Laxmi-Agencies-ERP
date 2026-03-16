package com.srilaxmi.erp.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.srilaxmi.erp.entity.CreditNote;
import com.srilaxmi.erp.entity.Invoice;
import com.srilaxmi.erp.repository.CreditNoteRepository;
import com.srilaxmi.erp.repository.InvoiceRepository;

@Service
public class CreditNoteService {

    @Autowired
    private CreditNoteRepository creditNoteRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private PaymentService paymentService;

    @Transactional
    public CreditNote saveCredit(CreditNote creditNote) {
        return createCreditNote(creditNote);
    }

    @Transactional
    public CreditNote createCreditNote(CreditNote creditNote) {
        if (creditNote == null) {
            throw new IllegalArgumentException("Credit Note cannot be null");
        }
        if (creditNote.getInvoice() == null || creditNote.getInvoice().getId() == null) {
            throw new IllegalArgumentException("Credit Note must have a valid invoice");
        }
        if (creditNote.getAmount() == null || creditNote.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Credit Note amount must be greater than zero");
        }

        @SuppressWarnings("null")
		Invoice invoice = invoiceRepository.findById(creditNote.getInvoice().getId())
                .orElseThrow(() -> new RuntimeException("Invoice not found"));

        // Validate credit note amount doesn't exceed outstanding
        var outstanding = paymentService.getOutstanding(invoice.getId());
        if (creditNote.getAmount().compareTo(outstanding.getOutstandingAmount()) > 0) {
            throw new RuntimeException("Credit Note amount exceeds outstanding balance");
        }

        // Auto-generate credit note number if not provided
        if (creditNote.getCreditNoteNumber() == null || creditNote.getCreditNoteNumber().isEmpty()) {
            creditNote.setCreditNoteNumber("CN-" + System.currentTimeMillis());
        }

        // Set date if not provided
        if (creditNote.getDate() == null) {
            creditNote.setDate(LocalDate.now());
        }

        CreditNote saved = creditNoteRepository.save(creditNote);

        // Update invoice payment status
        BigDecimal newOutstanding = outstanding.getOutstandingAmount().subtract(creditNote.getAmount());
        if (newOutstanding.compareTo(BigDecimal.ZERO) <= 0) {
            invoice.setPaymentStatus("PAID");
        } else if (invoice.getDueDate() != null && LocalDate.now().isAfter(invoice.getDueDate())) {
            invoice.setPaymentStatus("OVERDUE");
        } else {
            invoice.setPaymentStatus("PARTIALLY_PAID");
        }
        invoiceRepository.save(invoice);

        return saved;
    }

    public List<CreditNote> getCreditNotesByInvoice(Long invoiceId) {
        return creditNoteRepository.findByInvoiceId(invoiceId);
    }

    public List<CreditNote> getAllCreditNotes() {
        return creditNoteRepository.findAll();
    }
}
