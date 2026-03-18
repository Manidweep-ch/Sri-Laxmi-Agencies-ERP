package com.srilaxmi.erp.controller;

import com.srilaxmi.erp.security.JwtUtil;
import com.srilaxmi.erp.repository.UserRepository;
import com.srilaxmi.erp.entity.User;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> body) {
        if (body == null) throw new IllegalArgumentException("Request body cannot be null");

        String username = body.get("username");
        String password = body.get("password");

        if (username == null || username.isEmpty()) throw new IllegalArgumentException("Username is required");
        if (password == null || password.isEmpty()) throw new IllegalArgumentException("Password is required");

        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Invalid username or password"));

        if (!user.isActive()) throw new RuntimeException("User account is inactive");

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid username or password");
        }

        String token = jwtUtil.generateToken(username);

        Map<String, String> response = new HashMap<>();
        response.put("token", token);
        response.put("username", username);
        response.put("userId", user.getId() != null ? user.getId().toString() : "");
        response.put("role", user.getRole() != null ? user.getRole().getName() : "USER");
        return response;
    }

    @GetMapping("/me")
    public Map<String, String> me() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        Map<String, String> response = new HashMap<>();
        response.put("username", username);
        response.put("userId", user.getId() != null ? user.getId().toString() : "");
        response.put("role", user.getRole() != null ? user.getRole().getName() : "USER");
        return response;
    }
}
