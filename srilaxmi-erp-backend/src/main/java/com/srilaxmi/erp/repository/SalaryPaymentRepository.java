package com.srilaxmi.erp.repository;

import com.srilaxmi.erp.entity.SalaryPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface SalaryPaymentRepository extends JpaRepository<SalaryPayment, Long> {

    List<SalaryPayment> findByStaffIdOrderByYearDescMonthDesc(Long staffId);

    List<SalaryPayment> findByStaffIdAndYear(Long staffId, int year);

    boolean existsByStaffIdAndMonthAndYear(Long staffId, int month, int year);

    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM SalaryPayment s WHERE s.staff.id = :staffId AND s.year = :year")
    BigDecimal sumByStaffIdAndYear(@Param("staffId") Long staffId, @Param("year") int year);

    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM SalaryPayment s WHERE s.staff.id = :staffId")
    BigDecimal sumByStaffId(@Param("staffId") Long staffId);
}
