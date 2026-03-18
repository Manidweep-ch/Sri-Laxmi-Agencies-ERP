package com.srilaxmi.erp.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.entity.Role;
import com.srilaxmi.erp.entity.User;
import com.srilaxmi.erp.repository.RoleRepository;
import com.srilaxmi.erp.repository.StaffRepository;
import com.srilaxmi.erp.repository.UserRepository;

import java.util.List;

@Service
public class UserService {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private RoleRepository roleRepository;
    @Autowired private StaffRepository staffRepository;

    public User createUser(User user) {
        if (user == null) throw new IllegalArgumentException("User cannot be null");
        if (user.getUsername() == null || user.getUsername().isBlank())
            throw new IllegalArgumentException("Username is required");
        if (user.getPassword() == null || user.getPassword().isBlank())
            throw new IllegalArgumentException("Password is required");
        if (userRepository.findByUsername(user.getUsername()).isPresent())
            throw new IllegalArgumentException("Username already exists");

        // Resolve role by name if only name is provided
        if (user.getRole() != null && user.getRole().getId() == null && user.getRole().getName() != null) {
            Role role = roleRepository.findByName(user.getRole().getName())
                .orElseThrow(() -> new RuntimeException("Role not found: " + user.getRole().getName()));
            user.setRole(role);
        }

        // Enforce only one OWNER
        if (user.getRole() != null && "OWNER".equals(user.getRole().getName())) {
            if (!userRepository.findByRoleName("OWNER").isEmpty())
                throw new IllegalArgumentException("An Owner account already exists. Only one Owner is allowed.");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User saved = userRepository.save(user);

        // Link staff if staffId provided
        if (user.getStaffId() != null) {
            staffRepository.findById(user.getStaffId()).ifPresent(s -> {
                s.setUser(saved);
                staffRepository.save(s);
            });
        }
        return saved;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User updateUser(Long id, User updated) {
        User user = getUserById(id);
        if (updated.getUsername() != null && !updated.getUsername().isBlank())
            user.setUsername(updated.getUsername());
        if (updated.getPassword() != null && !updated.getPassword().isBlank())
            user.setPassword(passwordEncoder.encode(updated.getPassword()));
  
        if (updated.getRole() != null) {
            if (updated.getRole().getId() != null) {
                Role role = roleRepository.findById(updated.getRole().getId())
                    .orElseThrow(() -> new RuntimeException("Role not found"));
                user.setRole(role);
            } else if (updated.getRole().getName() != null) {
                // Enforce single OWNER on update
                if ("OWNER".equals(updated.getRole().getName())) {
                    List<User> existingOwners = userRepository.findByRoleName("OWNER");
                    boolean alreadyOwner = existingOwners.stream().anyMatch(o -> o.getId().equals(id));
                    if (!alreadyOwner && !existingOwners.isEmpty())
                        throw new IllegalArgumentException("An Owner account already exists. Only one Owner is allowed.");
                }
                Role role = roleRepository.findByName(updated.getRole().getName())
                    .orElseThrow(() -> new RuntimeException("Role not found: " + updated.getRole().getName()));
                user.setRole(role);
            }
        }
        User saved = userRepository.save(user);

        // Handle staff link if staffId provided
        if (updated.getStaffId() != null) {
            // Unlink any existing staff linked to this user
            staffRepository.findAll().stream()
                .filter(s -> s.getUser() != null && s.getUser().getId().equals(id))
                .forEach(s -> { s.setUser(null); staffRepository.save(s); });
            // Link new staff
            staffRepository.findById(updated.getStaffId()).ifPresent(s -> {
                s.setUser(saved);
                staffRepository.save(s);
            });
        }
        return saved;
    }

    public User setActive(Long id, boolean active) {
        User user = getUserById(id);
        user.setActive(active);
        return userRepository.save(user);
    }

    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    public void deleteUser(Long id) {
        User user = getUserById(id);
        // Unlink from any staff record before deleting
        staffRepository.findAll().stream()
            .filter(s -> s.getUser() != null && s.getUser().getId().equals(id))
            .forEach(s -> { s.setUser(null); staffRepository.save(s); });
        userRepository.delete(user);
    }
}
