package com.srilaxmi.erp.service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.entity.Customer;
import com.srilaxmi.erp.entity.Invoice;
import com.srilaxmi.erp.entity.Payment;
import com.srilaxmi.erp.entity.SalesOrder;
import com.srilaxmi.erp.repository.CustomerRepository;
import com.srilaxmi.erp.repository.InvoiceRepository;
import com.srilaxmi.erp.repository.PaymentRepository;
import com.srilaxmi.erp.repository.SalesOrderRepository;

@Service
public class CustomerService {

    @Autowired private CustomerRepository customerRepository;
    @Autowired private SalesOrderRepository salesOrderRepository;
    @Autowired private InvoiceRepository invoiceRepository;
    @Autowired private PaymentRepository paymentRepository;

    public Customer saveCustomer(Customer customer) {
        return customerRepository.save(customer);
    }

    public List<Customer> getCustomers() {
        return customerRepository.findByActiveTrue();
    }

    public Customer getCustomerById(Long id) {
        return customerRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Customer not found"));
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

    public Map<String, Object> getCustomerSummary(Long customerId) {
        Customer customer = getCustomerById(customerId);
        List<SalesOrder> orders = salesOrderRepository.findByCustomerIdAndActiveTrue(customerId);
        List<Invoice> invoices = invoiceRepository.findByCustomerIdAndActiveTrue(customerId);
        List<Payment> payments = paymentRepository.findByCustomerId(customerId);

        // Per-SO paid amounts (via invoices)
        Map<Long, BigDecimal> paidBySO = new HashMap<>();
        for (Invoice inv : invoices) {
            if (inv.getSalesOrder() != null) {
                BigDecimal paid = paymentRepository.sumByInvoiceId(inv.getId());
                paidBySO.merge(inv.getSalesOrder().getId(), paid, BigDecimal::add);
            }
        }

        List<Map<String, Object>> soList = orders.stream().map(so -> {
            BigDecimal effective = so.getEffectiveAmount() != null ? so.getEffectiveAmount() : BigDecimal.ZERO;
            BigDecimal paid = paidBySO.getOrDefault(so.getId(), BigDecimal.ZERO);
            BigDecimal balance = effective.subtract(paid);
            Map<String, Object> m = new HashMap<>();
            m.put("id", so.getId());
            m.put("orderNumber", so.getOrderNumber());
            m.put("orderDate", so.getOrderDate());
            m.put("status", so.getStatus());
            m.put("totalAmount", so.getTotalAmount());
            m.put("finalAmount", so.getFinalAmount());
            m.put("effectiveAmount", effective);
            m.put("paidAmount", paid);
            m.put("balance", balance);
            return m;
        }).collect(Collectors.toList());

        // Invoice list with paid amounts
        List<Map<String, Object>> invList = invoices.stream().map(inv -> {
            BigDecimal paid = paymentRepository.sumByInvoiceId(inv.getId());
            BigDecimal due = (inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO).subtract(paid);
            Map<String, Object> m = new HashMap<>();
            m.put("id", inv.getId());
            m.put("invoiceNumber", inv.getInvoiceNumber());
            m.put("invoiceDate", inv.getInvoiceDate());
            m.put("dueDate", inv.getDueDate());
            m.put("totalAmount", inv.getTotalAmount());
            m.put("paidAmount", paid);
            m.put("dueAmount", due);
            m.put("paymentStatus", inv.getPaymentStatus());
            m.put("soNumber", inv.getSalesOrder() != null ? inv.getSalesOrder().getOrderNumber() : null);
            return m;
        }).collect(Collectors.toList());

        BigDecimal grandOrdered = orders.stream()
            .map(so -> so.getEffectiveAmount() != null ? so.getEffectiveAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal grandPaid = paymentRepository.sumByCustomerId(customerId);
        BigDecimal grandBalance = grandOrdered.subtract(grandPaid);

        Map<String, Object> result = new HashMap<>();
        result.put("customer", customer);
        result.put("salesOrders", soList);
        result.put("invoices", invList);
        result.put("payments", payments);
        result.put("grandTotalOrdered", grandOrdered);
        result.put("grandTotalPaid", grandPaid);
        result.put("grandBalance", grandBalance);
        return result;
    }
}
