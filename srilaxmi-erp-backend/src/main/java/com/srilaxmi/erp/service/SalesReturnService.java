package com.srilaxmi.erp.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.srilaxmi.erp.entity.Invoice;
import com.srilaxmi.erp.entity.Product;
import com.srilaxmi.erp.entity.SalesReturn;
import com.srilaxmi.erp.entity.SalesReturnItem;
import com.srilaxmi.erp.repository.InvoiceRepository;
import com.srilaxmi.erp.repository.ProductRepository;
import com.srilaxmi.erp.repository.SalesReturnItemRepository;
import com.srilaxmi.erp.repository.SalesReturnRepository;

@Service
public class SalesReturnService {

    @Autowired private SalesReturnRepository salesReturnRepository;
    @Autowired private SalesReturnItemRepository salesReturnItemRepository;
    @Autowired private StockBatchService stockBatchService;
    @Autowired private InvoiceRepository invoiceRepository;
    @Autowired private ProductRepository productRepository;

    @Transactional
    public SalesReturn saveReturn(SalesReturn salesReturn) {
        if (salesReturn == null) throw new IllegalArgumentException("Sales Return cannot be null");

        if (salesReturn.getInvoice() == null || salesReturn.getInvoice().getId() == null)
            throw new IllegalArgumentException("Sales Return must be linked to an invoice");

        Invoice invoice = invoiceRepository.findById(salesReturn.getInvoice().getId())
            .orElseThrow(() -> new RuntimeException("Invoice not found"));

        // Grab items before clearing (cascade won't work on new entity with mappedBy)
        List<SalesReturnItem> items = salesReturn.getItems();

        salesReturn.setInvoice(invoice);
        salesReturn.setItems(null);

        if (salesReturn.getReturnNumber() == null || salesReturn.getReturnNumber().isEmpty())
            salesReturn.setReturnNumber("RET-" + System.currentTimeMillis());

        if (salesReturn.getReturnDate() == null)
            salesReturn.setReturnDate(LocalDate.now());

        salesReturn.setTotalAmount(BigDecimal.ZERO);

        // Save parent first to get an ID
        SalesReturn saved = salesReturnRepository.save(salesReturn);

        if (items != null && !items.isEmpty()) {
            BigDecimal total = BigDecimal.ZERO;
            for (SalesReturnItem item : items) {
                if (item.getProduct() == null || item.getProduct().getId() == null)
                    throw new IllegalArgumentException("Return item must have a product");
                if (item.getUnitPrice() == null)
                    throw new IllegalArgumentException("Return item unit price cannot be null");

                Product product = productRepository.findById(item.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProduct().getId()));

                item.setProduct(product);
                item.setSalesReturn(saved);

                BigDecimal itemTotal = item.getUnitPrice().multiply(new BigDecimal(item.getQuantity()));
                item.setTotalAmount(itemTotal);
                total = total.add(itemTotal);

                salesReturnItemRepository.save(item);

                // Add stock back — use avg purchase price, fall back to unit price
                double avgPrice = stockBatchService.getAveragePurchasePrice(product.getId());
                if (avgPrice <= 0) avgPrice = item.getUnitPrice().doubleValue();
                stockBatchService.addStock(product, item.getQuantity(), avgPrice);
            }
            saved.setTotalAmount(total);
            saved = salesReturnRepository.save(saved);
        }

        return saved;
    }

    public List<SalesReturn> getAllReturns() {
        return salesReturnRepository.findAll();
    }
}
