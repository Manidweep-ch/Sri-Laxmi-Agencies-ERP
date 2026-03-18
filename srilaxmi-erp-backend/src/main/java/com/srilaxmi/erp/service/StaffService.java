package com.srilaxmi.erp.service;

import com.srilaxmi.erp.entity.SalaryPayment;
import com.srilaxmi.erp.entity.Staff;
import com.srilaxmi.erp.entity.User;
import com.srilaxmi.erp.repository.CashDepositRepository;
import com.srilaxmi.erp.repository.PaymentRepository;
import com.srilaxmi.erp.repository.SalaryPaymentRepository;
import com.srilaxmi.erp.repository.StaffRepository;
import com.srilaxmi.erp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class StaffService {

    @Autowired private StaffRepository staffRepository;
    @Autowired private SalaryPaymentRepository salaryPaymentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private CashDepositRepository cashDepositRepository;

    public List<Staff> getAllStaff() {
        // Exclude staff linked to ADMIN or OWNER role users — they appear in the admins tab only
        List<User> adminUsers = new ArrayList<>();
        adminUsers.addAll(userRepository.findByRoleName("OWNER"));
        adminUsers.addAll(userRepository.findByRoleName("ADMIN"));
        List<Long> adminUserIds = adminUsers.stream().map(User::getId).collect(java.util.stream.Collectors.toList());
        return staffRepository.findAll().stream()
            .filter(s -> s.getUser() == null || !adminUserIds.contains(s.getUser().getId()))
            .collect(java.util.stream.Collectors.toList());
    }

    public List<Staff> getDrivers() {
        return staffRepository.findByDesignationIgnoreCaseAndActiveTrue("Driver");
    }

    public List<Staff> getOwnerAdminStaff() {
        List<User> adminUsers = new ArrayList<>();
        adminUsers.addAll(userRepository.findByRoleName("OWNER"));
        adminUsers.addAll(userRepository.findByRoleName("ADMIN"));
        List<Long> adminUserIds = adminUsers.stream().map(User::getId).collect(java.util.stream.Collectors.toList());
        if (adminUserIds.isEmpty()) return new ArrayList<>();
        return staffRepository.findAll().stream()
            .filter(s -> s.getUser() != null && adminUserIds.contains(s.getUser().getId()))
            .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void deleteStaff(Long id) {
        Staff staff = getById(id);
        // Check wallet balance — must be zero before deletion
        BigDecimal totalReceived = paymentRepository.sumByReceivedById(id);
        BigDecimal totalTransferred = cashDepositRepository.sumByStaffId(id);
        BigDecimal walletBalance = totalReceived.subtract(totalTransferred);
        if (walletBalance.compareTo(BigDecimal.ZERO) > 0) {
            throw new IllegalStateException(
                "Staff wallet balance is Rs." + walletBalance + ". Transfer all funds before deleting."
            );
        }
        // Unlink user account
        if (staff.getUser() != null) {
            User user = staff.getUser();
            staff.setUser(null);
            staffRepository.save(staff);
            userRepository.delete(user);
        }
        staffRepository.delete(staff);
    }

    public Map<String, String> getOwnerDefaults() {
        // Find staff linked to an OWNER or ADMIN role user
        List<User> owners = userRepository.findByRoleName("OWNER");
        if (owners.isEmpty()) owners = userRepository.findByRoleName("ADMIN");
        Map<String, String> result = new HashMap<>();
        for (User u : owners) {
            staffRepository.findAll().stream()
                .filter(s -> s.getUser() != null && s.getUser().getId().equals(u.getId()))
                .findFirst()
                .ifPresent(s -> {
                    result.put("ownerName", s.getName());
                    result.put("phone", s.getPhone() != null ? s.getPhone() : "");
                });
            if (!result.isEmpty()) break;
        }
        // Fallback: use username if no staff record linked
        if (result.isEmpty() && !owners.isEmpty()) {
            result.put("ownerName", owners.get(0).getUsername());
            result.put("phone", "");
        }
        return result;
    }

    public Staff getById(Long id) {
        return staffRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Staff not found: " + id));
    }

    @Transactional
    public Staff createStaff(Staff staff) {
        if (staff.getName() == null || staff.getName().isBlank())
            throw new IllegalArgumentException("Staff name is required");

        // Determine if this staff is linked to an ADMIN/OWNER user
        boolean isAdminOrOwner = false;
        if (staff.getUser() != null && staff.getUser().getId() != null) {
            User user = userRepository.findById(staff.getUser().getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
            staff.setUser(user);
            String roleName = user.getRole() != null ? user.getRole().getName() : "";
            isAdminOrOwner = "ADMIN".equals(roleName) || "OWNER".equals(roleName);
        } else {
            staff.setUser(null);
        }

        if (!isAdminOrOwner) {
            // Only regular staff get emp ID and join date
            if (staff.getJoinDate() == null)
                staff.setJoinDate(LocalDate.now());
            long count = staffRepository.count() + 1;
            staff.setEmployeeId(String.format("EMP-%03d", count));
        } else {
            // Admin/Owner: no emp ID, no join date
            staff.setEmployeeId(null);
            staff.setJoinDate(null);
            staff.setMonthlySalary(null);
        }

        return staffRepository.save(staff);
    }

    @Transactional
    public Staff updateStaff(Long id, Staff updated) {
        Staff staff = getById(id);
        if (updated.getName() != null && !updated.getName().isBlank())
            staff.setName(updated.getName());
        if (updated.getPhone() != null) staff.setPhone(updated.getPhone());
        if (updated.getEmail() != null) staff.setEmail(updated.getEmail());
        if (updated.getDesignation() != null) staff.setDesignation(updated.getDesignation());
        if (updated.getJoinDate() != null) staff.setJoinDate(updated.getJoinDate());
        if (updated.getMonthlySalary() != null) staff.setMonthlySalary(updated.getMonthlySalary());
        if (updated.getUser() != null && updated.getUser().getId() != null) {
            User user = userRepository.findById(updated.getUser().getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
            staff.setUser(user);
        }
        return staffRepository.save(staff);
    }

    public Staff setActive(Long id, boolean active) {
        Staff staff = getById(id);
        staff.setActive(active);
        return staffRepository.save(staff);
    }

    // ── Salary ────────────────────────────────────────────────────────────────

    @Transactional
    public SalaryPayment paySalary(Long staffId, SalaryPayment payment) {
        Staff staff = getById(staffId);
        if (payment.getAmount() == null || payment.getAmount().compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("Amount must be greater than zero");
        if (payment.getMonth() < 1 || payment.getMonth() > 12)
            throw new IllegalArgumentException("Invalid month");
        if (payment.getYear() < 2000)
            throw new IllegalArgumentException("Invalid year");
        if (payment.getPaymentDate() == null)
            payment.setPaymentDate(LocalDate.now());

        payment.setStaff(staff);
        return salaryPaymentRepository.save(payment);
    }

    public List<SalaryPayment> getSalaryHistory(Long staffId) {
        return salaryPaymentRepository.findByStaffIdOrderByYearDescMonthDesc(staffId);
    }

    public Map<String, Object> getSalarySummary(Long staffId) {
        Staff staff = getById(staffId);
        int currentYear = LocalDate.now().getYear();
        int currentMonth = LocalDate.now().getMonthValue();

        BigDecimal paidThisYear = salaryPaymentRepository.sumByStaffIdAndYear(staffId, currentYear);
        BigDecimal totalPaid = salaryPaymentRepository.sumByStaffId(staffId);
        List<SalaryPayment> history = salaryPaymentRepository.findByStaffIdOrderByYearDescMonthDesc(staffId);
        List<SalaryPayment> thisYear = salaryPaymentRepository.findByStaffIdAndYear(staffId, currentYear);
        int monthsPaid = thisYear.size();

        // Outstanding = salary owed from join date up to current month (this year only)
        // If joined in a previous year, all months this year are owed
        // If joined this year, only months from join month onwards
        int monthsOwedThisYear = currentMonth;
        if (staff.getJoinDate() != null && staff.getJoinDate().getYear() == currentYear) {
            monthsOwedThisYear = currentMonth - staff.getJoinDate().getMonthValue() + 1;
            if (monthsOwedThisYear < 0) monthsOwedThisYear = 0;
        } else if (staff.getJoinDate() != null && staff.getJoinDate().getYear() > currentYear) {
            monthsOwedThisYear = 0; // hasn't joined yet
        }

        BigDecimal outstanding = staff.getMonthlySalary() != null
            ? staff.getMonthlySalary().multiply(BigDecimal.valueOf(monthsOwedThisYear)).subtract(paidThisYear)
            : BigDecimal.ZERO;

        Map<String, Object> summary = new HashMap<>();
        summary.put("staffId", staffId);
        summary.put("name", staff.getName());
        summary.put("monthlySalary", staff.getMonthlySalary());
        summary.put("joinDate", staff.getJoinDate());
        summary.put("paidThisYear", paidThisYear);
        summary.put("totalPaid", totalPaid);
        summary.put("monthsPaidThisYear", monthsPaid);
        summary.put("monthsOwedThisYear", monthsOwedThisYear);
        summary.put("outstandingThisYear", outstanding.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : outstanding);
        summary.put("lastPayment", history.isEmpty() ? null : history.get(0));
        return summary;
    }
}
