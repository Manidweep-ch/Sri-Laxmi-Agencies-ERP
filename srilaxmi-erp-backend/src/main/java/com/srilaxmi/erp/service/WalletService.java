package com.srilaxmi.erp.service;

import com.srilaxmi.erp.entity.CashDeposit;
import com.srilaxmi.erp.entity.Staff;
import com.srilaxmi.erp.entity.User;
import com.srilaxmi.erp.repository.CashDepositRepository;
import com.srilaxmi.erp.repository.PaymentRepository;
import com.srilaxmi.erp.repository.StaffRepository;
import com.srilaxmi.erp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
public class WalletService {

    @Autowired private StaffRepository staffRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private CashDepositRepository cashDepositRepository;

    /**
     * Staff wallet: cash collected by this staff member, not yet transferred to company.
     */
    public Map<String, Object> getStaffWallet(Long staffId) {
        Staff staff = staffRepository.findById(staffId)
            .orElseThrow(() -> new RuntimeException("Staff not found"));

        BigDecimal totalReceived = paymentRepository.sumByReceivedById(staffId);
        BigDecimal totalCash = paymentRepository.sumByReceivedByIdAndChannel(staffId, "CASH");
        BigDecimal totalOnline = paymentRepository.sumByReceivedByIdAndChannel(staffId, "ONLINE");
        BigDecimal totalTransferred = cashDepositRepository.sumByStaffId(staffId);
        BigDecimal walletBalance = totalReceived.subtract(totalTransferred);

        List<Map<String, Object>> recentPayments = new ArrayList<>();
        paymentRepository.findByReceivedByIdOrderByPaymentDateDesc(staffId).stream().limit(20).forEach(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", p.getId());
            m.put("amount", p.getAmount());
            m.put("paymentDate", p.getPaymentDate());
            m.put("paymentMethod", p.getPaymentMethod());
            m.put("paymentChannel", p.getPaymentChannel());
            m.put("verificationStatus", p.getVerificationStatus());
            m.put("invoiceNumber", p.getInvoice() != null ? p.getInvoice().getInvoiceNumber() : null);
            m.put("customerName", p.getInvoice() != null && p.getInvoice().getSalesOrder() != null
                ? p.getInvoice().getSalesOrder().getCustomer().getName() : null);
            recentPayments.add(m);
        });

        List<CashDeposit> transfers = cashDepositRepository.findByStaffIdOrderByTransferDateDesc(staffId);

