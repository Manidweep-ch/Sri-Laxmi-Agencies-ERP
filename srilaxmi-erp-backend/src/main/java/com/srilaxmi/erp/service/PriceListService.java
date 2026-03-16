package com.srilaxmi.erp.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.srilaxmi.erp.entity.PriceList;
import com.srilaxmi.erp.repository.PriceListRepository;

@Service
public class PriceListService {

    @Autowired
    private PriceListRepository priceListRepository;

    // Add a new price for a product.
    // Automatically closes the previous price's validTo = newPrice.validFrom - 1 day
    @Transactional
    public PriceList savePrice(PriceList price) {
        if (price.getValidFrom() == null) {
            price.setValidFrom(LocalDate.now());
        }

        // Close any existing open price for this product
        List<PriceList> existing = priceListRepository
                .findByProductIdAndActiveTrueAndValidToIsNull(price.getProduct().getId());

        LocalDate dayBefore = price.getValidFrom().minusDays(1);
        for (PriceList old : existing) {
            old.setValidTo(dayBefore);
            priceListRepository.save(old);
        }

        return priceListRepository.save(price);
    }

    // Update price/discount on an existing price entry
    @Transactional
    public PriceList updatePrice(Long id, PriceList updated) {
        PriceList existing = priceListRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Price entry not found"));

        existing.setBasePrice(updated.getBasePrice());
        existing.setCostPrice(updated.getCostPrice());
        existing.setBaseDiscount(updated.getBaseDiscount());

        return priceListRepository.save(existing);
    }

    // Delete (deactivate) a price entry
    @Transactional
    public void deletePrice(Long id) {
        PriceList price = priceListRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Price entry not found"));
        price.setActive(false);
        priceListRepository.save(price);
    }

    // Get all prices (all products, all history)
    public List<PriceList> getAllPrices() {
        return priceListRepository.findAll();
    }

    // Get full price history for one product
    public List<PriceList> getPriceHistory(Long productId) {
        return priceListRepository.findByProductIdOrderByValidFromDesc(productId);
    }

    // Get the price valid on a specific date — used during billing
    public Optional<PriceList> getPriceOnDate(Long productId, LocalDate date) {
        return priceListRepository
                .findFirstByProductIdAndValidFromLessThanEqualAndActiveTrueOrderByValidFromDesc(
                        productId, date);
    }

    // Get current active price
    public Optional<PriceList> getCurrentPrice(Long productId) {
        return getPriceOnDate(productId, LocalDate.now());
    }
}
