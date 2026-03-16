package com.srilaxmi.erp.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.entity.GoodsReceiptItem;
import com.srilaxmi.erp.service.GoodsReceiptItemService;

@RestController
@RequestMapping("/api/grn-items")
public class GoodsReceiptItemController {

    @Autowired
    private GoodsReceiptItemService goodsReceiptItemService;

    @PostMapping
    public GoodsReceiptItem addItem(@RequestBody GoodsReceiptItem item){
        return goodsReceiptItemService.saveItem(item);
    }
    
    @GetMapping("/grn/{grnId}")
    public List<GoodsReceiptItem> getGRNItems(@PathVariable Long grnId){
        return goodsReceiptItemService.getItemsByGRN(grnId);
    }
}