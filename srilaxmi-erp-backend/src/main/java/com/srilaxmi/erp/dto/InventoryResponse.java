package com.srilaxmi.erp.dto;

import java.math.BigDecimal;

public class InventoryResponse {

    private Long productId;
    private String productName;
    private int quantity;
    private BigDecimal totalValue;

    public InventoryResponse(Long productId, String productName, int quantity, BigDecimal totalValue) {
        this.productId = productId;
        this.productName = productName;
        this.quantity = quantity;
        this.totalValue = totalValue;
    }

    public Long getProductId() {
        return productId;
    }

    public String getProductName() {
        return productName;
    }

    public int getQuantity() {
        return quantity;
    }

    public BigDecimal getTotalValue() {
        return totalValue;
    }
}