package com.srilaxmi.erp.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.srilaxmi.erp.entity.SalesOrder;

public interface SalesOrderRepository extends JpaRepository<SalesOrder, Long> {
    List<SalesOrder> findByActiveTrue();
}