        Map<String, Object> wallet = new HashMap<>();
        wallet.put("staffId", staffId);
        wallet.put("staffName", staff.getName());
        wallet.put("employeeId", staff.getEmployeeId());
        wallet.put("designation", staff.getDesignation());
        wallet.put("walletType", "STAFF");
        wallet.put("totalReceived", totalReceived);
        wallet.put("totalCash", totalCash);
        wallet.put("totalOnline", totalOnline);
        wallet.put("totalTransferred", totalTransferred);
        wallet.put("walletBalance", walletBalance);
        wallet.put("recentPayments", recentPayments);
        wallet.put("transfers", transfers);
        return wallet;
    }

    /**
     * Admin wallet: online payments received in this admin's personal account.
     * Shows pending verifications + verified amounts + transfers to company.
     */
    public Map<String, Object> getAdminWallet(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        BigDecimal totalReceived = paymentRepository.sumByReceivedByUserId(userId);
        BigDecimal verified = paymentRepository.sumByReceivedByUserIdAndStatus(userId, "VERIFIED");
        BigDecimal pending = paymentRepository.sumByReceivedByUserIdAndStatus(userId, "PENDING");
        BigDecimal notReceived = paymentRepository.sumByReceivedByUserIdAndStatus(userId, "NOT_RECEIVED");
        BigDecimal totalTransferred = cashDepositRepository.sumByUserId(userId);
        BigDecimal walletBalance = verified.subtract(totalTransferred);

        List<Map<String, Object>> allPayments = new ArrayList<>();
        paymentRepository.findByReceivedByUserIdOrderByPaymentDateDesc(userId).forEach(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", p.getId());
            m.put("amount", p.getAmount());
            m.put("paymentDate", p.getPaymentDate());
            m.put("paymentMethod", p.getPaymentMethod());
            m.put("verificationStatus", p.getVerificationStatus());
            m.put("notes", p.getNotes());
            m.put("invoiceNumber", p.getInvoice() != null ? p.getInvoice().getInvoiceNumber() : null);
            m.put("customerName", p.getInvoice() != null && p.getInvoice().getSalesOrder() != null
                ? p.getInvoice().getSalesOrder().getCustomer().getName() : null);
            allPayments.add(m);
        });

        List<CashDeposit> transfers = cashDepositRepository.findByUserIdOrderByTransferDateDesc(userId);

        Map<String, Object> wallet = new HashMap<>();
        wallet.put("userId", userId);
        wallet.put("username", user.getUsername());
        wallet.put("walletType", "ADMIN");
        wallet.put("totalReceived", totalReceived);
        wallet.put("verified", verified);
        wallet.put("pending", pending);
        wallet.put("notReceived", notReceived);
        wallet.put("totalTransferred", totalTransferred);
        wallet.put("walletBalance", walletBalance);
        wallet.put("payments", allPayments);
        wallet.put("transfers", transfers);
        return wallet;
    }

    /**
     * All staff wallets overview.
     */
    public List<Map<String, Object>> getAllWallets() {
        List<Staff> allStaff = staffRepository.findByActiveTrue();
        List<Map<String, Object>> wallets = new ArrayList<>();
        for (Staff staff : allStaff) {
            BigDecimal totalReceived = paymentRepository.sumByReceivedById(staff.getId());
            BigDecimal totalTransferred = cashDepositRepository.sumByStaffId(staff.getId());
            BigDecimal balance = totalReceived.subtract(totalTransferred);
            if (totalReceived.compareTo(BigDecimal.ZERO) == 0 && balance.compareTo(BigDecimal.ZERO) == 0) continue;
            Map<String, Object> w = new HashMap<>();
            w.put("staffId", staff.getId());
            w.put("staffName", staff.getName());
            w.put("employeeId", staff.getEmployeeId());
            w.put("designation", staff.getDesignation());
            w.put("walletType", "STAFF");
            w.put("totalReceived", totalReceived);
            w.put("totalTransferred", totalTransferred);
            w.put("walletBalance", balance);
            wallets.add(w);
        }
        // Add admin wallets
        userRepository.findAll().forEach(user -> {
            BigDecimal totalReceived = paymentRepository.sumByReceivedByUserId(user.getId());
            if (totalReceived.compareTo(BigDecimal.ZERO) == 0) return;
            BigDecimal verified = paymentRepository.sumByReceivedByUserIdAndStatus(user.getId(), "VERIFIED");
            BigDecimal totalTransferred = cashDepositRepository.sumByUserId(user.getId());
            BigDecimal balance = verified.subtract(totalTransferred);
            Map<String, Object> w = new HashMap<>();
            w.put("userId", user.getId());
            w.put("staffName", user.getUsername() + " (Admin)");
            w.put("employeeId", "ADMIN");
            w.put("designation", user.getRole() != null ? user.getRole().getName() : "ADMIN");
            w.put("walletType", "ADMIN");
            w.put("totalReceived", totalReceived);
            w.put("totalTransferred", totalTransferred);
            w.put("walletBalance", balance);
            wallets.add(w);
        });
        return wallets;
    }

    /**
     * Transfer from staff wallet to company wallet.
     * ADMIN role: can specify any amount (partial).
     * Others: must transfer full balance.
     */
    @Transactional
    public CashDeposit recordStaffTransfer(Long staffId, BigDecimal amount, String transferType, String notes, LocalDate date) {
        Staff staff = staffRepository.findById(staffId)
            .orElseThrow(() -> new RuntimeException("Staff not found"));
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("Amount must be greater than zero");

        CashDeposit deposit = new CashDeposit();
        deposit.setStaff(staff);
        deposit.setAmount(amount);
        deposit.setTransferType(transferType != null ? transferType : "CASH_DEPOSIT");
        deposit.setNotes(notes);
        deposit.setTransferDate(date != null ? date : LocalDate.now());
        deposit.setRecordedBy(SecurityContextHolder.getContext().getAuthentication().getName());
        return cashDepositRepository.save(deposit);
    }

    /**
     * Transfer from admin wallet to company wallet.
     */
    @Transactional
    public CashDeposit recordAdminTransfer(Long userId, BigDecimal amount, String transferType, String notes, LocalDate date) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("Amount must be greater than zero");

        CashDeposit deposit = new CashDeposit();
        deposit.setUser(user);
        deposit.setAmount(amount);
        deposit.setTransferType(transferType != null ? transferType : "ONLINE_TRANSFER");
        deposit.setNotes(notes);
        deposit.setTransferDate(date != null ? date : LocalDate.now());
        deposit.setRecordedBy(SecurityContextHolder.getContext().getAuthentication().getName());
        return cashDepositRepository.save(deposit);
    }
}
