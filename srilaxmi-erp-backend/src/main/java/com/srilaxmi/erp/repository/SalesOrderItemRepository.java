package com.srilaxmi.erp.repository;

import java.util.List;

import com.srilaxmi.erp.entity.SalesOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesOrderItemRepository extends JpaRepository<SalesOrderItem, Long> {
    List<SalesOrderItem> findBySalesOrderId(Long orderId);
    List<SalesOrderItem> findByProductId(Long productId);
}
