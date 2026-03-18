package com.srilaxmi.erp.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.srilaxmi.erp.entity.Payment;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByInvoiceId(Long invoiceId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.invoice.id = :invoiceId")
    BigDecimal sumByInvoiceId(Long invoiceId);

    @Query("SELECT p FROM Payment p WHERE p.invoice.salesOrder.customer.id = :customerId")
    List<Payment> findByCustomerId(@Param("customerId") Long customerId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.invoice.salesOrder.customer.id = :customerId")
    BigDecimal sumByCustomerId(@Param("customerId") Long customerId);

    // ── Staff wallet queries ──────────────────────────────────────────────────
    List<Payment> findByReceivedByIdOrderByPaymentDateDesc(Long staffId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.receivedBy.id = :staffId")
    BigDecimal sumByReceivedById(@Param("staffId") Long staffId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.receivedBy.id = :staffId AND p.paymentChannel = :channel")
    BigDecimal sumByReceivedByIdAndChannel(@Param("staffId") Long staffId, @Param("channel") String channel);

    // ── Admin wallet queries ──────────────────────────────────────────────────
    List<Payment> findByReceivedByUserIdOrderByPaymentDateDesc(Long userId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.receivedByUser.id = :userId")
    BigDecimal sumByReceivedByUserId(@Param("userId") Long userId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.receivedByUser.id = :userId AND p.verificationStatus = :status")
    BigDecimal sumByReceivedByUserIdAndStatus(@Param("userId") Long userId, @Param("status") String status);

    // Pending verification for a specific admin
    List<Payment> findByReceivedByUserIdAndVerificationStatusOrderByPaymentDateDesc(Long userId, String status);

    // ── Cheque queries ────────────────────────────────────────────────────────
    @Query("SELECT p FROM Payment p WHERE p.paymentMethod = 'CHEQUE' AND p.chequeDepositDate <= :today AND p.verificationStatus = 'PENDING'")
    List<Payment> findChequesdueTodayOrBefore(@Param("today") LocalDate today);

    @Query("SELECT p FROM Payment p WHERE p.paymentMethod = 'CHEQUE' AND p.verificationStatus = 'PENDING' ORDER BY p.chequeDepositDate ASC")
    List<Payment> findAllPendingCheques();

    // ── Dashboard totals ──────────────────────────────────────────────────────
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p")
    BigDecimal sumAll();

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.receivedBy IS NULL AND p.receivedByUser IS NULL")
    BigDecimal sumUnassigned();

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.receivedBy IS NOT NULL OR p.receivedByUser IS NOT NULL")
    BigDecimal sumAssigned();

    // Payments going directly to company (no staff/admin intermediary)
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.destination = 'COMPANY_DIRECT' AND p.verificationStatus IN ('CONFIRMED','DEPOSITED')")
    BigDecimal sumCompanyDirect();

    List<Payment> findByReceivedByIsNullAndReceivedByUserIsNullOrderByPaymentDateDesc();
}
