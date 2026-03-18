package com.srilaxmi.erp.service;

import com.srilaxmi.erp.entity.*;
import com.srilaxmi.erp.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class PayrollService {

    @Autowired private PayrollRunRepository payrollRunRepository;
    @Autowired private StaffRepository staffRepository;
    @Autowired private SalaryPaymentRepository salaryPaymentRepository;

    /**
     * Prepare a draft payroll for a given month/year.
     * Pre-fills all active staff with their monthly salary.
     * If a run already exists for that month, returns it.
     */
    @Transactional
    public PayrollRun preparePayroll(int month, int year) {
        // Return existing draft if already prepared
        var existing = payrollRunRepository.findByMonthAndYear(month, year);
        if (existing.isPresent()) return existing.get();

        List<Staff> activeStaff = staffRepository.findByActiveTrue();

        PayrollRun run = new PayrollRun();
        run.setMonth(month);
        run.setYear(year);
        run.setRunDate(LocalDate.now());
        run.setStatus("DRAFT");
        run.setProcessedBy(SecurityContextHolder.getContext().getAuthentication().getName());
        run.setTotalPaid(BigDecimal.ZERO);

        List<PayrollRunItem> items = new ArrayList<>();
        for (Staff staff : activeStaff) {
            PayrollRunItem item = new PayrollRunItem();
            item.setPayrollRun(run);
            item.setStaff(staff);
            BigDecimal base = staff.getMonthlySalary() != null ? staff.getMonthlySalary() : BigDecimal.ZERO;
            item.setBaseSalary(base);
            item.setDeduction(BigDecimal.ZERO);
            item.setFinalAmount(base);
            item.setIncluded(true);
            items.add(item);
        }
        run.setItems(items);
        return payrollRunRepository.save(run);
    }

    /**
     * Update draft items — accounts adjusts amounts/deductions/skips before confirming.
     * Expects list of { id, deduction, finalAmount, included, notes }
     */
    @Transactional
    public PayrollRun updateDraft(Long runId, List<Map<String, Object>> itemUpdates) {
        PayrollRun run = getById(runId);
        if (!"DRAFT".equals(run.getStatus()))
            throw new IllegalStateException("Only DRAFT payrolls can be edited");

        for (Map<String, Object> upd : itemUpdates) {
            Long itemId = Long.valueOf(upd.get("id").toString());
            run.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .ifPresent(item -> {
                    if (upd.containsKey("deduction"))
                        item.setDeduction(new BigDecimal(upd.get("deduction").toString()));
                    if (upd.containsKey("finalAmount"))
                        item.setFinalAmount(new BigDecimal(upd.get("finalAmount").toString()));
                    if (upd.containsKey("included"))
                        item.setIncluded(Boolean.parseBoolean(upd.get("included").toString()));
                    if (upd.containsKey("notes"))
                        item.setNotes(upd.get("notes").toString());
                });
        }
        return payrollRunRepository.save(run);
    }

    /**
     * Confirm payroll — creates SalaryPayment records for all included items.
     */
    @Transactional
    public PayrollRun confirmPayroll(Long runId, String paymentMethod) {
        PayrollRun run = getById(runId);
        if (!"DRAFT".equals(run.getStatus()))
            throw new IllegalStateException("Payroll already confirmed");

        BigDecimal total = BigDecimal.ZERO;
        for (PayrollRunItem item : run.getItems()) {
            if (!item.isIncluded() || item.getFinalAmount() == null
                    || item.getFinalAmount().compareTo(BigDecimal.ZERO) <= 0) continue;

            SalaryPayment payment = new SalaryPayment();
            payment.setStaff(item.getStaff());
            payment.setMonth(run.getMonth());
            payment.setYear(run.getYear());
            payment.setAmount(item.getFinalAmount());
            payment.setPaymentDate(LocalDate.now());
            payment.setPaymentMethod(paymentMethod);
            payment.setNotes(item.getNotes());
            SalaryPayment saved = salaryPaymentRepository.save(payment);
            item.setSalaryPayment(saved);
            total = total.add(item.getFinalAmount());
        }

        run.setStatus("CONFIRMED");
        run.setTotalPaid(total);
        run.setProcessedBy(SecurityContextHolder.getContext().getAuthentication().getName());
        return payrollRunRepository.save(run);
    }

    public List<PayrollRun> getAllRuns() {
        return payrollRunRepository.findAllByOrderByYearDescMonthDesc();
    }

    public PayrollRun getById(Long id) {
        return payrollRunRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Payroll run not found"));
    }
}
