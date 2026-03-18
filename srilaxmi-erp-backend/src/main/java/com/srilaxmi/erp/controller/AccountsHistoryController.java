package com.srilaxmi.erp.controller;

import com.srilaxmi.erp.entity.SalaryPayment;
import com.srilaxmi.erp.entity.SupplierPayment;
import com.srilaxmi.erp.repository.SalaryPaymentRepository;
import com.srilaxmi.erp.repository.SupplierPaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Read-only history endpoints for the Accounts department.
 * Provides all supplier payments and all salary payments in one place.
 */
@RestController
public class AccountsHistoryController {

    @Autowired private SupplierPaymentRepository supplierPaymentRepository;
    @Autowired private SalaryPaymentRepository salaryPaymentRepository;

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
}
