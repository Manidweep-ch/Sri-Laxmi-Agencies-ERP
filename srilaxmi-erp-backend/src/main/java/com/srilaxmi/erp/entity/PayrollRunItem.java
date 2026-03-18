package com.srilaxmi.erp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "payroll_run_items")
public class PayrollRunItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "payroll_run_id")
    private PayrollRun payrollRun;

    @ManyToOne
    @JoinColumn(name = "staff_id")
    private Staff staff;

    // Base monthly salary
    private BigDecimal baseSalary;

    // Deduction amount (e.g. for absence, penalty)
    private BigDecimal deduction;

    // Final amount paid = baseSalary - deduction
    private BigDecimal finalAmount;

    // true = salary paid, false = skipped/held
    private boolean included;

    private String notes;

    // Linked salary payment record (created on confirm)
    @OneToOne
    @JoinColumn(name = "salary_payment_id")
    private SalaryPayment salaryPayment;

    public PayrollRunItem() {}

    public Long getId() { return id; }
    public PayrollRun getPayrollRun() { return payrollRun; }
    public void setPayrollRun(PayrollRun payrollRun) { this.payrollRun = payrollRun; }
    public Staff getStaff() { return staff; }
    public void setStaff(Staff staff) { this.staff = staff; }
    public BigDecimal getBaseSalary() { return baseSalary; }
    public void setBaseSalary(BigDecimal baseSalary) { this.baseSalary = baseSalary; }
    public BigDecimal getDeduction() { return deduction; }
    public void setDeduction(BigDecimal deduction) { this.deduction = deduction; }
    public BigDecimal getFinalAmount() { return finalAmount; }
    public void setFinalAmount(BigDecimal finalAmount) { this.finalAmount = finalAmount; }
    public boolean isIncluded() { return included; }
    public void setIncluded(boolean included) { this.included = included; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public SalaryPayment getSalaryPayment() { return salaryPayment; }
    public void setSalaryPayment(SalaryPayment salaryPayment) { this.salaryPayment = salaryPayment; }
}
