package com.srilaxmi.erp.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private BigDecimal amount;
    private LocalDate paymentDate;
    private String paymentMethod; // CASH, UPI, NEFT, RTGS, BANK_TRANSFER, CHEQUE

    @ManyToOne
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    /**
     * For CASH payments collected by a sales staff member.
     * Money sits in this staff's wallet until they deposit to company.
     */
    @ManyToOne
    @JoinColumn(name = "received_by_staff_id")
    private Staff receivedBy;

    /**
     * For ONLINE payments received in an admin's personal bank/UPI account.
     * Admin must verify receipt, then transfer to company wallet.
     */
    @ManyToOne
    @JoinColumn(name = "received_by_user_id")
    private User receivedByUser;

    /**
     * COMPANY_DIRECT = cash at shop or online to company account → goes straight to company wallet
     * STAFF_WALLET   = cash given to a staff member → sits in staff wallet
     * ADMIN_WALLET   = online to admin's personal account → pending admin verification
     */
    private String destination; // COMPANY_DIRECT, STAFF_WALLET, ADMIN_WALLET

    /**
     * CASH = physical cash
     * ONLINE = digital transfer
     */
    private String paymentChannel; // CASH, ONLINE

    /**
     * PENDING   = not yet confirmed (online/cheque)
     * VERIFIED  = admin confirmed they received it in their account
     * NOT_RECEIVED = admin says this payment did not arrive
     * DEPOSITED = cheque was deposited successfully
     * BOUNCED   = cheque bounced
     * CONFIRMED = cash/direct payment confirmed (default for direct payments)
     */
    private String verificationStatus; // PENDING, VERIFIED, NOT_RECEIVED, DEPOSITED, BOUNCED, CONFIRMED

    /** For CHEQUE payments — the date written on the cheque for deposit */
    private LocalDate chequeDepositDate;

    private String notes;

    public Payment() {}

    public Long getId() { return id; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public Invoice getInvoice() { return invoice; }
    public void setInvoice(Invoice invoice) { this.invoice = invoice; }

    public Staff getReceivedBy() { return receivedBy; }
    public void setReceivedBy(Staff receivedBy) { this.receivedBy = receivedBy; }

    public User getReceivedByUser() { return receivedByUser; }
    public void setReceivedByUser(User receivedByUser) { this.receivedByUser = receivedByUser; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getPaymentChannel() { return paymentChannel; }
    public void setPaymentChannel(String paymentChannel) { this.paymentChannel = paymentChannel; }

    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }

    public LocalDate getChequeDepositDate() { return chequeDepositDate; }
    public void setChequeDepositDate(LocalDate chequeDepositDate) { this.chequeDepositDate = chequeDepositDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
