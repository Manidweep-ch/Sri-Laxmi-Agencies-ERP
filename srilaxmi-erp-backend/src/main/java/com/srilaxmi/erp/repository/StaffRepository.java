package com.srilaxmi.erp.repository;

import com.srilaxmi.erp.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StaffRepository extends JpaRepository<Staff, Long> {
    List<Staff> findByActiveTrue();
    List<Staff> findByDesignationIgnoreCaseAndActiveTrue(String designation);
}
