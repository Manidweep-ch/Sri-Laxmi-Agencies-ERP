package com.srilaxmi.erp.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import com.srilaxmi.erp.entity.Customer;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    List<Customer> findByActiveTrue();
}
