package com.srilaxmi.erp.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.entity.InvoiceItem;
import com.srilaxmi.erp.service.InvoiceItemService;

@RestController
@RequestMapping("/api/invoice-items")
public class InvoiceItemController {

    @Autowired
    private InvoiceItemService invoiceItemService;

    @PostMapping
    public InvoiceItem addItem(@RequestBody InvoiceItem item){
        return invoiceItemService.saveItem(item);
    }
    
    @GetMapping("/invoice/{invoiceId}")
    public List<InvoiceItem> getItemsByInvoice(@PathVariable Long invoiceId){
        return invoiceItemService.getItemsByInvoice(invoiceId);
    }
}