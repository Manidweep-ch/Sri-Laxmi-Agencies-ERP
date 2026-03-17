package com.srilaxmi.erp.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.dto.InventoryResponse;
import com.srilaxmi.erp.dto.StockBatchConsumption;
import com.srilaxmi.erp.entity.Product;
import com.srilaxmi.erp.entity.StockBatch;
import com.srilaxmi.erp.repository.StockBatchRepository;

@Service
public class StockBatchService {

    @Autowired
    private StockBatchRepository stockBatchRepository;

    @Transactional
    public StockBatch addStock(Product product, int quantity, double purchasePrice, double sellingPrice) {
        if (product == null) {
            throw new IllegalArgumentException("Product cannot be null");
        }
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than zero");
        }

        Optional<StockBatch> latestBatch =
                stockBatchRepository.findFirstByProductIdAndActiveTrueOrderByReceivedDateDesc(product.getId());

        if (latestBatch.isPresent()) {
            StockBatch batch = latestBatch.get();
            // Only merge if BOTH purchase price and selling price match
            if (batch.getPurchasePrice() == purchasePrice && batch.getSellingPrice() == sellingPrice) {
                batch.setQuantity(batch.getQuantity() + quantity);
                return stockBatchRepository.save(batch);
            }
        }

        StockBatch newBatch = new StockBatch();
        newBatch.setProduct(product);
        newBatch.setQuantity(quantity);
        newBatch.setPurchasePrice(purchasePrice);
        newBatch.setSellingPrice(sellingPrice);
        newBatch.setReceivedDate(LocalDate.now());

        return stockBatchRepository.save(newBatch);
    }

    /** Backward-compat overload — sellingPrice defaults to 0 */
    @Transactional
    public StockBatch addStock(Product product, int quantity, double purchasePrice) {
        return addStock(product, quantity, purchasePrice, 0.0);
    }

    public List<StockBatch> getProductBatches(Long productId) {
        return stockBatchRepository
                .findByProductIdAndActiveTrueOrderByReceivedDateAsc(productId);
    }
    public boolean isStockAvailable(Long productId, int quantity) {
        if (productId == null) {
            throw new IllegalArgumentException("Product ID cannot be null");
        }
        if (quantity <= 0) {
            return false;
        }
        List<StockBatch> batches = stockBatchRepository.findByProductIdAndActiveTrueOrderByReceivedDateAsc(productId);
        int totalQuantity = batches.stream().mapToInt(StockBatch::getQuantity).sum();
        return totalQuantity >= quantity;
    }

    /**
     * Consumes stock in FIFO order and returns the weighted average cost price
     * of the consumed units (COGS per unit).
     */
    @Transactional
    public double consumeStock(Long productId, int quantity) {
        if (productId == null) {
            throw new IllegalArgumentException("Product ID cannot be null");
        }
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than zero");
        }

        List<StockBatch> batches =
                stockBatchRepository.findByProductIdAndActiveTrueOrderByReceivedDateAsc(productId);

        int remaining = quantity;
        double totalCost = 0.0;

        for (StockBatch batch : batches) {

            if (remaining <= 0) {
                break;
            }

            int batchQty = batch.getQuantity();
            int consumed = Math.min(batchQty, remaining);

            totalCost += consumed * batch.getPurchasePrice();
            remaining -= consumed;

            if (batchQty <= consumed) {
                batch.setQuantity(0);
                batch.setActive(false);
            } else {
                batch.setQuantity(batchQty - consumed);
            }

            stockBatchRepository.save(batch);
        }

        if (remaining > 0) {
            throw new RuntimeException("Not enough stock available");
        }

        // Return weighted average cost per unit
        return totalCost / quantity;
    }
    /**
     * Consumes stock in FIFO order and returns one StockBatchConsumption per batch slice.
     * Each slice carries its own purchasePrice (COGS) and sellingPrice (SP stamped at GRN).
     * Use this for invoice generation so each batch slice becomes its own invoice line.
     */
    @Transactional
    public List<StockBatchConsumption> consumeStockWithSplits(Long productId, int quantity) {
        if (productId == null) throw new IllegalArgumentException("Product ID cannot be null");
        if (quantity <= 0) throw new IllegalArgumentException("Quantity must be greater than zero");

        List<StockBatch> batches =
                stockBatchRepository.findByProductIdAndActiveTrueOrderByReceivedDateAsc(productId);

        int remaining = quantity;
        List<StockBatchConsumption> splits = new ArrayList<>();

        for (StockBatch batch : batches) {
            if (remaining <= 0) break;

            int batchQty = batch.getQuantity();
            int consumed = Math.min(batchQty, remaining);

            splits.add(new StockBatchConsumption(consumed, batch.getPurchasePrice(), batch.getSellingPrice()));
            remaining -= consumed;

            if (batchQty <= consumed) {
                batch.setQuantity(0);
                batch.setActive(false);
            } else {
                batch.setQuantity(batchQty - consumed);
            }
            stockBatchRepository.save(batch);
        }

        if (remaining > 0) {
            throw new RuntimeException("Not enough stock available");
        }

        return splits;
    }

    public List<InventoryResponse> getInventorySummary() {
        List<Object[]> rows = stockBatchRepository.getInventorySummary();

        List<InventoryResponse> result = new ArrayList<>();
        for (Object[] row : rows) {

            Long productId = (Long) row[0];
            String productName = (String) row[1];
            Long qty = (Long) row[2];
            Double totalVal = (Double) row[3];

            result.add(new InventoryResponse(productId, productName, qty.intValue(), BigDecimal.valueOf(totalVal != null ? totalVal : 0.0)));
        }

        return result;
    }
    
    public double getAveragePurchasePrice(Long productId) {
        if (productId == null) {
            throw new IllegalArgumentException("Product ID cannot be null");
        }
        
        List<StockBatch> batches = stockBatchRepository.findByProductIdAndActiveTrueOrderByReceivedDateAsc(productId);
        
        if (batches.isEmpty()) {
            // No stock available, return 0 or throw exception
            return 0.0;
        }
        
        // Calculate weighted average based on quantities
        double totalValue = 0.0;
        int totalQuantity = 0;
        
        for (StockBatch batch : batches) {
            totalValue += batch.getPurchasePrice() * batch.getQuantity();
            totalQuantity += batch.getQuantity();
        }
        
        return totalQuantity > 0 ? totalValue / totalQuantity : 0.0;
    }
    
    @Transactional
    public void addStock(Long productId, int quantity, double purchasePrice) {
        if (productId == null) throw new IllegalArgumentException("Product ID cannot be null");
        if (quantity <= 0) throw new IllegalArgumentException("Quantity must be greater than zero");

        Product product = new Product();
        product.setId(productId);
        addStock(product, quantity, purchasePrice, 0.0);
    }

    /**
     * Returns all active batches for a product with cost and date info (for inventory view).
     */
    public List<StockBatch> getBatchDetail(Long productId){
        return stockBatchRepository.findByProductIdAndActiveTrueOrderByReceivedDateAsc(productId);
    }
}
