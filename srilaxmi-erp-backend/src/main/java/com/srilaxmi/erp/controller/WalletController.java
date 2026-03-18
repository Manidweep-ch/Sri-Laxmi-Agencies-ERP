package com.srilaxmi.erp.controller;

import com.srilaxmi.erp.entity.CashDeposit;
import com.srilaxmi.erp.service.WalletService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wallets")
public class WalletController {

    @Autowired private WalletService walletService;

    /** All wallets overview (staff + admin) */
    @GetMapping
    public List<Map<String, Object>> getAllWallets() {
        return walletService.getAllWallets();
    }

    /** Staff wallet detail */
    @GetMapping("/staff/{staffId}")
    public Map<String, Object> getStaffWallet(@PathVariable Long staffId) {
        return walletService.getStaffWallet(staffId);
    }

    /** Admin wallet detail */
    @GetMapping("/admin/{userId}")
    public Map<String, Object> getAdminWallet(@PathVariable Long userId) {
        return walletService.getAdminWallet(userId);
    }

    /** Transfer from staff wallet to company */
    @PostMapping("/staff/{staffId}/transfer")
    public CashDeposit staffTransfer(@PathVariable Long staffId, @RequestBody Map<String, Object> body) {
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String type = body.getOrDefault("transferType", "CASH_DEPOSIT").toString();
        String notes = body.containsKey("notes") ? body.get("notes").toString() : null;
        LocalDate date = body.containsKey("transferDate")
            ? LocalDate.parse(body.get("transferDate").toString()) : LocalDate.now();
        return walletService.recordStaffTransfer(staffId, amount, type, notes, date);
    }

    /** Transfer from admin wallet to company */
    @PostMapping("/admin/{userId}/transfer")
    public CashDeposit adminTransfer(@PathVariable Long userId, @RequestBody Map<String, Object> body) {
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String type = body.getOrDefault("transferType", "ONLINE_TRANSFER").toString();
        String notes = body.containsKey("notes") ? body.get("notes").toString() : null;
        LocalDate date = body.containsKey("transferDate")
            ? LocalDate.parse(body.get("transferDate").toString()) : LocalDate.now();
        return walletService.recordAdminTransfer(userId, amount, type, notes, date);
    }
}
