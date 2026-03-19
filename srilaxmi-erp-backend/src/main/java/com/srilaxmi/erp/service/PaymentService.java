package com.srilaxmi.erp.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.srilaxmi.erp.repository.FollowUpRepository;
import com.srilaxmi.erp.entity.FollowUp;
import java.time.LocalDateTime;
import com.srilaxmi.erp.dto.OutstandingResponse;
import com.srilaxmi.erp.entity.Invoice;
import com.srilaxmi.erp.entity.Payment;
import com.srilaxmi.erp.entity.User;
import com.srilaxmi.erp.repository.InvoiceRepository;
import com.srilaxmi.erp.repository.PaymentRepository;
import com.srilaxmi.erp.repository.StaffRepository;
import com.srilaxmi.erp.repository.UserRepository;

@Service
public class PaymentService {

    @Autowired private PaymentRepository paymentRepository;
    @Autowired private InvoiceRepository invoiceRepository;
    @Autowired private StaffRepository staffRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private FollowUpRepository followUpRepository;

    public OutstandingResponse getOutstanding(Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new RuntimeException("Invoice not found"));
        BigDecimal total = invoice.getTotalAmount() != null ? invoice.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal paid = paymentRepository.findByInvoiceId(invoiceId).stream()
            .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new OutstandingResponse(invoiceId, total, paid, total.subtract(paid));
    }

    @Transactional
    public Payment savePayment(Payment payment) {
        if (payment.getInvoice() == null || payment.getInvoice().getId() == null)
            throw new IllegalArgumentException("Payment must have a valid invoice");
        if (payment.getAmount() == null || payment.getAmount().compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("Payment amount must be greater than zero");

        Invoice invoice = invoiceRepository.findById(payment.getInvoice().getId())
            .orElseThrow(() -> new RuntimeException("Invoice not found"));

        OutstandingResponse outstanding = getOutstanding(invoice.getId());
        if (payment.getAmount().compareTo(outstanding.getOutstandingAmount()) > 0)
            throw new RuntimeException("Payment amount exceeds outstanding balance");

        String method = payment.getPaymentMethod();
        boolean isOnline = method != null && (method.equals("UPI") || method.equals("NEFT")
            || method.equals("RTGS") || method.equals("BANK_TRANSFER"));
        boolean isCheque = "CHEQUE".equals(method);
        boolean isCash = !isOnline && !isCheque;

        // Set paymentChannel
        payment.setPaymentChannel(isCash ? "CASH" : "ONLINE");

        // Resolve receivedBy staff (for cash collected by staff)
        if (payment.getReceivedBy() != null && payment.getReceivedBy().getId() != null) {
            staffRepository.findById(payment.getReceivedBy().getId())
                .ifPresent(payment::setReceivedBy);
        } else {
            payment.setReceivedBy(null);
        }

        // Resolve receivedByUser (for online to admin's personal account)
        if (payment.getReceivedByUser() != null && payment.getReceivedByUser().getId() != null) {
            userRepository.findById(payment.getReceivedByUser().getId())
                .ifPresent(payment::setReceivedByUser);
        } else {
            payment.setReceivedByUser(null);
        }

        // Determine destination and verification status
        if (isCheque) {
            if (payment.getChequeDepositDate() == null)
                throw new IllegalArgumentException("Cheque deposit date is required for cheque payments");
            payment.setDestination("COMPANY_DIRECT");
            payment.setVerificationStatus("PENDING"); // Accounts must confirm deposit
            payment.setPaymentChannel("ONLINE");
        } else if (isCash && payment.getReceivedBy() != null) {
            payment.setDestination("STAFF_WALLET");
            payment.setVerificationStatus("CONFIRMED");
        } else if (isOnline && payment.getReceivedByUser() != null) {
            payment.setDestination("ADMIN_WALLET");
            payment.setVerificationStatus("PENDING"); // Admin must verify
        } else {
            // Cash at shop or online to company account directly
            payment.setDestination("COMPANY_DIRECT");
            payment.setVerificationStatus("CONFIRMED");
        }

        Payment saved = paymentRepository.save(payment);

        // Update invoice payment status
        BigDecimal newOutstanding = outstanding.getOutstandingAmount().subtract(payment.getAmount());
        LocalDate today = LocalDate.now();
        if (newOutstanding.compareTo(BigDecimal.ZERO) <= 0) {
            invoice.setPaymentStatus("PAID");
            // Auto-resolve any open follow-up for this invoice
            followUpRepository.findByInvoiceIdAndStatus(invoice.getId(), "OPEN").ifPresent(fu -> {
                fu.setStatus("RESOLVED");
                fu.setResolvedAt(LocalDateTime.now());
                fu.setClosingNote("Auto-resolved: invoice fully paid");
                followUpRepository.save(fu);
            });
        } else if (invoice.getDueDate() != null && today.isAfter(invoice.getDueDate())) {
            invoice.setPaymentStatus("OVERDUE");
        } else {
            invoice.setPaymentStatus("PARTIALLY_PAID");
        }
        invoiceRepository.save(invoice);
        return saved;
    }

    /** Admin verifies or rejects an online payment sent to their account */
    @Transactional
    public Payment updateVerificationStatus(Long paymentId, String status, String notes) {
        Payment p = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new RuntimeException("Payment not found"));
        p.setVerificationStatus(status);
        if (notes != null && !notes.isBlank()) p.setNotes(notes);
        return paymentRepository.save(p);
    }

    /** Accounts confirms cheque deposited or bounced */
    @Transactional
    public Payment updateChequeStatus(Long paymentId, String status, String notes) {
        Payment p = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new RuntimeException("Payment not found"));
        if (!"CHEQUE".equals(p.getPaymentMethod()))
            throw new IllegalArgumentException("Payment is not a cheque");
        p.setVerificationStatus(status); // DEPOSITED or BOUNCED
        if (notes != null && !notes.isBlank()) p.setNotes(notes);

        // If bounced, revert invoice payment status
        if ("BOUNCED".equals(status)) {
            Invoice invoice = p.getInvoice();
            OutstandingResponse outstanding = getOutstanding(invoice.getId());
            BigDecimal remaining = outstanding.getOutstandingAmount().add(p.getAmount());
            if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                invoice.setPaymentStatus("PARTIALLY_PAID");
                invoiceRepository.save(invoice);
            }
        }
        return paymentRepository.save(p);
    }

    public List<Payment> getPaymentsByInvoice(Long invoiceId) {
        return paymentRepository.findByInvoiceId(invoiceId);
    }

    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }

    /** Pending online payments for a specific admin user to verify */
    public List<Payment> getPendingVerificationsForUser(Long userId) {
        return paymentRepository.findByReceivedByUserIdAndVerificationStatusOrderByPaymentDateDesc(userId, "PENDING");
    }

    /** All pending cheques (for ACCOUNTS dashboard reminder) */
    public List<Payment> getPendingCheques() {
        return paymentRepository.findAllPendingCheques();
    }

    /** Cheques due today or overdue */
    public List<Payment> getChequesOverdue() {
        return paymentRepository.findChequesdueTodayOrBefore(LocalDate.now());
    }
}
