package com.srilaxmi.erp.controller;

import java.util.List;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.entity.GoodsReceipt;
import com.srilaxmi.erp.entity.PurchaseOrder;
import com.srilaxmi.erp.entity.PurchaseOrderItem;
import com.srilaxmi.erp.entity.PurchaseOrderStatus;
import com.srilaxmi.erp.service.GoodsReceiptService;
import com.srilaxmi.erp.service.PurchaseOrderService;
import com.srilaxmi.erp.service.SupplierPaymentService;

@RestController
@RequestMapping("/api/purchase-orders")
public class PurchaseOrderController {

    @Autowired private PurchaseOrderService purchaseOrderService;
    @Autowired private GoodsReceiptService goodsReceiptService;
    @Autowired private SupplierPaymentService supplierPaymentService;

    @PostMapping
    public PurchaseOrder createPO(@RequestBody PurchaseOrder po) {
        return purchaseOrderService.createPO(po);
    }

    @GetMapping
    public List<PurchaseOrder> getPOs() {
        return purchaseOrderService.getAllPO();
    }

    @GetMapping("/{id}")
    public PurchaseOrder getPOById(@PathVariable Long id) {
        return purchaseOrderService.getPOById(id);
    }

    @GetMapping("/{id}/items")
    public List<PurchaseOrderItem> getItems(@PathVariable Long id) {
        return purchaseOrderService.getItemsByPO(id);
    }

    @PostMapping("/{id}/items")
    public PurchaseOrder addItem(@PathVariable Long id, @RequestBody PurchaseOrderItem item) {
        return purchaseOrderService.addItem(id, item);
    }

    @PutMapping("/{id}/items/{itemId}")
    public PurchaseOrder updateItem(@PathVariable Long id, @PathVariable Long itemId, @RequestBody PurchaseOrderItem item) {
        return purchaseOrderService.updateItem(id, itemId, item);
    }

    @DeleteMapping("/{id}/items/{itemId}")
    public PurchaseOrder removeItem(@PathVariable Long id, @PathVariable Long itemId) {
        return purchaseOrderService.removeItem(id, itemId);
    }

    @DeleteMapping("/{id}")
    public void deletePO(@PathVariable Long id) {
        purchaseOrderService.deletePO(id);
    }

    @PutMapping("/{id}/status")
    public PurchaseOrder updateStatus(@PathVariable Long id, @RequestBody PurchaseOrderStatus status) {
        return purchaseOrderService.updateStatus(id, status);
    }

    // Receive stock against this PO — creates a GRN inline
    @PostMapping("/{id}/receive")
    public GoodsReceipt receiveStock(@PathVariable Long id, @RequestBody GoodsReceipt grn) {
        PurchaseOrder po = purchaseOrderService.getPOById(id);
        grn.setPurchaseOrder(po);
        return goodsReceiptService.saveGRN(grn);
    }

    // Get all GRNs for this PO
    @GetMapping("/{id}/grns")
    public List<GoodsReceipt> getGRNsForPO(@PathVariable Long id) {
        return goodsReceiptService.getGRNsByPO(id);
    }

    /**
     * Summary for the Pay page:
     * - poTotal: original PO grand total
     * - receivedValue: value of goods actually received (with GST)
     * - totalPaid: sum of all supplier payments
     * - balanceDue: receivedValue - totalPaid
     * - grnHistory: all GRN entries for this PO
     * - paymentHistory: all payments made
     */
    @GetMapping("/{id}/payment-summary")
    public Map<String, Object> getPaymentSummary(@PathVariable Long id) {
        PurchaseOrder po = purchaseOrderService.getPOById(id);
        BigDecimal receivedValue = purchaseOrderService.getReceivedValue(id);
        BigDecimal totalPaid = supplierPaymentService.getTotalPaid(id);
        BigDecimal balanceDue = receivedValue.subtract(totalPaid);

        Map<String, Object> summary = new HashMap<>();
        summary.put("poNumber", po.getPoNumber());
        summary.put("poTotal", po.getTotalAmount());
        summary.put("receivedValue", receivedValue);
        summary.put("totalPaid", totalPaid);
        summary.put("balanceDue", balanceDue.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : balanceDue);
        summary.put("grnHistory", goodsReceiptService.getGRNsByPO(id));
        summary.put("paymentHistory", supplierPaymentService.getPaymentsByPO(id));
        return summary;
    }
}
