package com.srilaxmi.erp.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import com.srilaxmi.erp.entity.InvoiceItem;

public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, Long> {
    
    List<InvoiceItem> findByInvoiceId(Long invoiceId);

    /**
     * Returns per-product profit summary: productId, productName, totalQty, totalRevenue, totalCOGS
     * Only includes items where costPrice has been recorded (FIFO invoices).
     */
    @Query("""
        SELECT ii.product.id, ii.product.name,
               SUM(ii.quantity),
               SUM(ii.unitPrice * ii.quantity),
               SUM(ii.costPrice * ii.quantity)
        FROM InvoiceItem ii
        WHERE ii.costPrice IS NOT NULL
        GROUP BY ii.product.id, ii.product.name
        """)
    List<Object[]> getProfitSummaryByProduct();
}