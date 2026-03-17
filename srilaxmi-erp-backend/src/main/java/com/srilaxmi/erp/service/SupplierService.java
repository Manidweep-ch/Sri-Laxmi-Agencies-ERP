package com.srilaxmi.erp.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.entity.Supplier;
import com.srilaxmi.erp.repository.SupplierRepository;

@Service
public class SupplierService {

    @Autowired
    private SupplierRepository supplierRepository;

    @SuppressWarnings("null")
	public Supplier saveSupplier(Supplier supplier) {
        return supplierRepository.save(supplier);
    }

    public List<Supplier> getSuppliers() {
        return supplierRepository.findByActiveTrue();
    }

    public Supplier getSupplierById(Long id) {
        return supplierRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Supplier not found: " + id));
    }

    public Supplier updateSupplier(Long id, Supplier updated) {
        @SuppressWarnings("null")
		Supplier existing = supplierRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Supplier not found"));
        existing.setName(updated.getName());
        existing.setPhone(updated.getPhone());
        existing.setAddress(updated.getAddress());
        existing.setGstNumber(updated.getGstNumber());
        return supplierRepository.save(existing);
    }

    public void deleteSupplier(Long id) {
        @SuppressWarnings("null")
		Supplier existing = supplierRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Supplier not found"));
        existing.setActive(false);
        supplierRepository.save(existing);
    }
}
