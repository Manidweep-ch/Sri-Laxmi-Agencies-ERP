package com.srilaxmi.erp.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.srilaxmi.erp.entity.Product;
import com.srilaxmi.erp.entity.PurchaseOrder;
import com.srilaxmi.erp.entity.PurchaseOrderItem;
import com.srilaxmi.erp.entity.PurchaseOrderStatus;
import com.srilaxmi.erp.entity.Supplier;
import com.srilaxmi.erp.repository.ProductRepository;
import com.srilaxmi.erp.repository.PurchaseOrderItemRepository;
import com.srilaxmi.erp.repository.PurchaseOrderRepository;
import com.srilaxmi.erp.repository.SupplierRepository;

@Service
public class PurchaseOrderService {

    @Autowired private PurchaseOrderRepository purchaseOrderRepository;
    @Autowired private PurchaseOrderItemRepository purchaseOrderItemRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private com.srilaxmi.erp.repository.SupplierPaymentRepository supplierPaymentRepository;

    @Transactional
    public PurchaseOrder createPO(PurchaseOrder po) {
        if (po == null) throw new IllegalArgumentException("Purchase Order cannot be null");

        // Resolve supplier
        if (po.getSupplier() != null && po.getSupplier().getId() != null) {
            @SuppressWarnings("null")
			Supplier supplier = supplierRepository.findById(po.getSupplier().getId())
                .orElseThrow(() -> new RuntimeException("Supplier not found"));
            po.setSupplier(supplier);
        }

        po.setPoNumber("PO-" + System.currentTimeMillis());
        po.setOrderDate(LocalDate.now());
        po.setStatus(PurchaseOrderStatus.DRAFT);

        List<PurchaseOrderItem> items = po.getItems();
        po.setItems(null);

        PurchaseOrder saved = purchaseOrderRepository.save(po);

        BigDecimal subTotal = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;

        if (items != null) {
            for (PurchaseOrderItem item : items) {
                if (item.getProduct() == null || item.getProduct().getId() == null)
                    throw new IllegalArgumentException("Each item must have a valid product");
                if (item.getPrice() == null)
                    throw new IllegalArgumentException("Item price cannot be null");

                @SuppressWarnings("null")
				Product product = productRepository.findById(item.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProduct().getId()));
                item.setProduct(product);
                item.setPurchaseOrder(saved);

                BigDecimal lineTotal = item.getPrice().multiply(new BigDecimal(item.getQuantity()));
                BigDecimal lineTax = lineTotal.multiply(BigDecimal.valueOf(product.getGst() / 100.0));
                subTotal = subTotal.add(lineTotal);
                totalTax = totalTax.add(lineTax);

                purchaseOrderItemRepository.save(item);
            }
        }

        saved.setSubTotal(subTotal);
        saved.setTax(totalTax);
        saved.setTotalAmount(subTotal.add(totalTax));
        return purchaseOrderRepository.save(saved);
    }

    @Transactional
    public PurchaseOrder addItem(Long poId, PurchaseOrderItem item) {
        if (poId == null) throw new IllegalArgumentException("PO ID cannot be null");
        if (item == null || item.getProduct() == null || item.getProduct().getId() == null)
            throw new IllegalArgumentException("Item must have a valid product");
        if (item.getPrice() == null)
            throw new IllegalArgumentException("Item price cannot be null");

        PurchaseOrder po = getPOById(poId);
        @SuppressWarnings("null")
		Product product = productRepository.findById(item.getProduct().getId())
            .orElseThrow(() -> new RuntimeException("Product not found"));
        item.setProduct(product);
        item.setPurchaseOrder(po);
        purchaseOrderItemRepository.save(item);
        return recalculate(po);
    }

    @Transactional
    public PurchaseOrder updateItem(Long poId, Long itemId, PurchaseOrderItem updated) {
        if (poId == null || itemId == null) throw new IllegalArgumentException("IDs cannot be null");
        if (updated == null) throw new IllegalArgumentException("Updated item cannot be null");

        PurchaseOrderItem item = purchaseOrderItemRepository.findById(itemId)
            .orElseThrow(() -> new RuntimeException("Item not found"));
        item.setQuantity(updated.getQuantity());
        if (updated.getPrice() != null) item.setPrice(updated.getPrice());
        purchaseOrderItemRepository.save(item);
        return recalculate(getPOById(poId));
    }

    @Transactional
    public PurchaseOrder removeItem(Long poId, Long itemId) {
        if (poId == null || itemId == null) throw new IllegalArgumentException("IDs cannot be null");
        purchaseOrderItemRepository.deleteById(itemId);
        return recalculate(getPOById(poId));
    }

    private PurchaseOrder recalculate(PurchaseOrder po) {
        List<PurchaseOrderItem> items = purchaseOrderItemRepository.findByPurchaseOrderId(po.getId());
        BigDecimal subTotal = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;
        for (PurchaseOrderItem item : items) {
            if (item.getPrice() == null) continue;
            BigDecimal lineTotal = item.getPrice().multiply(new BigDecimal(item.getQuantity()));
            double gst = item.getProduct() != null ? item.getProduct().getGst() : 0.0;
            BigDecimal lineTax = lineTotal.multiply(BigDecimal.valueOf(gst / 100.0));
            subTotal = subTotal.add(lineTotal);
            totalTax = totalTax.add(lineTax);
        }
        po.setSubTotal(subTotal);
        po.setTax(totalTax);
        po.setTotalAmount(subTotal.add(totalTax));
        return purchaseOrderRepository.save(po);
    }

    public List<PurchaseOrder> getAllPO() {
        List<PurchaseOrder> list = purchaseOrderRepository.findByActiveTrue();
        for (PurchaseOrder po : list) {
            po.setAmountPaid(supplierPaymentRepository.sumByPurchaseOrderId(po.getId()));
        }
        return list;
    }

    public PurchaseOrder getPOById(Long id) {
        if (id == null) throw new IllegalArgumentException("ID cannot be null");
        return purchaseOrderRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Purchase Order not found: " + id));
    }

    public List<PurchaseOrderItem> getItemsByPO(Long poId) {
        if (poId == null) throw new IllegalArgumentException("PO ID cannot be null");
        return purchaseOrderItemRepository.findByPurchaseOrderId(poId);
    }

    @Transactional
    public void deletePO(Long id) {
        PurchaseOrder po = getPOById(id);
        if (po.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT purchase orders can be deleted");
        }
        po.setActive(false);
        purchaseOrderRepository.save(po);
    }

    public PurchaseOrder updateStatus(Long id, PurchaseOrderStatus newStatus) {
        if (id == null) throw new IllegalArgumentException("ID cannot be null");
        if (newStatus == null) throw new IllegalArgumentException("Status cannot be null");
        PurchaseOrder po = getPOById(id);
        if (po.getStatus() == PurchaseOrderStatus.CANCELLED || po.getStatus() == PurchaseOrderStatus.FULLY_RECEIVED) {
            throw new IllegalStateException("Cannot change status of a cancelled or fully received order.");
        }
        po.setStatus(newStatus);
        return purchaseOrderRepository.save(po);
    }
}
