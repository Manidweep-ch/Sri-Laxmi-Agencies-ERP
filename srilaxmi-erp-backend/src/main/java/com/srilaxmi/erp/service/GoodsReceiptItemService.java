package com.srilaxmi.erp.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.entity.GoodsReceiptItem;
import com.srilaxmi.erp.repository.GoodsReceiptItemRepository;

@Service
public class GoodsReceiptItemService {

    @Autowired
    private GoodsReceiptItemRepository goodsReceiptItemRepository;
    
    @Autowired
    private StockBatchService stockBatchServices; 

    public GoodsReceiptItem saveItem(GoodsReceiptItem item){
        GoodsReceiptItem savedItem = goodsReceiptItemRepository.save(item);
        stockBatchServices.addStock(item.getProduct(), item.getQuantity(), item.getPurchasePrice());
        return savedItem;
    }
    
    public List<GoodsReceiptItem> getItemsByGRN(Long grnId){
        return goodsReceiptItemRepository.findByGoodsReceiptId(grnId);
    }
}