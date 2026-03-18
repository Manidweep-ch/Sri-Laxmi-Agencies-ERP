package com.srilaxmi.erp.repository;

import com.srilaxmi.erp.entity.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {
    Optional<Delivery> findBySalesOrderId(Long salesOrderId);
    List<Delivery> findAllByOrderByIdDesc();

    // All deliveries assigned to a specific driver (staff)
    @Query("SELECT d FROM Delivery d JOIN d.drivers dd WHERE dd.staff.id = :staffId ORDER BY d.id DESC")
    List<Delivery> findByDriverStaffId(@Param("staffId") Long staffId);

    // Active (CONFIRMED) deliveries for a driver
    @Query("SELECT d FROM Delivery d JOIN d.drivers dd WHERE dd.staff.id = :staffId AND d.status = 'CONFIRMED' ORDER BY d.id DESC")
    List<Delivery> findActiveByDriverStaffId(@Param("staffId") Long staffId);
}
