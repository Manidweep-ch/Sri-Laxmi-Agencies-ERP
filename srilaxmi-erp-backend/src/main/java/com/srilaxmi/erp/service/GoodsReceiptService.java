package com.srilaxmi.erp.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.srilaxmi.erp.entity.GoodsReceipt;
import com.srilaxmi.erp.entity.GoodsReceiptItem;
import com.srilaxmi.erp.entity.PurchaseOrder;
import com.srilaxmi.erp.entity.PurchaseOrderItem;
import com.srilaxmi.erp.entity.PurchaseOrderStatus;
import com.srilaxmi.erp.repository.GoodsReceiptItemRepository;
import com.srilaxmi.erp.repository.GoodsReceiptRepository;
import com.srilaxmi.erp.repository.PurchaseOrderItemRepository;
import com.srilaxmi.erp.repository.PurchaseOrderRepository;

@Service
public class GoodsReceiptService {

    @Autowired private GoodsReceiptRepository goodsReceiptRepository;
    @Autowired private GoodsReceiptItemRepository goodsReceiptItemRepository;
    @Autowired private StockBatchService stockBatchService;
    @Autowired private PurchaseOrderRepository purchaseOrderRepository;
    @Autowired private PurchaseOrderItemRepository purchaseOrderItemRepository;

    @Transactional
    public GoodsReceipt saveGRN(GoodsReceipt grn) {
        if (grn == null) throw new IllegalArgumentException("GRN cannot be null");

        if (grn.getItems() != null) {
            for (GoodsReceiptItem item : grn.getItems()) {
                if (item.getProduct() == null)
                    throw new IllegalArgumentException("GRN item must have a product");
                item.setGoodsReceipt(grn);

                stockBatchService.addStock(item.getProduct(), item.getQuantity(), item.getPurchasePrice());

                // Update received quantity on PO item if linked
                if (item.getPurchaseOrderItem() != null && item.getPurchaseOrderItem().getId() != null) {
                    PurchaseOrderItem poItem = purchaseOrderItemRepository
                        .findById(item.getPurchaseOrderItem().getId())
                        .orElseThrow(() -> new RuntimeException("Purchase Order Item not found"));
                    poItem.setReceivedQuantity(poItem.getReceivedQuantity() + item.getQuantity());
                    purchaseOrderItemRepository.save(poItem);
                }
            }
        }

        // Update PO status based on received quantities
        if (grn.getPurchaseOrder() != null && grn.getPurchaseOrder().getId() != null) {
            PurchaseOrder po = purchaseOrderRepository.findById(grn.getPurchaseOrder().getId())
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

            List<PurchaseOrderItem> poItems = purchaseOrderItemRepository.findByPurchaseOrderId(po.getId());

            if (poItems != null && !poItems.isEmpty()) {
                boolean fullyReceived = true;
                boolean partiallyReceived = false;

                for (PurchaseOrderItem poItem : poItems) {
                    if (poItem.getReceivedQuantity() < poItem.getQuantity()) {
                        fullyReceived = false;
                    }
                    if (poItem.getReceivedQuantity() > 0) {
                        partiallyReceived = true;
                    }
                }

                if (fullyReceived) {
                    po.setStatus(PurchaseOrderStatus.FULLY_RECEIVED);
                } else if (partiallyReceived) {
                    po.setStatus(PurchaseOrderStatus.PARTIALLY_RECEIVED);
                }
                purchaseOrderRepository.save(po);
            }
        }

        return goodsReceiptRepository.save(grn);
    }

    public List<GoodsReceipt> getAllGRN() {
        return goodsReceiptRepository.findAll();
    }

    public GoodsReceipt getGRNById(Long id) {
        if (id == null) throw new IllegalArgumentException("ID cannot be null");
        return goodsReceiptRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("GRN not found: " + id));
    }

    public List<GoodsReceiptItem> getItemsByGRN(Long grnId) {
        if (grnId == null) throw new IllegalArgumentException("GRN ID cannot be null");
        return goodsReceiptItemRepository.findByGoodsReceiptId(grnId);
    }

    public List<PurchaseOrderItem> getPOItems(Long poId) {
        if (poId == null) throw new IllegalArgumentException("PO ID cannot be null");
        return purchaseOrderItemRepository.findByPurchaseOrderId(poId);
    }

    public List<GoodsReceipt> getGRNsByPO(Long poId) {
        if (poId == null) throw new IllegalArgumentException("PO ID cannot be null");
        return goodsReceiptRepository.findByPurchaseOrderId(poId);
    }
}
