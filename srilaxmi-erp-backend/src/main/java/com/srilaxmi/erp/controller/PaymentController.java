package com.srilaxmi.erp.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.dto.OutstandingResponse;
import com.srilaxmi.erp.entity.Payment;
import com.srilaxmi.erp.service.PaymentService;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired private PaymentService paymentService;

    @PostMapping
    public Map<String, Object> createPayment(@RequestBody Payment payment) {
        return toDto(paymentService.savePayment(payment));
    }

    @GetMapping("/invoice/{invoiceId}")
    public List<Map<String, Object>> getPayments(@PathVariable Long invoiceId) {
        return paymentService.getPaymentsByInvoice(invoiceId).stream().map(this::toDto).toList();
    }

    @GetMapping("/invoice/{invoiceId}/outstanding")
    public OutstandingResponse getOutstanding(@PathVariable Long invoiceId) {
        return paymentService.getOutstanding(invoiceId);
    }

    @GetMapping
    public List<Map<String, Object>> getAllPayments() {
        return paymentService.getAllPayments().stream().map(this::toDto).toList();
    }

    /** Admin verifies or rejects a payment sent to their account */
    @PutMapping("/{id}/verify")
    public Map<String, Object> verifyPayment(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "VERIFIED");
        String notes = body.get("notes");
        return toDto(paymentService.updateVerificationStatus(id, status, notes));
    }

    /** Accounts updates cheque status (DEPOSITED / BOUNCED) */
    @PutMapping("/{id}/cheque-status")
    public Map<String, Object> updateChequeStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "DEPOSITED");
        String notes = body.get("notes");
        return toDto(paymentService.updateChequeStatus(id, status, notes));
    }

    /** Pending online payments for a specific admin user to verify */
    @GetMapping("/pending-verification/user/{userId}")
    public List<Map<String, Object>> getPendingForUser(@PathVariable Long userId) {
        return paymentService.getPendingVerificationsForUser(userId).stream().map(this::toDto).toList();
    }

    /** All pending cheques — for ACCOUNTS dashboard */
    @GetMapping("/cheques/pending")
    public List<Map<String, Object>> getPendingCheques() {
        return paymentService.getPendingCheques().stream().map(this::toDto).toList();
    }

    /** Cheques due today or overdue */
    @GetMapping("/cheques/overdue")
    public List<Map<String, Object>> getOverdueCheques() {
        return paymentService.getChequesOverdue().stream().map(this::toDto).toList();
    }

    private Map<String, Object> toDto(Payment p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.getId());
        m.put("amount", p.getAmount());
        m.put("paymentDate", p.getPaymentDate());
        m.put("paymentMethod", p.getPaymentMethod());
        m.put("paymentChannel", p.getPaymentChannel());
        m.put("destination", p.getDestination());
        m.put("verificationStatus", p.getVerificationStatus());
        m.put("chequeDepositDate", p.getChequeDepositDate());
        m.put("notes", p.getNotes());
        if (p.getInvoice() != null) {
            Map<String, Object> inv = new HashMap<>();
            inv.put("id", p.getInvoice().getId());
            inv.put("invoiceNumber", p.getInvoice().getInvoiceNumber());
            if (p.getInvoice().getSalesOrder() != null && p.getInvoice().getSalesOrder().getCustomer() != null)
                inv.put("customerName", p.getInvoice().getSalesOrder().getCustomer().getName());
            m.put("invoice", inv);
        }
        if (p.getReceivedBy() != null) {
            Map<String, Object> staff = new HashMap<>();
            staff.put("id", p.getReceivedBy().getId());
            staff.put("name", p.getReceivedBy().getName());
            staff.put("employeeId", p.getReceivedBy().getEmployeeId());
            m.put("receivedBy", staff);
        }
        if (p.getReceivedByUser() != null) {
            Map<String, Object> user = new HashMap<>();
            user.put("id", p.getReceivedByUser().getId());
            user.put("username", p.getReceivedByUser().getUsername());
            m.put("receivedByUser", user);
        }
        return m;
    }
}
