package com.srilaxmi.erp.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.entity.*;
import com.srilaxmi.erp.repository.*;

@Service
public class SalesReturnItemService {

    @Autowired
    private SalesReturnItemRepository salesReturnItemRepository;

    @Autowired
    private StockBatchService stockBatchService;

    @org.springframework.transaction.annotation.Transactional
    public SalesReturnItem saveItem(SalesReturnItem item){

        BigDecimal total = item.getUnitPrice().multiply(new BigDecimal(item.getQuantity()));
        item.setTotalAmount(total);

        SalesReturnItem savedItem = salesReturnItemRepository.save(item);

        // Restore stock
        stockBatchService.addStock(
                item.getProduct(),
                item.getQuantity(),
                item.getUnitPrice().doubleValue()
        );

        return savedItem;
    }
    
    public List<SalesReturnItem> getItemsByReturn(Long returnId){
        return salesReturnItemRepository.findBySalesReturnId(returnId);
    }
}