package com.bot.botback.controller;

import com.bot.botback.model.User;
import com.bot.botback.repository.UserRepository;
import com.bot.botback.util.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        if (username == null || password == null) return ResponseEntity.badRequest().body("missing credentials");
        if (userRepository.findByUsername(username).isPresent()) return ResponseEntity.badRequest().body("user exists");
        User u = new User();
        u.setUsername(username);
        u.setPasswordHash(encoder.encode(password));
        userRepository.save(u);
        return ResponseEntity.ok(Map.of("token", jwtUtil.generate(username), "userId", u.getId(), "username", username));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        return userRepository.findByUsername(username)
                .filter(u -> encoder.matches(password, u.getPasswordHash()))
                .map(u -> ResponseEntity.ok(Map.of("token", jwtUtil.generate(username), "userId", u.getId(), "username", username)))
                .orElse(ResponseEntity.status(401).body(Map.of("error", "invalid credentials")));
    }
}
