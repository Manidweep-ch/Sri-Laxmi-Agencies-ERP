package com.srilaxmi.erp.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.srilaxmi.erp.dto.OutstandingResponse;
import com.srilaxmi.erp.entity.Payment;
import com.srilaxmi.erp.service.PaymentService;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @PostMapping
    public Payment createPayment(@RequestBody Payment payment){
        return paymentService.savePayment(payment);
    }

    @GetMapping("/invoice/{invoiceId}")
    public List<Payment> getPayments(@PathVariable Long invoiceId){
        return paymentService.getPaymentsByInvoice(invoiceId);
    }
    
    @GetMapping("/invoice/{invoiceId}/outstanding")
    public OutstandingResponse getOutstanding(@PathVariable Long invoiceId)
    {
    	return paymentService.getOutstanding(invoiceId);
    }
    
    @GetMapping
    public List<Payment> getAllPayments(){
        return paymentService.getAllPayments();
    }
}