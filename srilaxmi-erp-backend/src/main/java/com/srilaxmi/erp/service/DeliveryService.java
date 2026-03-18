package com.srilaxmi.erp.service;

import com.srilaxmi.erp.entity.*;
import com.srilaxmi.erp.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class DeliveryService {

    @Autowired private DeliveryRepository deliveryRepository;
    @Autowired private DeliveryDriverRepository deliveryDriverRepository;
    @Autowired private VehicleRepository vehicleRepository;
    @Autowired private StaffRepository staffRepository;
    @Autowired private InvoiceRepository invoiceRepository;
    @Autowired private SalesOrderRepository salesOrderRepository;

    public List<Delivery> getAll() {
        return deliveryRepository.findAllByOrderByIdDesc();
    }

    public Optional<Delivery> getBySalesOrderId(Long soId) {
        return deliveryRepository.findBySalesOrderId(soId);
    }

    public Delivery getById(Long id) {
        return deliveryRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Delivery not found: " + id));
    }

    public List<Delivery> getByDriverStaffId(Long staffId) {
        return deliveryRepository.findByDriverStaffId(staffId);
    }

    public List<Delivery> getActiveByDriverStaffId(Long staffId) {
        return deliveryRepository.findActiveByDriverStaffId(staffId);
    }

    @Transactional
    public Delivery createOrUpdate(Delivery payload) {
        Delivery delivery;
        boolean isNew = (payload.getId() == null);

        if (!isNew) {
            delivery = getById(payload.getId());
            // Allow re-assignment only for DRAFT or CANCELLED
            if (delivery.getStatus() != DeliveryStatus.DRAFT
                    && delivery.getStatus() != DeliveryStatus.CANCELLED) {
                throw new IllegalStateException("Cannot edit a confirmed or completed delivery");
            }
        } else {
            delivery = new Delivery();
            delivery.setAssignedDate(LocalDate.now());
        }

        // Resolve SO
        if (payload.getSalesOrder() != null && payload.getSalesOrder().getId() != null) {
            SalesOrder so = salesOrderRepository.findById(payload.getSalesOrder().getId())
                .orElseThrow(() -> new RuntimeException("Sales Order not found"));
            delivery.setSalesOrder(so);
        }

        // Resolve Invoice
        if (payload.getInvoice() != null && payload.getInvoice().getId() != null) {
            Invoice inv = invoiceRepository.findById(payload.getInvoice().getId())
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
            delivery.setInvoice(inv);
        }

        // Resolve own vehicle (optional — null if porter)
        if (payload.getVehicle() != null && payload.getVehicle().getId() != null) {
            Vehicle v = vehicleRepository.findById(payload.getVehicle().getId())
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
            delivery.setVehicle(v);
        } else {
            delivery.setVehicle(null);
        }

        delivery.setPorterVehicleNumber(payload.getPorterVehicleNumber());
        delivery.setPorterName(payload.getPorterName());
        delivery.setNotes(payload.getNotes());
        delivery.setTransportCharge(payload.getTransportCharge());
        delivery.setStatus(DeliveryStatus.DRAFT);

        Delivery saved = deliveryRepository.save(delivery);

        // Replace drivers
        deliveryDriverRepository.deleteByDeliveryId(saved.getId());
        if (payload.getDrivers() != null) {
            for (DeliveryDriver dd : payload.getDrivers()) {
                if (dd.getStaff() == null || dd.getStaff().getId() == null) continue;
                Staff staff = staffRepository.findById(dd.getStaff().getId())
                    .orElseThrow(() -> new RuntimeException("Staff not found"));
                DeliveryDriver newDd = new DeliveryDriver();
                newDd.setDelivery(saved);
                newDd.setStaff(staff);
                newDd.setShareAmount(dd.getShareAmount());
                deliveryDriverRepository.save(newDd);
            }
        }

        return getById(saved.getId());
    }

    @Transactional
    public Delivery confirm(Long id) {
        Delivery delivery = getById(id);
        if (delivery.getStatus() != DeliveryStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT deliveries can be confirmed");
        }
        delivery.setStatus(DeliveryStatus.CONFIRMED);

        // Mark own vehicle as ON_TRIP
        if (delivery.getVehicle() != null) {
            delivery.getVehicle().setStatus(VehicleStatus.ON_TRIP);
            vehicleRepository.save(delivery.getVehicle());
        }

        return deliveryRepository.save(delivery);
    }

    @Transactional
    public Delivery markDelivered(Long id) {
        Delivery delivery = getById(id);
        if (delivery.getStatus() != DeliveryStatus.CONFIRMED) {
            throw new IllegalStateException("Only CONFIRMED deliveries can be marked delivered");
        }
        delivery.setStatus(DeliveryStatus.DELIVERED);
        delivery.setDeliveredDate(LocalDate.now());

        // Update SO goods status to SHIPPED — driver confirmed goods reached customer
        if (delivery.getSalesOrder() != null) {
            SalesOrder so = delivery.getSalesOrder();
            so.setStatus(SalesOrderStatus.SHIPPED);
            salesOrderRepository.save(so);
        }

        return deliveryRepository.save(delivery);
    }

    // Vehicle returned to base after delivery — does NOT change SO status
    @Transactional
    public Delivery markVehicleReturned(Long id) {
        Delivery delivery = getById(id);
        if (delivery.getStatus() != DeliveryStatus.DELIVERED) {
            throw new IllegalStateException("Only DELIVERED deliveries can be marked as vehicle returned");
        }
        delivery.setStatus(DeliveryStatus.RETURNED);

        // Free the vehicle
        if (delivery.getVehicle() != null) {
            delivery.getVehicle().setStatus(VehicleStatus.AVAILABLE);
            vehicleRepository.save(delivery.getVehicle());
        }

        return deliveryRepository.save(delivery);
    }

    // Goods never sent — free vehicle, allow re-assignment
    @Transactional
    public Delivery markCancelled(Long id) {
        Delivery delivery = getById(id);
        if (delivery.getStatus() != DeliveryStatus.CONFIRMED) {
            throw new IllegalStateException("Only CONFIRMED deliveries can be cancelled");
        }
        delivery.setStatus(DeliveryStatus.CANCELLED);

        // Free the vehicle
        if (delivery.getVehicle() != null) {
            delivery.getVehicle().setStatus(VehicleStatus.AVAILABLE);
            vehicleRepository.save(delivery.getVehicle());
        }

        return deliveryRepository.save(delivery);
    }

    @Transactional
    public Delivery markReturned(Long id) {
        // Legacy — redirect to markVehicleReturned
        return markVehicleReturned(id);
    }
}
