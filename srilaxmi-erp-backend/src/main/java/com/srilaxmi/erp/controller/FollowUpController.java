package com.srilaxmi.erp.controller;

import com.srilaxmi.erp.service.FollowUpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/follow-ups")
public class FollowUpController {

    @Autowired private FollowUpService followUpService;

    @GetMapping
    public List<Map<String, Object>> getAll() {
        return followUpService.getAllFollowUps();
    }

    @GetMapping("/{id}")
    public Map<String, Object> getById(@PathVariable Long id) {
        return followUpService.getFollowUpById(id);
    }

    @GetMapping("/invoice/{invoiceId}")
    public Map<String, Object> getByInvoice(@PathVariable Long invoiceId) {
        return followUpService.getByInvoice(invoiceId);
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        Long invoiceId = Long.valueOf(body.get("invoiceId").toString());
        Long staffId = Long.valueOf(body.get("staffId").toString());
        LocalDate nextDate = body.get("nextFollowUpDate") != null
            ? LocalDate.parse(body.get("nextFollowUpDate").toString()) : null;
        return followUpService.createFollowUp(invoiceId, staffId, nextDate);
    }

    @PostMapping("/{id}/notes")
    public Map<String, Object> addNote(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String contactType = (String) body.get("contactType");
        String noteText = (String) body.get("noteText");
        String outcome = (String) body.get("outcome");
        LocalDate nextDate = body.get("nextFollowUpDate") != null
            ? LocalDate.parse(body.get("nextFollowUpDate").toString()) : null;
        Long createdBy = body.get("createdByStaffId") != null
            ? Long.valueOf(body.get("createdByStaffId").toString()) : null;
        return followUpService.addNote(id, contactType, noteText, outcome, nextDate, createdBy);
    }

    @PutMapping("/{id}/resolve")
    public Map<String, Object> resolve(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String closingNote = (String) body.getOrDefault("closingNote", null);
        return followUpService.resolve(id, closingNote);
    }

    @PutMapping("/{id}/assign")
    public Map<String, Object> updateAssignment(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long staffId = body.get("staffId") != null ? Long.valueOf(body.get("staffId").toString()) : null;
        LocalDate nextDate = body.get("nextFollowUpDate") != null
            ? LocalDate.parse(body.get("nextFollowUpDate").toString()) : null;
        return followUpService.updateAssignment(id, staffId, nextDate);
    }
}
