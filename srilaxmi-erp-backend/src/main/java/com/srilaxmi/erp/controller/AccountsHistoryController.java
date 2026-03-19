package com.srilaxmi.erp.controller;

import com.srilaxmi.erp.entity.CashDeposit;
import com.srilaxmi.erp.entity.SalaryPayment;
import com.srilaxmi.erp.entity.SupplierPayment;
import com.srilaxmi.erp.repository.CashDepositRepository;
import com.srilaxmi.erp.repository.PaymentRepository;
import com.srilaxmi.erp.repository.SalaryPaymentRepository;
import com.srilaxmi.erp.repository.SalesReturnRefundRepository;
import com.srilaxmi.erp.repository.SupplierPaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

/**
 * Read-only history endpoints for the Accounts department.
 * Provides all supplier payments and all salary payments in one place.
 */
@RestController
public class AccountsHistoryController {

    @Autowired private SupplierPaymentRepository supplierPaymentRepository;
    @Autowired private SalaryPaymentRepository salaryPaymentRepository;
    @Autowired private CashDepositRepository cashDepositRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private SalesReturnRefundRepository salesReturnRefundRepository;

    /** All supplier payments across all POs — for accounts history */
    @GetMapping("/api/supplier-payments")
    public List<Map<String, Object>> getAllSupplierPayments() {
        List<Map<String, Object>> result = new ArrayList<>();
        supplierPaymentRepository.findAll().forEach(sp -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", sp.getId());
            m.put("amount", sp.getAmount());
            m.put("paymentDate", sp.getPaymentDate());
            m.put("paymentMethod", sp.getPaymentMethod());
            m.put("notes", sp.getNotes());
            if (sp.getPurchaseOrder() != null) {
                m.put("poNumber", sp.getPurchaseOrder().getPoNumber());
                m.put("poId", sp.getPurchaseOrder().getId());
                if (sp.getPurchaseOrder().getSupplier() != null) {
                    m.put("supplierName", sp.getPurchaseOrder().getSupplier().getName());
                    m.put("supplierId", sp.getPurchaseOrder().getSupplier().getId());
                }
            }
            result.add(m);
        });
        result.sort((a, b) -> {
            Object da = a.get("paymentDate"), db = b.get("paymentDate");
            if (da == null && db == null) return 0;
            if (da == null) return 1;
            if (db == null) return -1;
            return db.toString().compareTo(da.toString());
        });
        return result;
    }

    /** All salary payments across all staff — for accounts history */
    @GetMapping("/api/salary-payments")
    public List<Map<String, Object>> getAllSalaryPayments() {
        List<Map<String, Object>> result = new ArrayList<>();
        salaryPaymentRepository.findAll().forEach(sp -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", sp.getId());
            m.put("amount", sp.getAmount());
            m.put("paymentDate", sp.getPaymentDate());
            m.put("paymentMethod", sp.getPaymentMethod());
            m.put("month", sp.getMonth());
            m.put("year", sp.getYear());
            m.put("notes", sp.getNotes());
            if (sp.getStaff() != null) {
                m.put("staffName", sp.getStaff().getName());
                m.put("staffId", sp.getStaff().getId());
                m.put("employeeId", sp.getStaff().getEmployeeId());
                m.put("designation", sp.getStaff().getDesignation());
            }
            result.add(m);
        });
        result.sort((a, b) -> {
            int ya = a.get("year") != null ? (int) a.get("year") : 0;
            int yb = b.get("year") != null ? (int) b.get("year") : 0;
            int ma = a.get("month") != null ? (int) a.get("month") : 0;
            int mb = b.get("month") != null ? (int) b.get("month") : 0;
            if (yb != ya) return yb - ya;
            return mb - ma;
        });
        return result;
    }

    /** All wallet transfers (CashDeposit) to company — for accounts history */
    @GetMapping("/api/wallet-transfers")
    public List<Map<String, Object>> getAllWalletTransfers() {
        List<Map<String, Object>> result = new ArrayList<>();
        cashDepositRepository.findAll().forEach(cd -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", cd.getId());
            m.put("amount", cd.getAmount());
            m.put("transferDate", cd.getTransferDate());
            m.put("transferType", cd.getTransferType());
            m.put("notes", cd.getNotes());
            m.put("recordedBy", cd.getRecordedBy());
            if (cd.getStaff() != null) {
                m.put("sourceType", "STAFF");
                m.put("sourceName", cd.getStaff().getName());
                m.put("sourceId", cd.getStaff().getId());
                m.put("employeeId", cd.getStaff().getEmployeeId());
                m.put("designation", cd.getStaff().getDesignation());
            } else if (cd.getUser() != null) {
                m.put("sourceType", "ADMIN");
                m.put("sourceName", cd.getUser().getUsername());
                m.put("sourceId", cd.getUser().getId());
            }
            result.add(m);
        });
        result.sort((a, b) -> {
            Object da = a.get("transferDate"), db = b.get("transferDate");
            if (da == null && db == null) return 0;
            if (da == null) return 1;
            if (db == null) return -1;
            return db.toString().compareTo(da.toString());
        });
        return result;
    }

    /** Unified company wallet transaction history — all INs and OUTs */
    @GetMapping("/api/wallet-history")
    public List<Map<String, Object>> getWalletHistory() {
        List<Map<String, Object>> result = new ArrayList<>();

        // ── IN: Customer payments direct to company ───────────────────────────
        paymentRepository.findAll().stream()
            .filter(p -> "COMPANY_DIRECT".equals(p.getDestination())
                      && ("CONFIRMED".equals(p.getVerificationStatus()) || "DEPOSITED".equals(p.getVerificationStatus())))
            .forEach(p -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", "PAY-" + p.getId());
                m.put("type", "IN");
                m.put("category", "Customer Payment");
                m.put("amount", p.getAmount());
                m.put("date", p.getPaymentDate());
                m.put("method", p.getPaymentMethod());
                m.put("description", p.getInvoice() != null
                    ? (p.getInvoice().getInvoiceNumber() + (p.getInvoice().getCustomer() != null ? " — " + p.getInvoice().getCustomer().getName() : ""))
                    : "Direct payment");
                m.put("notes", p.getNotes());
                result.add(m);
            });

        // ── IN: Staff / Admin deposits to company wallet ──────────────────────
        cashDepositRepository.findAll().forEach(cd -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", "DEP-" + cd.getId());
            m.put("type", "IN");
            m.put("category", cd.getStaff() != null ? "Staff Deposit" : "Admin Transfer");
            m.put("amount", cd.getAmount());
            m.put("date", cd.getTransferDate());
            m.put("method", cd.getTransferType());
            String name = cd.getStaff() != null ? cd.getStaff().getName()
                        : cd.getUser() != null ? cd.getUser().getUsername() : "Unknown";
            m.put("description", name + " → Company Wallet");
            m.put("notes", cd.getNotes());
            m.put("recordedBy", cd.getRecordedBy());
            result.add(m);
        });

        // ── OUT: Supplier payments ────────────────────────────────────────────
        supplierPaymentRepository.findAll().forEach(sp -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", "SUP-" + sp.getId());
            m.put("type", "OUT");
            m.put("category", "Supplier Payment");
            m.put("amount", sp.getAmount());
            m.put("date", sp.getPaymentDate());
            m.put("method", sp.getPaymentMethod());
            String desc = sp.getPurchaseOrder() != null
                ? (sp.getPurchaseOrder().getPoNumber() != null ? sp.getPurchaseOrder().getPoNumber() : "PO-" + sp.getPurchaseOrder().getId())
                  + (sp.getPurchaseOrder().getSupplier() != null ? " — " + sp.getPurchaseOrder().getSupplier().getName() : "")
                : "Supplier payment";
            m.put("description", desc);
            m.put("notes", sp.getNotes());
            result.add(m);
        });

        // ── OUT: Salary payments ──────────────────────────────────────────────
        salaryPaymentRepository.findAll().forEach(sp -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", "SAL-" + sp.getId());
            m.put("type", "OUT");
            m.put("category", "Salary");
            m.put("amount", sp.getAmount());
            m.put("date", sp.getPaymentDate());
            m.put("method", sp.getPaymentMethod());
            String name = sp.getStaff() != null ? sp.getStaff().getName() : "Staff";
            m.put("description", name + " — Salary");
            m.put("notes", sp.getNotes());
            result.add(m);
        });

        // ── OUT: Refunds ──────────────────────────────────────────────────────
        salesReturnRefundRepository.findAll().forEach(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", "REF-" + r.getId());
            m.put("type", "OUT");
            m.put("category", "Refund");
            m.put("amount", r.getAmount());
            m.put("date", r.getRefundDate());
            m.put("method", r.getPaymentMethod());
            String desc = r.getSalesReturn() != null
                ? (r.getSalesReturn().getReturnNumber() != null ? r.getSalesReturn().getReturnNumber() : "RET-" + r.getSalesReturn().getId())
                : "Refund";
            m.put("description", desc);
            m.put("notes", r.getNotes());
            result.add(m);
        });

        // Sort by date descending
        result.sort((a, b) -> {
            Object da = a.get("date"), db = b.get("date");
            if (da == null && db == null) return 0;
            if (da == null) return 1;
            if (db == null) return -1;
            return db.toString().compareTo(da.toString());
        });

        // Compute running balance (oldest first, then reverse)
        List<Map<String, Object>> sorted = new ArrayList<>(result);
        Collections.reverse(sorted);
        BigDecimal running = BigDecimal.ZERO;
        for (Map<String, Object> m : sorted) {
            BigDecimal amt = m.get("amount") instanceof BigDecimal ? (BigDecimal) m.get("amount")
                           : new BigDecimal(m.get("amount").toString());
            if ("IN".equals(m.get("type"))) running = running.add(amt);
            else running = running.subtract(amt);
            m.put("balance", running);
        }
        Collections.reverse(sorted);
        return sorted;
    }
}
