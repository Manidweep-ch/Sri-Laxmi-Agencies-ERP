package com.srilaxmi.erp.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "sales_returns")
public class SalesReturn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String returnNumber;

    private LocalDate returnDate;

    private String reason;

    private BigDecimal totalAmount;

    @ManyToOne
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    @Transient
    private String customerName;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @OneToMany(mappedBy = "salesReturn", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SalesReturnItem> items;

    public SalesReturn(){}

    public Long getId() {
        return id;
    }

    public String getReturnNumber() {
        return returnNumber;
    }

    public void setReturnNumber(String returnNumber) {
        this.returnNumber = returnNumber;
    }

    public LocalDate getReturnDate() {
        return returnDate;
    }

    public void setReturnDate(LocalDate returnDate) {
        this.returnDate = returnDate;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Invoice getInvoice() {
        return invoice;
    }

    public void setInvoice(Invoice invoice) {
        this.invoice = invoice;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public List<SalesReturnItem> getItems() {
        return items;
    }

    public void setItems(List<SalesReturnItem> items) {
        this.items = items;
    }
}