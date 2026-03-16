package com.srilaxmi.erp.dto;

import java.math.BigDecimal;

public class OutstandingResponse {

    private Long invoiceId;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal outstandingAmount;

    public OutstandingResponse(Long invoiceId,
                               BigDecimal totalAmount,
                               BigDecimal paidAmount,
                               BigDecimal outstandingAmount) {

        this.invoiceId = invoiceId;
        this.totalAmount = totalAmount;
        this.paidAmount = paidAmount;
        this.outstandingAmount = outstandingAmount;
    }

    public Long getInvoiceId() {
        return invoiceId;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public BigDecimal getPaidAmount() {
        return paidAmount;
    }

    public BigDecimal getOutstandingAmount() {
        return outstandingAmount;
    }
}