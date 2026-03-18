package com.srilaxmi.erp.repository;

import com.srilaxmi.erp.entity.DeliveryDriver;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DeliveryDriverRepository extends JpaRepository<DeliveryDriver, Long> {
    List<DeliveryDriver> findByDeliveryId(Long deliveryId);
    void deleteByDeliveryId(Long deliveryId);
}
