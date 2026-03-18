package com.srilaxmi.erp.controller;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.entity.PurchaseOrder;
import com.srilaxmi.erp.entity.PurchaseOrderItem;
import com.srilaxmi.erp.entity.Supplier;
import com.srilaxmi.erp.entity.SupplierPayment;
import com.srilaxmi.erp.repository.PurchaseOrderRepository;
import com.srilaxmi.erp.repository.SupplierPaymentRepository;
import com.srilaxmi.erp.service.PurchaseOrderService;
import com.srilaxmi.erp.service.SupplierService;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    @Autowired private SupplierService supplierService;
    @Autowired private PurchaseOrderRepository purchaseOrderRepository;
    @Autowired private SupplierPaymentRepository supplierPaymentRepository;
    @Autowired private PurchaseOrderService purchaseOrderService;

    @PostMapping
    public Supplier addSupplier(@RequestBody Supplier supplier) {
        return supplierService.saveSupplier(supplier);
    }

    @GetMapping
    public List<Supplier> getSuppliers() {
        return supplierService.getSuppliers();
    }

    @PutMapping("/{id}")
    public Supplier updateSupplier(@PathVariable Long id, @RequestBody Supplier supplier) {
        return supplierService.updateSupplier(id, supplier);
    }

    @DeleteMapping("/{id}")
    public void deleteSupplier(@PathVariable Long id) {
        supplierService.deleteSupplier(id);
    }

    /**
     * Full supplier summary:
     * - supplier details
     * - all POs with status, total, paid, balance
     * - all payments
     * - grand totals: totalOrdered, totalReceived, totalPaid, totalBalance
     */
    @GetMapping("/{id}/summary")
    public Map<String, Object> getSupplierSummary(@PathVariable Long id) {
        Supplier supplier = supplierService.getSupplierById(id);
        List<PurchaseOrder> pos = purchaseOrderRepository.findBySupplierId(id);

        BigDecimal grandTotalOrdered  = BigDecimal.ZERO;
        BigDecimal grandTotalReceived = BigDecimal.ZERO;
        BigDecimal grandTotalPaid     = BigDecimal.ZERO;

        List<Map<String, Object>> poList = new ArrayList<>();
        for (PurchaseOrder po : pos) {
            BigDecimal poTotal       = po.getTotalAmount() != null ? po.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal receivedValue = purchaseOrderService.getReceivedValue(po.getId());
            BigDecimal paid          = supplierPaymentRepository.sumByPurchaseOrderId(po.getId());
            BigDecimal balance       = receivedValue.subtract(paid);
            if (balance.compareTo(BigDecimal.ZERO) < 0) balance = BigDecimal.ZERO;

            grandTotalOrdered  = grandTotalOrdered.add(poTotal);
            grandTotalReceived = grandTotalReceived.add(receivedValue);
            grandTotalPaid     = grandTotalPaid.add(paid);

            Map<String, Object> row = new HashMap<>();
            row.put("id",            po.getId());
            row.put("poNumber",      po.getPoNumber());
            row.put("orderDate",     po.getOrderDate());
            row.put("status",        po.getStatus());
            row.put("poTotal",       poTotal);
            row.put("receivedValue", receivedValue);
            row.put("totalPaid",     paid);
            row.put("balance",       balance);
            poList.add(row);
        }

        BigDecimal grandBalance = grandTotalReceived.subtract(grandTotalPaid);
        if (grandBalance.compareTo(BigDecimal.ZERO) < 0) grandBalance = BigDecimal.ZERO;

        List<SupplierPayment> payments = supplierPaymentRepository.findBySupplierId(id);

        Map<String, Object> result = new HashMap<>();
        result.put("supplier",           supplier);
        result.put("purchaseOrders",     poList);
        result.put("payments",           payments);
        result.put("grandTotalOrdered",  grandTotalOrdered);
        result.put("grandTotalReceived", grandTotalReceived);
        result.put("grandTotalPaid",     grandTotalPaid);
        result.put("grandBalance",       grandBalance);
        return result;
    }
}
