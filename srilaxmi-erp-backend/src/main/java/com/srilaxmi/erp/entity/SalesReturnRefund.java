package com.srilaxmi.erp.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "sales_return_refunds")
public class SalesReturnRefund {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private BigDecimal amount;

    private LocalDate refundDate;

    private String paymentMethod;

    private String notes;

    @ManyToOne
    @JoinColumn(name = "sales_return_id")
    private SalesReturn salesReturn;

    public SalesReturnRefund() {}

    public Long getId() { return id; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public LocalDate getRefundDate() { return refundDate; }
    public void setRefundDate(LocalDate refundDate) { this.refundDate = refundDate; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public SalesReturn getSalesReturn() { return salesReturn; }
    public void setSalesReturn(SalesReturn salesReturn) { this.salesReturn = salesReturn; }
}
