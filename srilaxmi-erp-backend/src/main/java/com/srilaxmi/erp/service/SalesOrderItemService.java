package com.srilaxmi.erp.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.entity.SalesOrderItem;
import com.srilaxmi.erp.repository.SalesOrderItemRepository;

@Service
public class SalesOrderItemService {

    @Autowired
    private SalesOrderItemRepository salesOrderItemRepository;

    @SuppressWarnings("null")
	public SalesOrderItem saveItem(SalesOrderItem item){
        return salesOrderItemRepository.save(item);
    }
    
    public List<SalesOrderItem> getItemsByOrder(Long orderId){
        return salesOrderItemRepository.findBySalesOrderId(orderId);
    }
}