package com.srilaxmi.erp.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.srilaxmi.erp.entity.PurchaseOrder;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    List<PurchaseOrder> findByActiveTrue();
}