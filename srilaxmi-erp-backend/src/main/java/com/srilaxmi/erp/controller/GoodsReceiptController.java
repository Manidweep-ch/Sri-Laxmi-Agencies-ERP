package com.srilaxmi.erp.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.entity.GoodsReceipt;
import com.srilaxmi.erp.entity.GoodsReceiptItem;
import com.srilaxmi.erp.entity.PurchaseOrderItem;
import com.srilaxmi.erp.service.GoodsReceiptService;

@RestController
@RequestMapping("/api/grn")
public class GoodsReceiptController {

    @Autowired
    private GoodsReceiptService goodsReceiptService;

    @PostMapping
    public GoodsReceipt createGRN(@RequestBody GoodsReceipt grn) {
        return goodsReceiptService.saveGRN(grn);
    }

    @GetMapping
    public List<GoodsReceipt> getGRNs() {
        return goodsReceiptService.getAllGRN();
    }

    @GetMapping("/{id}")
    public GoodsReceipt getGRNById(@PathVariable Long id) {
        return goodsReceiptService.getGRNById(id);
    }

    @GetMapping("/{id}/items")
    public List<GoodsReceiptItem> getItems(@PathVariable Long id) {
        return goodsReceiptService.getItemsByGRN(id);
    }

    // Returns PO items for a given PO so frontend can pre-populate GRN lines
    @GetMapping("/po-items/{poId}")
    public List<PurchaseOrderItem> getPOItems(@PathVariable Long poId) {
        return goodsReceiptService.getPOItems(poId);
    }
}
