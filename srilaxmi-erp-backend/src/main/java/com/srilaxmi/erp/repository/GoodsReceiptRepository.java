package com.srilaxmi.erp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.srilaxmi.erp.entity.GoodsReceipt;
import java.util.List;

public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, Long> {
    List<GoodsReceipt> findByPurchaseOrderId(Long purchaseOrderId);
}