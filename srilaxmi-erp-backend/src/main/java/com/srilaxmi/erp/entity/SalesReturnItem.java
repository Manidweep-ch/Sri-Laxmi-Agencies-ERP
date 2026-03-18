package com.srilaxmi.erp.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "sales_return_items")
public class SalesReturnItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int quantity;

    private BigDecimal unitPrice;

    private BigDecimal totalAmount;

    @ManyToOne
    @JoinColumn(name = "sales_return_id")
    private SalesReturn salesReturn;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    public SalesReturnItem(){}

    public Long getId() {
        return id;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public SalesReturn getSalesReturn() {
        return salesReturn;
    }

    public void setSalesReturn(SalesReturn salesReturn) {
        this.salesReturn = salesReturn;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }
}