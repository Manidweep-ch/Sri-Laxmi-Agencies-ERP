package com.srilaxmi.erp.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import com.srilaxmi.erp.entity.SupplierPayment;

public interface SupplierPaymentRepository extends JpaRepository<SupplierPayment, Long> {
    List<SupplierPayment> findByPurchaseOrderId(Long poId);

    @Query("SELECT COALESCE(SUM(sp.amount), 0) FROM SupplierPayment sp WHERE sp.purchaseOrder.id = :poId")
    java.math.BigDecimal sumByPurchaseOrderId(Long poId);

    @Query("SELECT COALESCE(SUM(sp.amount), 0) FROM SupplierPayment sp WHERE sp.purchaseOrder.supplier.id = :supplierId")
    java.math.BigDecimal sumBySupplierId(Long supplierId);

    @Query("SELECT sp FROM SupplierPayment sp WHERE sp.purchaseOrder.supplier.id = :supplierId ORDER BY sp.paymentDate DESC")
    List<SupplierPayment> findBySupplierId(Long supplierId);
}
