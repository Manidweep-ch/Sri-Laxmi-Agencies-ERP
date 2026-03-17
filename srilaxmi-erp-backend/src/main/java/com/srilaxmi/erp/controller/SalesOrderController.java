package com.srilaxmi.erp.controller;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.dto.OutstandingResponse;
import com.srilaxmi.erp.entity.Invoice;
import com.srilaxmi.erp.entity.SalesOrder;
import com.srilaxmi.erp.entity.SalesOrderItem;
import com.srilaxmi.erp.entity.SalesOrderStatus;
import com.srilaxmi.erp.repository.InvoiceRepository;
import com.srilaxmi.erp.service.PaymentService;
import com.srilaxmi.erp.service.SalesOrderService;

@RestController
@RequestMapping("/api/sales-orders")
public class SalesOrderController {

    @Autowired private SalesOrderService salesOrderService;
    @Autowired private InvoiceRepository invoiceRepository;
    @Autowired private PaymentService paymentService;

    @PostMapping
    public SalesOrder createOrder(@RequestBody SalesOrder order) {
        return salesOrderService.saveOrder(order);
    }

    @GetMapping
    public List<SalesOrder> getOrders() {
        return salesOrderService.getOrders();
    }

    @GetMapping("/{id}")
    public SalesOrder getOrderById(@PathVariable Long id) {
        return salesOrderService.getOrderById(id)
            .orElseThrow(() -> new RuntimeException("Sales Order not found"));
    }

    @GetMapping("/{id}/items")
    public List<SalesOrderItem> getItems(@PathVariable Long id) {
        return salesOrderService.getItemsByOrder(id);
    }

    @PutMapping("/{id}/status")
    public SalesOrder updateOrderStatus(@PathVariable Long id, @RequestBody SalesOrderStatus status) {
        return salesOrderService.updateStatus(id, status);
    }

    @DeleteMapping("/{id}")
    public void deleteOrder(@PathVariable Long id) {
        salesOrderService.deleteOrder(id);
    }

    @PutMapping("/{id}/final-amount")
    public SalesOrder updateFinalAmount(@PathVariable Long id, @RequestBody(required = false) BigDecimal finalAmount) {
        return salesOrderService.updateFinalAmount(id, finalAmount);
    }

    @PostMapping("/{id}/items")
    public SalesOrder addItem(@PathVariable Long id, @RequestBody SalesOrderItem item) {
        return salesOrderService.addItem(id, item);
    }

    @DeleteMapping("/{id}/items/{itemId}")
    public SalesOrder removeItem(@PathVariable Long id, @PathVariable Long itemId) {
        return salesOrderService.removeItem(id, itemId);
    }

    /**
     * Summary for a single SO — invoice info, outstanding, payment history.
     */
    @GetMapping("/{id}/summary")
    public Map<String, Object> getSOSummary(@PathVariable Long id) {
        SalesOrder order = salesOrderService.getOrderById(id)
            .orElseThrow(() -> new RuntimeException("Sales Order not found"));

        // Find invoice linked to this SO
        Invoice invoice = invoiceRepository.findAll().stream()
            .filter(inv -> inv.isActive() && inv.getSalesOrder() != null && inv.getSalesOrder().getId().equals(id))
            .findFirst().orElse(null);

        Map<String, Object> result = new HashMap<>();
        result.put("order", order);

        if (invoice != null) {
            OutstandingResponse outstanding = paymentService.getOutstanding(invoice.getId());
            result.put("invoiceId",     invoice.getId());
            result.put("invoiceNumber", invoice.getInvoiceNumber());
            result.put("invoiceDate",   invoice.getInvoiceDate());
            result.put("totalAmount",   invoice.getTotalAmount());
            result.put("paidAmount",    outstanding.getPaidAmount());
            result.put("balanceDue",    outstanding.getOutstandingAmount().max(BigDecimal.ZERO));
            result.put("paymentStatus", invoice.getPaymentStatus());
            result.put("payments",      paymentService.getPaymentsByInvoice(invoice.getId()));
        } else {
            result.put("invoiceId",     null);
            result.put("invoiceNumber", null);
            result.put("totalAmount",   order.getTotalAmount());
            result.put("paidAmount",    BigDecimal.ZERO);
            result.put("balanceDue",    order.getTotalAmount());
            result.put("paymentStatus", null);
            result.put("payments",      List.of());
        }
        return result;
    }
}
