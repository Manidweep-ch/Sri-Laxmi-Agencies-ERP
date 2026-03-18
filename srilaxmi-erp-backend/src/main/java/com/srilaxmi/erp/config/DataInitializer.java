package com.srilaxmi.erp.config;

import com.srilaxmi.erp.entity.Role;
import com.srilaxmi.erp.entity.User;
import com.srilaxmi.erp.repository.RoleRepository;
import com.srilaxmi.erp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds roles and a default ADMIN user on first startup if they don't exist.
 * Default admin: username=admin, password=admin123 — change after first login.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private static final List<String> ROLES = List.of(
        "ADMIN", "OWNER", "MANAGER", "SALES", "ACCOUNTS", "WAREHOUSE", "DRIVER"
    );

    @Override
    public void run(String... args) {
        // Seed roles
        for (String roleName : ROLES) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                Role role = new Role();
                role.setName(roleName);
                roleRepository.save(role);
            }
        }

        Role adminRole = roleRepository.findByName("ADMIN")
            .orElseThrow(() -> new RuntimeException("ADMIN role not found"));

        // Seed default admin user if no users exist
        if (userRepository.count() == 0) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole(adminRole);
            admin.setActive(true);
            userRepository.save(admin);
            System.out.println("=== Default admin created: username=admin, password=admin123 ===");
        }

        // Fix any existing users that have no role — assign ADMIN so they aren't locked out
        for (User u : userRepository.findAll()) {
            if (u.getRole() == null) {
                u.setRole(adminRole);
                userRepository.save(u);
                System.out.println("=== Assigned ADMIN role to existing user: " + u.getUsername() + " ===");
            }
        }
    }
}
