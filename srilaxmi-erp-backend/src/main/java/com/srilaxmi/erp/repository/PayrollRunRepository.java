package com.srilaxmi.erp.repository;

import com.srilaxmi.erp.entity.PayrollRun;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PayrollRunRepository extends JpaRepository<PayrollRun, Long> {
    List<PayrollRun> findAllByOrderByYearDescMonthDesc();
    Optional<PayrollRun> findByMonthAndYear(int month, int year);
}
