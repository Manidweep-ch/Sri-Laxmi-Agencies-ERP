package com.srilaxmi.erp.controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.srilaxmi.erp.service.*;
import com.srilaxmi.erp.entity.*;
import com.srilaxmi.erp.dto.InventoryResponse;
import com.srilaxmi.erp.repository.InvoiceItemRepository;

@RestController
@RequestMapping("/api/reports")
public class ReportsController {

    @Autowired
    private InvoiceService invoiceService;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private SalesOrderService salesOrderService;

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private StockBatchService stockBatchService;

    @Autowired
    private ProductService productService;

    @Autowired
    private InvoiceItemRepository invoiceItemRepository;

    @GetMapping("/financial")
    public Map<String, Object> getFinancialReport() {
        Map<String, Object> report = new HashMap<>();
        
        List<Invoice> invoices = invoiceService.getInvoices();
        BigDecimal totalRevenue = invoices.stream()
            .map(Invoice::getTotalAmount)
            .filter(java.util.Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
            
        List<Payment> payments = paymentService.getAllPayments();
        BigDecimal totalPayments = payments.stream()
            .map(Payment::getAmount)
            .filter(java.util.Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
            
        report.put("totalRevenue", totalRevenue);
        report.put("totalPayments", totalPayments);
        report.put("outstandingAmount", totalRevenue.subtract(totalPayments));
        report.put("totalInvoices", invoices.size());
        report.put("paidInvoices", invoices.stream().filter(i -> "PAID".equals(i.getPaymentStatus())).count());
        report.put("pendingInvoices", invoices.stream().filter(i -> !"PAID".equals(i.getPaymentStatus())).count());
        
        return report;
    }

    @GetMapping("/inventory")
    public Map<String, Object> getInventoryReport() {
        Map<String, Object> report = new HashMap<>();
        
        List<InventoryResponse> inventory = stockBatchService.getInventorySummary();
        List<Product> products = productService.getAllProducts();
        
        // Low stock items (less than 10 units)
        List<InventoryResponse> lowStockItems = inventory.stream()
            .filter(item -> item.getQuantity() < 10)
            .collect(Collectors.toList());
        
        // Out of stock items (No active batches with quantity > 0)
        List<Product> outOfStockProducts = products.stream()
            .filter(product -> inventory.stream()
                .noneMatch(inv -> inv.getProductId().equals(product.getId()) && inv.getQuantity() > 0))
            .collect(Collectors.toList());
        
        report.put("totalProducts", products.size());
        report.put("productsInStock", inventory.size());
        report.put("lowStockItems", lowStockItems.size());
        report.put("outOfStockItems", outOfStockProducts.size());
        report.put("lowStockDetails", lowStockItems);
        report.put("outOfStockDetails", outOfStockProducts);
        
        BigDecimal totalInventoryValue = inventory.stream()
            .map(InventoryResponse::getTotalValue)
            .filter(java.util.Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        report.put("totalInventoryValue", totalInventoryValue);
        
        return report;
    }

    @GetMapping("/sales")
    public Map<String, Object> getSalesReport(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        
        Map<String, Object> report = new HashMap<>();
        
        List<SalesOrder> salesOrders = salesOrderService.getOrders();
        List<Invoice> invoices = invoiceService.getInvoices();
        
        // Filter by date if provided
        if (startDate != null && endDate != null) {
            LocalDate start = LocalDate.parse(startDate);
            LocalDate end = LocalDate.parse(endDate);
            
            salesOrders = salesOrders.stream()
                .filter(so -> !so.getOrderDate().isBefore(start) && !so.getOrderDate().isAfter(end))
                .collect(Collectors.toList());
                
            invoices = invoices.stream()
                .filter(i -> !i.getInvoiceDate().isBefore(start) && !i.getInvoiceDate().isAfter(end))
                .collect(Collectors.toList());
        }
        
        report.put("totalSalesOrders", salesOrders.size());
        report.put("totalInvoices", invoices.size());
        
        BigDecimal totalRevenue = invoices.stream()
            .map(Invoice::getTotalAmount)
            .filter(java.util.Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        report.put("totalRevenue", totalRevenue);
        
        // Status breakdown
        Map<String, Long> statusBreakdown = salesOrders.stream()
            .collect(java.util.stream.Collectors.groupingBy(
                so -> so.getStatus() != null ? so.getStatus().name() : "DRAFT",
                java.util.stream.Collectors.counting()
            ));
        report.put("statusBreakdown", statusBreakdown);
        
        return report;
    }

    @GetMapping("/purchase")
    public Map<String, Object> getPurchaseReport(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        
        Map<String, Object> report = new HashMap<>();
        
        List<PurchaseOrder> purchaseOrders = purchaseOrderService.getAllPO();
        
        // Filter by date if provided
        if (startDate != null && endDate != null) {
            LocalDate start = LocalDate.parse(startDate);
            LocalDate end = LocalDate.parse(endDate);
            
            purchaseOrders = purchaseOrders.stream()
                .filter(po -> !po.getOrderDate().isBefore(start) && !po.getOrderDate().isAfter(end))
                .collect(Collectors.toList());
        }
        
        report.put("totalPurchaseOrders", purchaseOrders.size());

        // Financial totals
        double totalPOValue = purchaseOrders.stream()
            .mapToDouble(po -> po.getTotalAmount() != null ? po.getTotalAmount().doubleValue() : 0.0)
            .sum();
        double totalPaid = purchaseOrders.stream()
            .mapToDouble(po -> po.getAmountPaid() != null ? po.getAmountPaid().doubleValue() : 0.0)
            .sum();
        double totalOutstanding = Math.max(0, totalPOValue - totalPaid);

        report.put("totalPOValue", totalPOValue);
        report.put("totalPaid", totalPaid);
        report.put("totalOutstanding", totalOutstanding);

        // Status breakdown
        Map<String, Long> statusBreakdown = purchaseOrders.stream()
            .collect(java.util.stream.Collectors.groupingBy(
                po -> po.getStatus() != null ? po.getStatus().name() : "DRAFT",
                java.util.stream.Collectors.counting()
            ));
        report.put("statusBreakdown", statusBreakdown);
        
        return report;
    }

    /**
     * Profit margin report per product based on FIFO COGS recorded at invoice generation.
     * Returns: productId, productName, totalQtySold, totalRevenue, totalCOGS, grossProfit, marginPct
     */
    @GetMapping("/profit-margin")
    public List<Map<String, Object>> getProfitMarginReport() {
        List<Object[]> rows = invoiceItemRepository.getProfitSummaryByProduct();
        List<Map<String, Object>> result = new java.util.ArrayList<>();

        for (Object[] row : rows) {
            Long productId = (Long) row[0];
            String productName = (String) row[1];
            Long totalQty = (Long) row[2];
            BigDecimal totalRevenue = (BigDecimal) row[3];
            BigDecimal totalCOGS = (BigDecimal) row[4];
            BigDecimal grossProfit = totalRevenue.subtract(totalCOGS);
            BigDecimal marginPct = totalRevenue.compareTo(BigDecimal.ZERO) != 0
                    ? grossProfit.divide(totalRevenue, 4, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                    : BigDecimal.ZERO;

            Map<String, Object> entry = new HashMap<>();
            entry.put("productId", productId);
            entry.put("productName", productName);
            entry.put("totalQtySold", totalQty);
            entry.put("totalRevenue", totalRevenue);
            entry.put("totalCOGS", totalCOGS);
            entry.put("grossProfit", grossProfit);
            entry.put("marginPct", marginPct);
            result.add(entry);
        }

        return result;
    }
}
