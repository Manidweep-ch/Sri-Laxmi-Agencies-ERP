package com.srilaxmi.erp.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.srilaxmi.erp.entity.SalesReturn;
import com.srilaxmi.erp.entity.SalesReturnRefund;
import com.srilaxmi.erp.repository.SalesReturnRefundRepository;
import com.srilaxmi.erp.repository.SalesReturnRepository;

@Service
public class SalesReturnRefundService {

    @Autowired private SalesReturnRefundRepository refundRepository;
    @Autowired private SalesReturnRepository salesReturnRepository;

    @Transactional
    public SalesReturnRefund recordRefund(Long returnId, SalesReturnRefund refund) {
        if (returnId == null) throw new IllegalArgumentException("Return ID cannot be null");
        if (refund.getAmount() == null || refund.getAmount().compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("Refund amount must be greater than zero");

        SalesReturn salesReturn = salesReturnRepository.findById(returnId)
            .orElseThrow(() -> new RuntimeException("Sales Return not found"));

        BigDecimal totalRefunded = refundRepository.sumBySalesReturnId(returnId);
        BigDecimal maxRefundable = salesReturn.getTotalAmount() != null ? salesReturn.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal remaining = maxRefundable.subtract(totalRefunded);

        if (refund.getAmount().compareTo(remaining) > 0)
            throw new RuntimeException("Refund amount exceeds remaining refundable amount of ₹" + remaining);

        if (refund.getRefundDate() == null)
            refund.setRefundDate(LocalDate.now());

        refund.setSalesReturn(salesReturn);
        return refundRepository.save(refund);
    }

    public List<SalesReturnRefund> getRefundsByReturn(Long returnId) {
        return refundRepository.findBySalesReturnId(returnId);
    }

    public BigDecimal getTotalRefunded(Long returnId) {
        return refundRepository.sumBySalesReturnId(returnId);
    }
}
