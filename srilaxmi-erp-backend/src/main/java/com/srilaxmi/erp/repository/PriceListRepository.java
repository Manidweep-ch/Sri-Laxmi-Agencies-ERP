package com.srilaxmi.erp.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import com.srilaxmi.erp.entity.PriceList;

public interface PriceListRepository extends JpaRepository<PriceList, Long> {

    // Get the active price for a product on a specific date
    Optional<PriceList> findFirstByProductIdAndValidFromLessThanEqualAndActiveTrueOrderByValidFromDesc(
            Long productId, LocalDate date);

    // Get all price history for a product
    List<PriceList> findByProductIdOrderByValidFromDesc(Long productId);

    // Get current open-ended prices (no validTo set)
    List<PriceList> findByProductIdAndActiveTrueAndValidToIsNull(Long productId);
}