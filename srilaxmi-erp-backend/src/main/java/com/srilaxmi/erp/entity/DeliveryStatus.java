package com.srilaxmi.erp.entity;

public enum DeliveryStatus {
    DRAFT,
    CONFIRMED,
    DELIVERED,    // Driver confirmed goods reached customer → SO set to SHIPPED
    RETURNED,     // Vehicle returned to base after delivery (post-DELIVERED)
    CANCELLED     // Goods not sent — vehicle re-assignable
}
