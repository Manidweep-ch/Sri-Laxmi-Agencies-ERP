package com.srilaxmi.erp.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.entity.InvoiceItem;
import com.srilaxmi.erp.repository.InvoiceItemRepository;

@Service
public class InvoiceItemService {

    @Autowired
    private InvoiceItemRepository invoiceItemRepository;

    public InvoiceItem saveItem(InvoiceItem item){
        return invoiceItemRepository.save(item);
    }
    
    public List<InvoiceItem> getItemsByInvoice(Long invoiceId){
        return invoiceItemRepository.findByInvoiceId(invoiceId);
    }
}