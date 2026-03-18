package com.srilaxmi.erp.dto;

/**
 * Represents a single FIFO batch slice consumed during invoice generation.
 * One SO item may produce multiple StockBatchConsumption records if stock
 * spans batches with different selling prices.
 */
public class StockBatchConsumption {
    public int quantity;
    public double purchasePrice;  // COGS per unit from this batch
    public double sellingPrice;   // SP stamped on this batch at GRN time

    public StockBatchConsumption(int quantity, double purchasePrice, double sellingPrice) {
        this.quantity = quantity;
        this.purchasePrice = purchasePrice;
        this.sellingPrice = sellingPrice;
    }
}
