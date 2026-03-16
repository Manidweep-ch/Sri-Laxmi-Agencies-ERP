package com.srilaxmi.erp.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.srilaxmi.erp.entity.*;
import com.srilaxmi.erp.repository.*;
import com.srilaxmi.erp.entity.SalesOrderStatus;

@Service
public class InvoiceGenerationService {

    @Autowired
    private SalesOrderRepository salesOrderRepository;

    @Autowired
    private SalesOrderItemRepository salesOrderItemRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private InvoiceItemRepository invoiceItemRepository;

    @Autowired
    private StockBatchService stockBatchService;

    @Transactional
    public Invoice generateInvoice(Long salesOrderId) {
        if (salesOrderId == null) {
            throw new IllegalArgumentException("Sales Order ID cannot be null");
        }

        SalesOrder order = salesOrderRepository.findById(salesOrderId)
                .orElseThrow(() -> new RuntimeException("Sales Order not found"));

        // Invoice can only be generated after goods are shipped (sent to customer)
        if (order.getStatus() != SalesOrderStatus.SHIPPED) {
            throw new IllegalStateException("Invoice can only be generated after goods are sent (SHIPPED). Current status: " + order.getStatus());
        }

        Invoice invoice = new Invoice();

        invoice.setCustomer(order.getCustomer());
        invoice.setSalesOrder(order);
        invoice.setInvoiceDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(30)); // Default 30 days payment terms
        invoice.setInvoiceNumber("INV-" + System.currentTimeMillis());
        invoice.setPaymentStatus("PENDING");
        invoice.setInvoiceType("SO");

        invoice = invoiceRepository.save(invoice);

        List<SalesOrderItem> items = salesOrderItemRepository.findBySalesOrderId(order.getId());

        if (items == null || items.isEmpty()) {
            throw new IllegalStateException("Cannot generate invoice for an order with no items");
        }

        BigDecimal total = BigDecimal.ZERO;

        for (SalesOrderItem item : items) {
            if (item.getProduct() == null)
                throw new IllegalStateException("Sales order item has no product");
            if (item.getPrice() == null)
                throw new IllegalStateException("Sales order item has no price");

            InvoiceItem invItem = new InvoiceItem();

            invItem.setInvoice(invoice);
            invItem.setProduct(item.getProduct());
            invItem.setQuantity(item.getQuantity());
            invItem.setUnitPrice(item.getPrice());

            BigDecimal itemSubTotal =
                    item.getPrice().multiply(new BigDecimal(item.getQuantity()));

            double gstRate = (item.getProduct().getGst() > 0) ? item.getProduct().getGst() : 0.0;
            BigDecimal gstAmount = itemSubTotal.multiply(BigDecimal.valueOf(gstRate / 100.0));
            BigDecimal itemTotal = itemSubTotal.add(gstAmount);

            invItem.setTotalPrice(itemTotal);

            total = total.add(itemTotal);

            invoiceItemRepository.save(invItem);

            // CRITICAL FIX: Stock consumption happens ONLY here during invoice generation
            // Not during sales order confirmation
            stockBatchService.consumeStock(
                    item.getProduct().getId(),
                    item.getQuantity()
            );
        }

        invoice.setTotalAmount(total);

        order.setStatus(SalesOrderStatus.INVOICED);
        salesOrderRepository.save(order);

        return invoiceRepository.save(invoice);
    }
}