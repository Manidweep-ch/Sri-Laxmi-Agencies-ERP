package com.srilaxmi.erp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.srilaxmi.erp.entity.Invoice;
import java.util.List;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByCustomerIdAndActiveTrue(Long customerId);

    java.util.Optional<Invoice> findBySalesOrderIdAndActiveTrue(Long salesOrderId);

    List<Invoice> findByActiveTrue();
}