package com.srilaxmi.erp.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.srilaxmi.erp.entity.User;
import com.srilaxmi.erp.repository.UserRepository;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public User createUser(User user){
            if (user == null) {
                throw new IllegalArgumentException("User cannot be null");
            }
            if (user.getPassword() == null || user.getPassword().isEmpty()) {
                throw new IllegalArgumentException("Password cannot be null or empty");
            }
            // Hash the password before saving
            user.setPassword(passwordEncoder.encode(user.getPassword()));
            return userRepository.save(user);
        }

}