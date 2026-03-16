package com.srilaxmi.erp.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.entity.SalesOrderItem;
import com.srilaxmi.erp.service.SalesOrderItemService;

@RestController
@RequestMapping("/api/sales-order-items")
public class SalesOrderItemController {

    @Autowired
    private SalesOrderItemService salesOrderItemService;

    @PostMapping
    public SalesOrderItem addItem(@RequestBody SalesOrderItem item){
        return salesOrderItemService.saveItem(item);
    }
    
    @GetMapping("/order/{orderId}")
    public List<SalesOrderItem> getItemsByOrder(@PathVariable Long orderId){
        return salesOrderItemService.getItemsByOrder(orderId);
    }
}