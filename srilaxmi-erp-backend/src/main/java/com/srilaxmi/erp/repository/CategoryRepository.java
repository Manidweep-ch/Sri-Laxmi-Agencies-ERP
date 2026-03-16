package com.srilaxmi.erp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.srilaxmi.erp.entity.Category;

public interface CategoryRepository extends JpaRepository<Category, Long> {

}