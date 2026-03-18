package com.srilaxmi.erp.controller;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.srilaxmi.erp.service.*;
import com.srilaxmi.erp.entity.Invoice;
import com.srilaxmi.erp.repository.PaymentRepository;
import com.srilaxmi.erp.repository.SupplierPaymentRepository;
import com.srilaxmi.erp.repository.SalesReturnRefundRepository;

import com.srilaxmi.erp.repository.SalaryPaymentRepository;
import com.srilaxmi.erp.repository.CashDepositRepository;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private ProductService productService;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private SupplierService supplierService;

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private SalesOrderService salesOrderService;

    @Autowired
    private InvoiceService invoiceService;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private StockBatchService stockBatchService;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private SupplierPaymentRepository supplierPaymentRepository;

    @Autowired
    private SalesReturnRefundRepository salesReturnRefundRepository;

    @Autowired
    private SalaryPaymentRepository salaryPaymentRepository;

    @Autowired
    private CashDepositRepository cashDepositRepository;

    @GetMapping
    public Map<String, Object> getDashboardData() {
        Map<String, Object> dashboard = new HashMap<>();

        // Basic counts
        dashboard.put("totalProducts", productService.getAllProducts().size());
        dashboard.put("totalCustomers", customerService.getCustomers().size());
        dashboard.put("totalSuppliers", supplierService.getSuppliers().size());
        dashboard.put("totalPurchaseOrders", purchaseOrderService.getAllPO().size());
        dashboard.put("totalSalesOrders", salesOrderService.getOrders().size());

        // Financial calculations
        List<Invoice> invoices = invoiceService.getInvoices();
        dashboard.put("totalInvoices", invoices.size());

        BigDecimal totalRevenue = invoices.stream()
            .map(Invoice::getTotalAmount)
            .filter(java.util.Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        dashboard.put("totalRevenue", totalRevenue);

        BigDecimal totalPayments = paymentRepository.sumAll();
        dashboard.put("totalPayments", totalPayments);

        BigDecimal pendingPayments = totalRevenue.subtract(totalPayments);
        dashboard.put("pendingPayments", pendingPayments.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : pendingPayments);

        // Invoice status counts
        long pendingInvoices = invoices.stream()
            .filter(i -> "PENDING".equals(i.getPaymentStatus()) || "PARTIALLY_PAID".equals(i.getPaymentStatus()))
            .count();
        dashboard.put("pendingInvoices", pendingInvoices);

        long paidInvoices = invoices.stream()
            .filter(i -> "PAID".equals(i.getPaymentStatus()))
            .count();
        dashboard.put("paidInvoices", paidInvoices);

        long overdueInvoices = invoices.stream()
            .filter(i -> "OVERDUE".equals(i.getPaymentStatus()))
            .count();
        dashboard.put("overdueInvoices", overdueInvoices);

        // Low stock alerts - products with less than 10 units
        try {
            long lowStockCount = stockBatchService.getInventorySummary().stream()
                .filter(inv -> inv.getQuantity() < 10)
                .count();
            dashboard.put("lowStockAlerts", lowStockCount);
        } catch (Exception e) {
            dashboard.put("lowStockAlerts", 0);
        }

        return dashboard;
    }

    @GetMapping("/wallet")
    public Map<String, Object> getWallet() {
        Map<String, Object> wallet = new HashMap<>();

        // Total to receive from customers (SO invoices)
        List<Invoice> invoices = invoiceService.getInvoices();
        BigDecimal totalToReceive = invoices.stream()
            .map(Invoice::getTotalAmount).filter(java.util.Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalReceived = paymentRepository.sumAll();
        BigDecimal unassignedPayments = paymentRepository.sumUnassigned();
        BigDecimal assignedToStaff = paymentRepository.sumAssigned();

        // Total to pay suppliers (PO)
        BigDecimal totalPOAmount = purchaseOrderService.getAllPO().stream()
            .map(po -> po.getTotalAmount() != null ? po.getTotalAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPOPaid = supplierPaymentRepository.findAll().stream()
            .map(sp -> sp.getAmount() != null ? sp.getAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal toReceive = totalToReceive.subtract(totalReceived);
        BigDecimal toPay = totalPOAmount.subtract(totalPOPaid);
        // Wallet = money received from customers - money paid to suppliers - refunds paid to customers
        BigDecimal totalRefundsPaid = salesReturnRefundRepository.findAll().stream()
            .map(r -> r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Total salary paid to staff
        BigDecimal totalSalaryPaid = salaryPaymentRepository.findAll().stream()
            .map(s -> s.getAmount() != null ? s.getAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Company wallet inflow = all transfers from staff/admin wallets to company
        BigDecimal companyInflow = cashDepositRepository.sumAll();

        // Money still held by staff = payments assigned to staff - already transferred to company
        BigDecimal totalStaffHolding = assignedToStaff.subtract(companyInflow);
        if (totalStaffHolding.compareTo(BigDecimal.ZERO) < 0) totalStaffHolding = BigDecimal.ZERO;

        // Company wallet balance = inflow - outflows
        BigDecimal walletBalance = companyInflow
            .subtract(totalPOPaid)
            .subtract(totalRefundsPaid)
            .subtract(totalSalaryPaid);

        wallet.put("totalToReceive", toReceive.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : toReceive);
        wallet.put("totalToPay", toPay.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : toPay);
        wallet.put("totalReceived", totalReceived);
        wallet.put("unassignedPayments", unassignedPayments);
        wallet.put("assignedToStaff", assignedToStaff);
        wallet.put("companyInflow", companyInflow);
        wallet.put("totalStaffHolding", totalStaffHolding);
        wallet.put("totalPaid", totalPOPaid);
        wallet.put("totalSalaryPaid", totalSalaryPaid);
        wallet.put("walletBalance", walletBalance);

        return wallet;
    }
}
