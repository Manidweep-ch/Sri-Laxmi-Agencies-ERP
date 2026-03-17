package com.srilaxmi.erp.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    /**
     * Audit view — all GRNs with their items, supplier, PO number, date, and total value.
     * Used by the GRN audit/reporting page.
     */
    @GetMapping("/audit")
    public List<Map<String, Object>> getAuditList() {
        List<GoodsReceipt> grns = goodsReceiptService.getAllGRN();
        List<Map<String, Object>> result = new ArrayList<>();
        for (GoodsReceipt grn : grns) {
            List<GoodsReceiptItem> items = goodsReceiptService.getItemsByGRN(grn.getId());
            double totalValue = items.stream()
                .mapToDouble(i -> i.getQuantity() * i.getPurchasePrice())
                .sum();
            int totalQty = items.stream().mapToInt(GoodsReceiptItem::getQuantity).sum();

            List<Map<String, Object>> itemList = new ArrayList<>();
            for (GoodsReceiptItem item : items) {
                Map<String, Object> im = new HashMap<>();
                im.put("productId",   item.getProduct() != null ? item.getProduct().getId() : null);
                im.put("productName", item.getProduct() != null ? item.getProduct().getName() : "-");
                im.put("quantity",    item.getQuantity());
                im.put("purchasePrice", item.getPurchasePrice());
                im.put("lineValue",   item.getQuantity() * item.getPurchasePrice());
                itemList.add(im);
            }

            Map<String, Object> row = new HashMap<>();
            row.put("id",           grn.getId());
            row.put("receiptDate",  grn.getReceiptDate());
            row.put("invoiceNumber", grn.getInvoiceNumber());
            row.put("supplierName", grn.getPurchaseOrder() != null && grn.getPurchaseOrder().getSupplier() != null
                ? grn.getPurchaseOrder().getSupplier().getName() : "-");
            row.put("poNumber",     grn.getPurchaseOrder() != null ? grn.getPurchaseOrder().getPoNumber() : "-");
            row.put("totalQty",     totalQty);
            row.put("totalValue",   totalValue);
            row.put("items",        itemList);
            result.add(row);
        }
        return result;
    }
}
