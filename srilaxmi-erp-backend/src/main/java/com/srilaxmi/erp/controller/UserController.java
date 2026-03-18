package com.srilaxmi.erp.controller;

import com.srilaxmi.erp.entity.Role;
import com.srilaxmi.erp.entity.User;
import com.srilaxmi.erp.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired private UserService userService;

    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.getUserById(id);
    }

    @PostMapping
    public User createUser(@RequestBody User user) {
        return userService.createUser(user);
    }

    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User user) {
        return userService.updateUser(id, user);
    }

    @PutMapping("/{id}/active")
    public User setActive(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        return userService.setActive(id, body.get("active"));
    }

    @GetMapping("/roles")
    public List<Role> getRoles() {
        return userService.getAllRoles();
    }

    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
    }
}
