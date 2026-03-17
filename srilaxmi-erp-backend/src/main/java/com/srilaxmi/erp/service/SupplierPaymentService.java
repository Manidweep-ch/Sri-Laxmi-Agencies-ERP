package com.srilaxmi.erp.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.srilaxmi.erp.entity.PurchaseOrder;
import com.srilaxmi.erp.entity.SupplierPayment;
import com.srilaxmi.erp.repository.PurchaseOrderRepository;
import com.srilaxmi.erp.repository.SupplierPaymentRepository;

@Service
public class SupplierPaymentService {

    @Autowired private SupplierPaymentRepository supplierPaymentRepository;
    @Autowired private PurchaseOrderRepository purchaseOrderRepository;
    @Autowired private PurchaseOrderService purchaseOrderService;

    @Transactional
    public SupplierPayment recordPayment(Long poId, SupplierPayment payment) {
        if (poId == null) throw new IllegalArgumentException("PO ID cannot be null");
        if (payment == null || payment.getAmount() == null || payment.getAmount().compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("Payment amount must be greater than zero");

        PurchaseOrder po = purchaseOrderRepository.findById(poId)
            .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        // Payment is capped at received goods value, not original PO total
        BigDecimal receivedValue = purchaseOrderService.getReceivedValue(poId);
        BigDecimal totalPaid = supplierPaymentRepository.sumByPurchaseOrderId(poId);
        BigDecimal due = receivedValue.subtract(totalPaid);

        if (due.compareTo(BigDecimal.ZERO) <= 0)
            throw new RuntimeException("No outstanding amount — all received goods have been paid for.");

        if (payment.getAmount().compareTo(due) > 0)
            throw new RuntimeException("Payment of ₹" + payment.getAmount() + " exceeds outstanding amount of ₹" + due);

        payment.setPurchaseOrder(po);
        return supplierPaymentRepository.save(payment);
    }

    public List<SupplierPayment> getPaymentsByPO(Long poId) {
        return supplierPaymentRepository.findByPurchaseOrderId(poId);
    }

    public BigDecimal getTotalPaid(Long poId) {
        return supplierPaymentRepository.sumByPurchaseOrderId(poId);
    }
}
