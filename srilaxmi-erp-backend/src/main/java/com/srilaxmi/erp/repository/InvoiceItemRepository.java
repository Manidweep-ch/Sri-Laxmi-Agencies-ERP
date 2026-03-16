package com.srilaxmi.erp.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import com.srilaxmi.erp.entity.InvoiceItem;

public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, Long> {
    
    List<InvoiceItem> findByInvoiceId(Long invoiceId);

}