package com.srilaxmi.erp.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.entity.PriceList;
import com.srilaxmi.erp.service.PriceListService;

@RestController
@RequestMapping("/api/prices")
public class PriceListController {

    @Autowired
    private PriceListService priceListService;

    // Add new price for a product
    @PostMapping
    public PriceList addPrice(@RequestBody PriceList price) {
        return priceListService.savePrice(price);
    }

    // Update price/discount
    @PutMapping("/{id}")
    public PriceList updatePrice(@PathVariable Long id, @RequestBody PriceList price) {
        return priceListService.updatePrice(id, price);
    }

    // Get all prices (used for price list page)
    @GetMapping
    public List<PriceList> getAllPrices() {
        return priceListService.getAllPrices();
    }

    // Get price history for a specific product
    @GetMapping("/history/{productId}")
    public List<PriceList> getPriceHistory(@PathVariable Long productId) {
        return priceListService.getPriceHistory(productId);
    }

    // Get current active price for a product
    @GetMapping("/current/{productId}")
    public Optional<PriceList> getCurrentPrice(@PathVariable Long productId) {
        return priceListService.getCurrentPrice(productId);
    }
}
