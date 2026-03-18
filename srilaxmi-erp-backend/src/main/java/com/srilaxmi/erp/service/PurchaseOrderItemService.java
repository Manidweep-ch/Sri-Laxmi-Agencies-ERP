package com.srilaxmi.erp.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.entity.PurchaseOrderItem;
import com.srilaxmi.erp.repository.PurchaseOrderItemRepository;

@Service
public class PurchaseOrderItemService {

    @Autowired
    private PurchaseOrderItemRepository purchaseOrderItemRepository;

    @SuppressWarnings("null")
	public PurchaseOrderItem saveItem(PurchaseOrderItem item){
        return purchaseOrderItemRepository.save(item);
    }
    
    public List<PurchaseOrderItem> getItemsByOrder(Long orderId){
        return purchaseOrderItemRepository.findByPurchaseOrderId(orderId);
    }
}