package com.srilaxmi.erp.repository;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import com.srilaxmi.erp.entity.CreditNote;

public interface CreditNoteRepository extends JpaRepository<CreditNote, Long> {

    List<CreditNote> findByInvoiceId(Long invoiceId);

    @Query("SELECT COALESCE(SUM(c.amount), 0) FROM CreditNote c WHERE c.invoice.id = :invoiceId")
    BigDecimal sumByInvoiceId(Long invoiceId);
}