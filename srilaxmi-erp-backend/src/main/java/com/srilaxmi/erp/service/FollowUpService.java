package com.srilaxmi.erp.service;

import com.srilaxmi.erp.entity.FollowUp;
import com.srilaxmi.erp.entity.FollowUpNote;
import com.srilaxmi.erp.entity.Invoice;
import com.srilaxmi.erp.entity.Staff;
import com.srilaxmi.erp.repository.FollowUpNoteRepository;
import com.srilaxmi.erp.repository.FollowUpRepository;
import com.srilaxmi.erp.repository.InvoiceRepository;
import com.srilaxmi.erp.repository.StaffRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class FollowUpService {

    @Autowired private FollowUpRepository followUpRepository;
    @Autowired private FollowUpNoteRepository followUpNoteRepository;
    @Autowired private InvoiceRepository invoiceRepository;
    @Autowired private StaffRepository staffRepository;

    public List<Map<String, Object>> getAllFollowUps() {
        return followUpRepository.findAllByOrderByCreatedAtDesc()
            .stream().map(this::toDto).toList();
    }

    public Map<String, Object> getFollowUpById(Long id) {
        FollowUp fu = followUpRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Follow-up not found"));
        Map<String, Object> dto = toDto(fu);
        dto.put("notes", followUpNoteRepository.findByFollowUpIdOrderByCreatedAtDesc(id)
            .stream().map(this::noteToDto).toList());
        return dto;
    }

    public Map<String, Object> getByInvoice(Long invoiceId) {
        return followUpRepository.findByInvoiceIdAndStatus(invoiceId, "OPEN")
            .map(this::toDto).orElse(null);
    }

    @Transactional
    public Map<String, Object> createFollowUp(Long invoiceId, Long staffId, LocalDate nextDate) {
        // Only one open follow-up per invoice
        followUpRepository.findByInvoiceIdAndStatus(invoiceId, "OPEN").ifPresent(existing -> {
            throw new RuntimeException("An open follow-up already exists for this invoice");
        });

        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new RuntimeException("Invoice not found"));
        Staff staff = staffRepository.findById(staffId)
            .orElseThrow(() -> new RuntimeException("Staff not found"));

        FollowUp fu = new FollowUp();
        fu.setInvoice(invoice);
        fu.setAssignedTo(staff);
        fu.setNextFollowUpDate(nextDate);
        fu.setStatus("OPEN");
        fu.setCreatedAt(LocalDateTime.now());

        return toDto(followUpRepository.save(fu));
    }

    @Transactional
    public Map<String, Object> addNote(Long followUpId, String contactType, String noteText,
                                       String outcome, LocalDate nextDate, Long createdByStaffId) {
        FollowUp fu = followUpRepository.findById(followUpId)
            .orElseThrow(() -> new RuntimeException("Follow-up not found"));

        FollowUpNote note = new FollowUpNote();
        note.setFollowUp(fu);
        note.setContactType(contactType);
        note.setNoteText(noteText);
        note.setOutcome(outcome);
        note.setNextFollowUpDate(nextDate);
        note.setCreatedAt(LocalDateTime.now());

        if (createdByStaffId != null) {
            staffRepository.findById(createdByStaffId).ifPresent(note::setCreatedBy);
        }

        // Update next follow-up date on parent if provided
        if (nextDate != null) {
            fu.setNextFollowUpDate(nextDate);
            followUpRepository.save(fu);
        }

        return noteToDto(followUpNoteRepository.save(note));
    }

    @Transactional
    public Map<String, Object> resolve(Long followUpId, String closingNote) {
        FollowUp fu = followUpRepository.findById(followUpId)
            .orElseThrow(() -> new RuntimeException("Follow-up not found"));
        fu.setStatus("RESOLVED");
        fu.setResolvedAt(LocalDateTime.now());
        fu.setClosingNote(closingNote);
        return toDto(followUpRepository.save(fu));
    }

    @Transactional
    public Map<String, Object> updateAssignment(Long followUpId, Long staffId, LocalDate nextDate) {
        FollowUp fu = followUpRepository.findById(followUpId)
            .orElseThrow(() -> new RuntimeException("Follow-up not found"));
        if (staffId != null) {
            staffRepository.findById(staffId).ifPresent(fu::setAssignedTo);
        }
        if (nextDate != null) fu.setNextFollowUpDate(nextDate);
        return toDto(followUpRepository.save(fu));
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    private Map<String, Object> toDto(FollowUp fu) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", fu.getId());
        m.put("status", fu.getStatus());
        m.put("nextFollowUpDate", fu.getNextFollowUpDate() != null ? fu.getNextFollowUpDate().toString() : null);
        m.put("createdAt", fu.getCreatedAt() != null ? fu.getCreatedAt().toString() : null);
        m.put("resolvedAt", fu.getResolvedAt() != null ? fu.getResolvedAt().toString() : null);
        m.put("closingNote", fu.getClosingNote());

        if (fu.getInvoice() != null) {
            Invoice inv = fu.getInvoice();
            m.put("invoiceId", inv.getId());
            m.put("invoiceNumber", inv.getInvoiceNumber());
            m.put("invoiceDate", inv.getInvoiceDate() != null ? inv.getInvoiceDate().toString() : null);
            m.put("dueDate", inv.getDueDate() != null ? inv.getDueDate().toString() : null);
            m.put("totalAmount", inv.getTotalAmount());
            m.put("paymentStatus", inv.getPaymentStatus());
            if (inv.getCustomer() != null) {
                m.put("customerName", inv.getCustomer().getName());
                m.put("customerPhone", inv.getCustomer().getPhone());
                m.put("customerId", inv.getCustomer().getId());
            }
        }

        if (fu.getAssignedTo() != null) {
            Staff s = fu.getAssignedTo();
            m.put("assignedToId", s.getId());
            m.put("assignedToName", s.getName());
            m.put("assignedToPhone", s.getPhone());
        }

        return m;
    }

    private Map<String, Object> noteToDto(FollowUpNote n) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", n.getId());
        m.put("contactType", n.getContactType());
        m.put("noteText", n.getNoteText());
        m.put("outcome", n.getOutcome());
        m.put("nextFollowUpDate", n.getNextFollowUpDate() != null ? n.getNextFollowUpDate().toString() : null);
        m.put("createdAt", n.getCreatedAt() != null ? n.getCreatedAt().toString() : null);
        if (n.getCreatedBy() != null) {
            m.put("createdByName", n.getCreatedBy().getName());
            m.put("createdById", n.getCreatedBy().getId());
        }
        return m;
    }
}
