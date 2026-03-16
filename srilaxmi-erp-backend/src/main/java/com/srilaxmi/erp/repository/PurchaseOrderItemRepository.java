package com.srilaxmi.erp.repository;

import java.util.List;

import com.srilaxmi.erp.entity.PurchaseOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseOrderItemRepository extends JpaRepository<PurchaseOrderItem, Long> {
    List<PurchaseOrderItem> findByPurchaseOrderId(Long poId);
    void deleteByPurchaseOrderId(Long poId);
}
