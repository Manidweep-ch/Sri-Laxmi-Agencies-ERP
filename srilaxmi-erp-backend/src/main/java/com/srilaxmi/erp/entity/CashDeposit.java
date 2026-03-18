package com.srilaxmi.erp.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Records a transfer to the company wallet from either:
 * - A staff member (depositing cash they collected)
 * - An admin user (transferring verified online payments to company account)
 */
@Entity
@Table(name = "wallet_transfers")
public class CashDeposit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Set when a staff member is depositing cash */
    @ManyToOne
    @JoinColumn(name = "staff_id")
    private Staff staff;

    /** Set when an admin user is transferring online payments */
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private BigDecimal amount;
    private LocalDate transferDate;
    private String transferType; // CASH_DEPOSIT, ONLINE_TRANSFER
    private String notes;
    private String recordedBy; // username who recorded this

    public CashDeposit() {}

    public Long getId() { return id; }

    public Staff getStaff() { return staff; }
    public void setStaff(Staff staff) { this.staff = staff; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public LocalDate getTransferDate() { return transferDate; }
    public void setTransferDate(LocalDate transferDate) { this.transferDate = transferDate; }

    public String getTransferType() { return transferType; }
    public void setTransferType(String transferType) { this.transferType = transferType; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getRecordedBy() { return recordedBy; }
    public void setRecordedBy(String recordedBy) { this.recordedBy = recordedBy; }
}
