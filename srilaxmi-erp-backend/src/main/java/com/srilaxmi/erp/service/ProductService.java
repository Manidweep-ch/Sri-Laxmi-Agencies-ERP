package com.srilaxmi.erp.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.entity.Product;
import com.srilaxmi.erp.repository.ProductRepository;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    public Product saveProduct(Product product) {
        if (product == null) throw new IllegalArgumentException("Product cannot be null");
        return productRepository.save(product);
    }

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Product updateProduct(Long id, Product updated) {
        if (id == null) throw new IllegalArgumentException("Product ID cannot be null");
        if (updated == null) throw new IllegalArgumentException("Updated product cannot be null");

        Product existing = productRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Product not found"));

        existing.setName(updated.getName());
        existing.setSize(updated.getSize());
        existing.setUnit(updated.getUnit());
        existing.setHsnCode(updated.getHsnCode());
        existing.setGst(updated.getGst());
        existing.setBrand(updated.getBrand());
        existing.setCategory(updated.getCategory());
        return productRepository.save(existing);
    }

    public void deleteProduct(Long id) {
        if (id == null) throw new IllegalArgumentException("Product ID cannot be null");
        Product existing = productRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Product not found"));
        existing.setActive(false);
        productRepository.save(existing);
    }
}
