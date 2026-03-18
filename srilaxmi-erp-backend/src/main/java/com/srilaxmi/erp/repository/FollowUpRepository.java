package com.srilaxmi.erp.repository;

import com.srilaxmi.erp.entity.FollowUp;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FollowUpRepository extends JpaRepository<FollowUp, Long> {
    Optional<FollowUp> findByInvoiceIdAndStatus(Long invoiceId, String status);
    List<FollowUp> findByAssignedToIdAndStatus(Long staffId, String status);
    List<FollowUp> findAllByOrderByCreatedAtDesc();
}
