package com.srilaxmi.erp.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.srilaxmi.erp.entity.StockBatch;

public interface StockBatchRepository extends JpaRepository<StockBatch, Long> {
	
	@Query("""
	           SELECT sb.product.id, sb.product.name, SUM(sb.quantity), SUM(sb.quantity * sb.purchasePrice)
	           FROM StockBatch sb
	           WHERE sb.active = true
	           GROUP BY sb.product.id, sb.product.name
	           """)
	    List<Object[]> getInventorySummary();


    List<StockBatch> findByProductIdAndActiveTrueOrderByReceivedDateAsc(Long productId);

    Optional<StockBatch> findFirstByProductIdAndActiveTrueOrderByReceivedDateDesc(Long productId);

}