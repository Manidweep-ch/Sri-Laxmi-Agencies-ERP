package com.srilaxmi.erp.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.entity.SalesReturnItem;
import com.srilaxmi.erp.service.SalesReturnItemService;

@RestController
@RequestMapping("/api/sales-return-items")
public class SalesReturnItemController {

    @Autowired
    private SalesReturnItemService salesReturnItemService;

    @PostMapping
    public SalesReturnItem addItem(@RequestBody SalesReturnItem item){
        return salesReturnItemService.saveItem(item);
    }
    
    @GetMapping("/return/{returnId}")
    public List<SalesReturnItem> getItemsByReturn(@PathVariable Long returnId){
        return salesReturnItemService.getItemsByReturn(returnId);
    }
}