package com.srilaxmi.erp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.srilaxmi.erp.entity.Product;

public interface ProductRepository extends JpaRepository<Product, Long> {

}