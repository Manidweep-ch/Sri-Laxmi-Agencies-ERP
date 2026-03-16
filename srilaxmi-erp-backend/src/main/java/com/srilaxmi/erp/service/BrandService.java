package com.srilaxmi.erp.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.entity.Brand;
import com.srilaxmi.erp.repository.BrandRepository;

@Service
public class BrandService {

    @Autowired
    private BrandRepository brandRepository;

    public Brand saveBrand(Brand brand) {
        if (brand == null) {
            throw new IllegalArgumentException("Brand cannot be null");
        }
        return brandRepository.save(brand);
    }

    public List<Brand> getAllBrands() {
        return brandRepository.findAll();
    }
}