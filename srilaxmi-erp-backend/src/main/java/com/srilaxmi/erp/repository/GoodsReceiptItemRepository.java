package com.srilaxmi.erp.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import com.srilaxmi.erp.entity.GoodsReceiptItem;

public interface GoodsReceiptItemRepository extends JpaRepository<GoodsReceiptItem, Long> {
    
    List<GoodsReceiptItem> findByGoodsReceiptId(Long grnId);
}