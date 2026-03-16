package com.srilaxmi.erp.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.entity.Customer;
import com.srilaxmi.erp.repository.CustomerRepository;

@Service
public class CustomerService {

    @Autowired
    private CustomerRepository customerRepository;

    public Customer saveCustomer(Customer customer) {
        return customerRepository.save(customer);
    }

    public List<Customer> getCustomers() {
        return customerRepository.findByActiveTrue();
    }

    public Customer updateCustomer(Long id, Customer updated) {
        Customer existing = customerRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Customer not found"));
        existing.setName(updated.getName());
        existing.setPhone(updated.getPhone());
        existing.setAddress(updated.getAddress());
        existing.setGstNumber(updated.getGstNumber());
        return customerRepository.save(existing);
    }

    public void deleteCustomer(Long id) {
        Customer existing = customerRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Customer not found"));
        existing.setActive(false);
        customerRepository.save(existing);
    }
}
