package com.srilaxmi.erp.repository;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import com.srilaxmi.erp.entity.SalesReturnRefund;

public interface SalesReturnRefundRepository extends JpaRepository<SalesReturnRefund, Long> {

    List<SalesReturnRefund> findBySalesReturnId(Long salesReturnId);

    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM SalesReturnRefund r WHERE r.salesReturn.id = :returnId")
    BigDecimal sumBySalesReturnId(Long returnId);
}
