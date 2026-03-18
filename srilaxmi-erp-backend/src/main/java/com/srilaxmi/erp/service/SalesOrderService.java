package com.srilaxmi.erp.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.srilaxmi.erp.entity.Customer;
import com.srilaxmi.erp.entity.Product;
import com.srilaxmi.erp.entity.SalesOrder;
import com.srilaxmi.erp.entity.SalesOrderItem;
import com.srilaxmi.erp.entity.SalesOrderStatus;
import com.srilaxmi.erp.entity.Staff;
import com.srilaxmi.erp.repository.CustomerRepository;
import com.srilaxmi.erp.repository.ProductRepository;
import com.srilaxmi.erp.repository.SalesOrderItemRepository;
import com.srilaxmi.erp.repository.SalesOrderRepository;
import com.srilaxmi.erp.repository.StaffRepository;

@Service
public class SalesOrderService {

    @Autowired private SalesOrderRepository salesOrderRepository;
    @Autowired private SalesOrderItemRepository salesOrderItemRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private StockBatchService stockBatchService;
    @Autowired private StaffRepository staffRepository;

    @Transactional
    public SalesOrder saveOrder(SalesOrder order) {
        if (order == null) throw new IllegalArgumentException("Sales Order cannot be null");

        // Resolve customer
        if (order.getCustomer() != null && order.getCustomer().getId() != null) {
            Customer customer = customerRepository.findById(order.getCustomer().getId())
                .orElseThrow(() -> new RuntimeException("Customer not found"));
            order.setCustomer(customer);
        }

        order.setOrderNumber("SO-" + System.currentTimeMillis());
        order.setOrderDate(LocalDate.now());
        order.setStatus(SalesOrderStatus.DRAFT);

        // Stamp who created this order
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        order.setCreatedBy(username);

        // Resolve createdByStaff if provided
        if (order.getCreatedByStaff() != null && order.getCreatedByStaff().getId() != null) {
            staffRepository.findById(order.getCreatedByStaff().getId())
                .ifPresent(order::setCreatedByStaff);
        }

        List<SalesOrderItem> items = order.getItems();
        order.setItems(null);

        SalesOrder saved = salesOrderRepository.save(order);

        BigDecimal subTotal = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;

        if (items != null) {
            for (SalesOrderItem item : items) {
                if (item.getProduct() == null || item.getProduct().getId() == null)
                    throw new IllegalArgumentException("Each item must have a valid product");
                if (item.getPrice() == null)
                    throw new IllegalArgumentException("Item price cannot be null");

                Product product = productRepository.findById(item.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProduct().getId()));
                item.setProduct(product);
                item.setSalesOrder(saved);

                BigDecimal lineTotal = item.getPrice().multiply(new BigDecimal(item.getQuantity()));
                BigDecimal lineTax = lineTotal.multiply(BigDecimal.valueOf(product.getGst() / 100.0));
                subTotal = subTotal.add(lineTotal);
                totalTax = totalTax.add(lineTax);

                salesOrderItemRepository.save(item);
            }
        }

        saved.setSubTotal(subTotal);
        saved.setTax(totalTax);
        saved.setTotalAmount(subTotal.add(totalTax));

        // Store finalAmount separately if provided — totalAmount stays as calculated
        if (order.getFinalAmount() != null && order.getFinalAmount().compareTo(BigDecimal.ZERO) > 0) {
            saved.setFinalAmount(order.getFinalAmount());
        }

