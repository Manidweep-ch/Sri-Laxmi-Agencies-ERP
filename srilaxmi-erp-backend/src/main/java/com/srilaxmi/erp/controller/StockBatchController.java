package com.srilaxmi.erp.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.srilaxmi.erp.dto.ConsumeRequest;
import com.srilaxmi.erp.dto.InventoryResponse;
import com.srilaxmi.erp.dto.StockRequest;
import com.srilaxmi.erp.entity.Product;
import com.srilaxmi.erp.entity.StockBatch;
import com.srilaxmi.erp.service.StockBatchService;

@RestController
@RequestMapping("/api/stock")
public class StockBatchController {

    @Autowired
    private StockBatchService stockBatchService;

    @PostMapping("/add")
    public StockBatch addStock(
            @RequestBody StockRequest request) {

        Product product = new Product();
        product.setId(request.getProductId());

        return stockBatchService.addStock(
                product,
                request.getQuantity(),
                request.getPurchasePrice()
        );
    }

    @GetMapping("/product/{productId}")
    public List<StockBatch> getProductStock(@PathVariable Long productId) {
        return stockBatchService.getProductBatches(productId);
    }
    
    @GetMapping("/inventory")
    public List<InventoryResponse> getInventory() {
        return stockBatchService.getInventorySummary();
    }
    
    @PostMapping("/consume")
    public String consumeStock(@RequestBody ConsumeRequest request) {

        stockBatchService.consumeStock(
                request.getProductId(),
                request.getQuantity()
        );

        return "Stock consumed successfully";
    }

}