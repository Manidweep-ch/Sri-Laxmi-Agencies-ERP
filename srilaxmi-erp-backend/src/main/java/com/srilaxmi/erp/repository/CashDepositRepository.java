package com.srilaxmi.erp.repository;

import com.srilaxmi.erp.entity.CashDeposit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface CashDepositRepository extends JpaRepository<CashDeposit, Long> {

    // Staff transfers
    List<CashDeposit> findByStaffIdOrderByTransferDateDesc(Long staffId);

    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM CashDeposit d WHERE d.staff.id = :staffId")
    BigDecimal sumByStaffId(@Param("staffId") Long staffId);

    // Admin/user transfers
    List<CashDeposit> findByUserIdOrderByTransferDateDesc(Long userId);

    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM CashDeposit d WHERE d.user.id = :userId")
    BigDecimal sumByUserId(@Param("userId") Long userId);

    // Total all transfers to company wallet
    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM CashDeposit d")
    BigDecimal sumAll();
}
