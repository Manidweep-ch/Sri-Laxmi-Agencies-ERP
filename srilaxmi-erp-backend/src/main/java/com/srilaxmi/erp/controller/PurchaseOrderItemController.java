package com.srilaxmi.erp.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.entity.PurchaseOrderItem;
import com.srilaxmi.erp.service.PurchaseOrderItemService;

@RestController
@RequestMapping("/api/po-items")
public class PurchaseOrderItemController {

    @Autowired
    private PurchaseOrderItemService purchaseOrderItemService;

    @PostMapping
    public PurchaseOrderItem addItem(@RequestBody PurchaseOrderItem item){
        return purchaseOrderItemService.saveItem(item);
    }
    
    @GetMapping("/order/{orderId}")
    public List<PurchaseOrderItem> getItemsByOrder(@PathVariable Long orderId){
        return purchaseOrderItemService.getItemsByOrder(orderId);
    }
}