        return salesOrderRepository.save(saved);
    }

    public List<SalesOrder> getOrders() {
        return salesOrderRepository.findByActiveTrue();
    }

    public Optional<SalesOrder> getOrderById(Long id) {
        if (id == null) throw new IllegalArgumentException("ID cannot be null");
        return salesOrderRepository.findById(id);
    }

    public List<SalesOrderItem> getItemsByOrder(Long orderId) {
        if (orderId == null) throw new IllegalArgumentException("Order ID cannot be null");
        return salesOrderItemRepository.findBySalesOrderId(orderId);
    }

    @Transactional
    public void deleteOrder(Long id) {
        SalesOrder order = salesOrderRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Sales Order not found"));
        if (order.getStatus() == SalesOrderStatus.INVOICED)
            throw new IllegalStateException("Cannot delete an invoiced order");
        order.setActive(false);
        salesOrderRepository.save(order);
    }

    @Transactional
    public SalesOrder updateFinalAmount(Long id, BigDecimal finalAmount) {
        SalesOrder order = salesOrderRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Sales Order not found"));
        order.setFinalAmount(finalAmount);
        return salesOrderRepository.save(order);
    }

    @Transactional
    public SalesOrder addItem(Long orderId, SalesOrderItem item) {
        SalesOrder order = salesOrderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Sales Order not found"));
        if (order.getStatus() == SalesOrderStatus.INVOICED || order.getStatus() == SalesOrderStatus.SHIPPED)
            throw new IllegalStateException("Cannot modify an invoiced or shipped order");
        Product product = productRepository.findById(item.getProduct().getId())
            .orElseThrow(() -> new RuntimeException("Product not found"));
        item.setProduct(product);
        item.setSalesOrder(order);
        salesOrderItemRepository.save(item);
        return recalculate(order);
    }

    @Transactional
    public SalesOrder removeItem(Long orderId, Long itemId) {
        SalesOrder order = salesOrderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Sales Order not found"));
        if (order.getStatus() == SalesOrderStatus.INVOICED || order.getStatus() == SalesOrderStatus.SHIPPED)
            throw new IllegalStateException("Cannot modify an invoiced or shipped order");
        salesOrderItemRepository.deleteById(itemId);
        return recalculate(order);
    }

    private SalesOrder recalculate(SalesOrder order) {
        List<SalesOrderItem> items = salesOrderItemRepository.findBySalesOrderId(order.getId());
        BigDecimal sub = BigDecimal.ZERO, tax = BigDecimal.ZERO;
        for (SalesOrderItem item : items) {
            if (item.getPrice() == null) continue;
            BigDecimal line = item.getPrice().multiply(new BigDecimal(item.getQuantity()));
            double gst = item.getProduct() != null ? item.getProduct().getGst() : 0;
            sub = sub.add(line);
            tax = tax.add(line.multiply(BigDecimal.valueOf(gst / 100.0)));
        }
        order.setSubTotal(sub);
        order.setTax(tax);
        order.setTotalAmount(sub.add(tax));
        return salesOrderRepository.save(order);
    }

    @Transactional
    public SalesOrder updateStatus(Long id, SalesOrderStatus newStatus) {
        if (id == null) throw new IllegalArgumentException("Sales Order ID cannot be null");
        if (newStatus == null) throw new IllegalArgumentException("Status cannot be null");

        SalesOrder order = salesOrderRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Sales Order not found"));

        if (order.getStatus() == SalesOrderStatus.CANCELLED || order.getStatus() == SalesOrderStatus.INVOICED) {
            // Allow SHIPPED from INVOICED (goods sent after invoice)
            if (!(order.getStatus() == SalesOrderStatus.INVOICED && newStatus == SalesOrderStatus.SHIPPED)) {
                throw new IllegalStateException("Cannot change status of a cancelled or fully invoiced order.");
            }
        }

        // When confirming, check stock availability as a pre-check
        if (newStatus == SalesOrderStatus.CONFIRMED) {
            List<SalesOrderItem> items = salesOrderItemRepository.findBySalesOrderId(id);
            if (items == null || items.isEmpty())
                throw new IllegalStateException("Cannot confirm an order with no items");
            for (SalesOrderItem item : items) {
                if (item.getProduct() == null)
                    throw new IllegalStateException("Item has no product");
                if (!stockBatchService.isStockAvailable(item.getProduct().getId(), item.getQuantity())) {
                    throw new IllegalStateException("Not enough stock for: " + item.getProduct().getName());
                }
            }
        }

        // SHIPPED means goods have been sent — allowed from INVOICED only
        if (newStatus == SalesOrderStatus.SHIPPED && order.getStatus() != SalesOrderStatus.INVOICED) {
            throw new IllegalStateException("Goods can only be marked as sent after invoice is generated.");
        }

        order.setStatus(newStatus);
        return salesOrderRepository.save(order);
    }
}
