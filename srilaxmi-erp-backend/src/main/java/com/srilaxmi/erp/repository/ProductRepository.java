package com.srilaxmi.erp.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.srilaxmi.erp.entity.Product;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByPreferredSupplierIdAndActiveTrue(Long supplierId);
    List<Product> findByBrandIdAndActiveTrue(Long brandId);
    List<Product> findByCategoryIdAndActiveTrue(Long categoryId);
    List<Product> findByActiveTrue();
}