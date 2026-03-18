package com.srilaxmi.erp.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "deliveries")
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "sales_order_id")
    @JsonIgnoreProperties({"items", "payments"})
    private SalesOrder salesOrder;

    @ManyToOne
    @JoinColumn(name = "invoice_id")
    @JsonIgnoreProperties({"items", "payments"})
    private Invoice invoice;

    // Own fleet vehicle (null if porter)
    @ManyToOne
    @JoinColumn(name = "vehicle_id")
    @JsonIgnoreProperties({"deliveries"})
    private Vehicle vehicle;

    // For hired porter — just store the vehicle number as text
    private String porterVehicleNumber;
    private String porterName;

    @Enumerated(EnumType.STRING)
    private DeliveryStatus status = DeliveryStatus.DRAFT;

    private LocalDate assignedDate;
    private LocalDate deliveredDate;

    private String notes;

    // Total transport charge for this delivery (split among drivers)
    private BigDecimal transportCharge;

    @OneToMany(mappedBy = "delivery", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("delivery")
    private List<DeliveryDriver> drivers = new ArrayList<>();

    public Delivery() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public SalesOrder getSalesOrder() { return salesOrder; }
    public void setSalesOrder(SalesOrder salesOrder) { this.salesOrder = salesOrder; }

    public Invoice getInvoice() { return invoice; }
    public void setInvoice(Invoice invoice) { this.invoice = invoice; }

    public Vehicle getVehicle() { return vehicle; }
    public void setVehicle(Vehicle vehicle) { this.vehicle = vehicle; }

    public String getPorterVehicleNumber() { return porterVehicleNumber; }
    public void setPorterVehicleNumber(String porterVehicleNumber) { this.porterVehicleNumber = porterVehicleNumber; }

    public String getPorterName() { return porterName; }
    public void setPorterName(String porterName) { this.porterName = porterName; }

    public DeliveryStatus getStatus() { return status; }
    public void setStatus(DeliveryStatus status) { this.status = status; }

    public LocalDate getAssignedDate() { return assignedDate; }
    public void setAssignedDate(LocalDate assignedDate) { this.assignedDate = assignedDate; }

    public LocalDate getDeliveredDate() { return deliveredDate; }
    public void setDeliveredDate(LocalDate deliveredDate) { this.deliveredDate = deliveredDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public BigDecimal getTransportCharge() { return transportCharge; }
    public void setTransportCharge(BigDecimal transportCharge) { this.transportCharge = transportCharge; }

    public List<DeliveryDriver> getDrivers() { return drivers; }
    public void setDrivers(List<DeliveryDriver> drivers) { this.drivers = drivers; }
}
