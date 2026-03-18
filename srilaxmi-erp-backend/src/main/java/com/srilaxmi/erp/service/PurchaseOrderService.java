package com.srilaxmi.erp.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.srilaxmi.erp.entity.Product;
import com.srilaxmi.erp.entity.PurchaseOrder;
import com.srilaxmi.erp.entity.PurchaseOrderItem;
import com.srilaxmi.erp.entity.PurchaseOrderStatus;
import com.srilaxmi.erp.entity.Staff;
import com.srilaxmi.erp.entity.Supplier;
import com.srilaxmi.erp.repository.ProductRepository;
import com.srilaxmi.erp.repository.PurchaseOrderItemRepository;
import com.srilaxmi.erp.repository.PurchaseOrderRepository;
import com.srilaxmi.erp.repository.StaffRepository;
import com.srilaxmi.erp.repository.SupplierRepository;

@Service
public class PurchaseOrderService {

    @Autowired private PurchaseOrderRepository purchaseOrderRepository;
    @Autowired private PurchaseOrderItemRepository purchaseOrderItemRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private StaffRepository staffRepository;
    @Autowired private com.srilaxmi.erp.repository.SupplierPaymentRepository supplierPaymentRepository;
    @Autowired private com.srilaxmi.erp.repository.GoodsReceiptRepository goodsReceiptRepository;

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

        po.setPoNumber(generatePoNumber());
        po.setOrderDate(LocalDate.now());
        po.setStatus(PurchaseOrderStatus.DRAFT);

        // Stamp who created this PO
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        po.setCreatedBy(username);

        // Resolve createdByStaff if provided
        if (po.getCreatedByStaff() != null && po.getCreatedByStaff().getId() != null) {
            staffRepository.findById(po.getCreatedByStaff().getId())
                .ifPresent(po::setCreatedByStaff);
        }

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
            BigDecimal paid = supplierPaymentRepository.sumByPurchaseOrderId(po.getId());
            po.setAmountPaid(paid);

            // toBePaid = receivedValue - paid (if goods received), else full PO total
            boolean hasReceivedGoods = po.getStatus() == PurchaseOrderStatus.PARTIALLY_RECEIVED
                    || po.getStatus() == PurchaseOrderStatus.FULLY_RECEIVED;

            if (hasReceivedGoods) {
                BigDecimal receivedValue = getReceivedValue(po.getId());
                BigDecimal balance = receivedValue.subtract(paid);
                po.setToBePaid(balance.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : balance);
            } else {
                BigDecimal total = po.getTotalAmount() != null ? po.getTotalAmount() : BigDecimal.ZERO;
                po.setToBePaid(total.subtract(paid).compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : total.subtract(paid));
            }
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
        if (newStatus == PurchaseOrderStatus.CANCELLED) {
            List<com.srilaxmi.erp.entity.GoodsReceipt> grns = goodsReceiptRepository.findByPurchaseOrderId(id);
            if (grns != null && !grns.isEmpty()) {
                throw new IllegalStateException("Cannot cancel a PO that has GRN entries recorded.");
            }
        }
        po.setStatus(newStatus);
        return purchaseOrderRepository.save(po);
    }

    private String generatePoNumber() {
        int year = LocalDate.now().getYear();
        long count = purchaseOrderRepository.count() + 1;
        return String.format("PO-%d-%04d", year, count);
    }

    /**
     * Creates a new DRAFT PO copying supplier + items from an existing PO.
     */
    @Transactional
    public PurchaseOrder reorderFromPO(Long sourcePOId) {
        PurchaseOrder source = getPOById(sourcePOId);
        List<PurchaseOrderItem> sourceItems = purchaseOrderItemRepository.findByPurchaseOrderId(sourcePOId);

        PurchaseOrder newPO = new PurchaseOrder();
        newPO.setSupplier(source.getSupplier());
        newPO.setPoNumber(generatePoNumber());
        newPO.setOrderDate(LocalDate.now());
        newPO.setStatus(PurchaseOrderStatus.DRAFT);

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        newPO.setCreatedBy(username);

        PurchaseOrder saved = purchaseOrderRepository.save(newPO);

        BigDecimal subTotal = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;

        for (PurchaseOrderItem src : sourceItems) {
            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setProduct(src.getProduct());
            item.setQuantity(src.getQuantity());
            item.setPrice(src.getPrice());
            item.setPurchaseOrder(saved);
            purchaseOrderItemRepository.save(item);

            BigDecimal lineTotal = src.getPrice().multiply(new BigDecimal(src.getQuantity()));
            double gst = src.getProduct() != null ? src.getProduct().getGst() : 0.0;
            BigDecimal lineTax = lineTotal.multiply(BigDecimal.valueOf(gst / 100.0));
            subTotal = subTotal.add(lineTotal);
            totalTax = totalTax.add(lineTax);
        }

        saved.setSubTotal(subTotal);
        saved.setTax(totalTax);
        saved.setTotalAmount(subTotal.add(totalTax));
        return purchaseOrderRepository.save(saved);
    }

    /**
     * Calculates the total value of goods actually received for a PO,
     * based on receivedQuantity * price per PO item.
     */
    public java.math.BigDecimal getReceivedValue(Long poId) {
        List<PurchaseOrderItem> items = purchaseOrderItemRepository.findByPurchaseOrderId(poId);
        java.math.BigDecimal total = java.math.BigDecimal.ZERO;
        for (PurchaseOrderItem item : items) {
            if (item.getPrice() == null) continue;
            java.math.BigDecimal lineVal = item.getPrice().multiply(new java.math.BigDecimal(item.getReceivedQuantity()));
            // Add GST on received value
            double gst = item.getProduct() != null ? item.getProduct().getGst() : 0.0;
            java.math.BigDecimal tax = lineVal.multiply(java.math.BigDecimal.valueOf(gst / 100.0));
            total = total.add(lineVal).add(tax);
        }
        return total;
    }
}
