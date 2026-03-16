package com.srilaxmi.erp.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.entity.*;
import com.srilaxmi.erp.repository.*;

@Service
public class SalesReturnItemService {

    @Autowired
    private SalesReturnItemRepository salesReturnItemRepository;

    @Autowired
    private StockBatchService stockBatchService;

    @Autowired
    private CreditNoteService creditNoteService;

    @org.springframework.transaction.annotation.Transactional
    public SalesReturnItem saveItem(SalesReturnItem item){

        BigDecimal total = item.getUnitPrice().multiply(new BigDecimal(item.getQuantity()));
        item.setTotalAmount(total);

        // Save the item first
        SalesReturnItem savedItem = salesReturnItemRepository.save(item);

        // Increase stock - use the proper method with Product object
        stockBatchService.addStock(
                item.getProduct(),
                item.getQuantity(),
                item.getUnitPrice().doubleValue()  // Use unit price as purchase price for returns
        );

        // Create credit note via service to update invoice status
        CreditNote note = new CreditNote();
        note.setAmount(total);
        note.setDate(java.time.LocalDate.now());
        note.setReason("Sales Return - Item ID: " + savedItem.getId());
        note.setInvoice(item.getSalesReturn().getInvoice());

        creditNoteService.saveCredit(note);

        return savedItem;
    }
    
    public List<SalesReturnItem> getItemsByReturn(Long returnId){
        return salesReturnItemRepository.findBySalesReturnId(returnId);
    }
}