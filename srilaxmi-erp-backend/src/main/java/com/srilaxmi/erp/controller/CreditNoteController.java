package com.srilaxmi.erp.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.entity.CreditNote;
import com.srilaxmi.erp.service.CreditNoteService;

@RestController
@RequestMapping("/api/credit-notes")
public class CreditNoteController {

    @Autowired
    private CreditNoteService creditNoteService;

    @PostMapping
    public CreditNote createCreditNote(@RequestBody CreditNote creditNote) {
        return creditNoteService.createCreditNote(creditNote);
    }

    @GetMapping("/invoice/{invoiceId}")
    public List<CreditNote> getCreditNotesByInvoice(@PathVariable Long invoiceId) {
        return creditNoteService.getCreditNotesByInvoice(invoiceId);
    }

    @GetMapping
    public List<CreditNote> getAllCreditNotes() {
        return creditNoteService.getAllCreditNotes();
    }
}
