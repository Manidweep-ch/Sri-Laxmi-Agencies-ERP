package com.srilaxmi.erp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.srilaxmi.erp.entity.Invoice;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

}