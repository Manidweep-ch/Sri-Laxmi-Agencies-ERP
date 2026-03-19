package com.srilaxmi.erp.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.entity.SalesReturn;
import com.srilaxmi.erp.service.SalesReturnService;

@RestController
@RequestMapping("/api/sales-returns")
public class SalesReturnController {

    @Autowired
    private SalesReturnService salesReturnService;

    @PostMapping
    public SalesReturn createReturn(@RequestBody SalesReturn salesReturn){
        return salesReturnService.saveReturn(salesReturn);
    }
    
    @GetMapping
    public List<SalesReturn> getAllReturns(){
        List<SalesReturn> returns = salesReturnService.getAllReturns();
        returns.forEach(r -> {
            if (r.getInvoice() != null && r.getInvoice().getCustomer() != null) {
                r.setCustomerName(r.getInvoice().getCustomer().getName());
            }
        });
        return returns;
    }
}