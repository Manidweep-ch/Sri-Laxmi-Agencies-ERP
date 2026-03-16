package com.srilaxmi.erp.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import com.srilaxmi.erp.entity.Supplier;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    List<Supplier> findByActiveTrue();
}
