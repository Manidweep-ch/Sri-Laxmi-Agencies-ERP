package com.srilaxmi.erp.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "price_lists")
public class PriceList {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private BigDecimal basePrice;   // Selling Price (SP)

    private BigDecimal costPrice;   // Cost Price (CP) — what you pay the supplier

    private BigDecimal baseDiscount;

    @Column(nullable = false)
    private LocalDate validFrom;

    private LocalDate validTo;

    private boolean active = true;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    public PriceList() {}

    public Long getId() {
        return id;
    }

    public BigDecimal getBasePrice() {
        return basePrice;
    }

    public void setBasePrice(BigDecimal basePrice) {
        this.basePrice = basePrice;
    }

    public BigDecimal getCostPrice() {
        return costPrice;
    }

    public void setCostPrice(BigDecimal costPrice) {
        this.costPrice = costPrice;
    }

    public BigDecimal getBaseDiscount() {
        return baseDiscount;
    }

    public void setBaseDiscount(BigDecimal baseDiscount) {
        this.baseDiscount = baseDiscount;
    }

    public LocalDate getValidFrom() {
        return validFrom;
    }

    public void setValidFrom(LocalDate validFrom) {
        this.validFrom = validFrom;
    }

    public LocalDate getValidTo() {
        return validTo;
    }

    public void setValidTo(LocalDate validTo) {
        this.validTo = validTo;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }
}