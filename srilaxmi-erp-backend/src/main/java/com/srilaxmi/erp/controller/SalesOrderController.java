package com.srilaxmi.erp.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.entity.SalesOrder;
import com.srilaxmi.erp.entity.SalesOrderItem;
import com.srilaxmi.erp.entity.SalesOrderStatus;
import com.srilaxmi.erp.service.SalesOrderService;

@RestController
@RequestMapping("/api/sales-orders")
public class SalesOrderController {

    @Autowired
    private SalesOrderService salesOrderService;

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

    @PostMapping("/{id}/items")
    public SalesOrder addItem(@PathVariable Long id, @RequestBody SalesOrderItem item) {
        return salesOrderService.addItem(id, item);
    }

    @DeleteMapping("/{id}/items/{itemId}")
    public SalesOrder removeItem(@PathVariable Long id, @PathVariable Long itemId) {
        return salesOrderService.removeItem(id, itemId);
    }
}
