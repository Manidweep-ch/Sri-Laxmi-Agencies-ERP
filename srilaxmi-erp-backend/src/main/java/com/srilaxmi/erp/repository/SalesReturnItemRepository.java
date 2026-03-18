package com.srilaxmi.erp.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import com.srilaxmi.erp.entity.SalesReturnItem;

public interface SalesReturnItemRepository extends JpaRepository<SalesReturnItem, Long> {
    
    List<SalesReturnItem> findBySalesReturnId(Long salesReturnId);

}