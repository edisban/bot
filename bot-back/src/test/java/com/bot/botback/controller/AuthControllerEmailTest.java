package com.bot.botback.controller;

import com.bot.botback.dto.LoginRequest;
import com.bot.botback.model.User;
import com.bot.botback.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthControllerEmailTest {

    @Test
    void registerCreatesUserWithoutEmail() {
        UserRepository userRepository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        AuthController controller = new AuthController(userRepository, passwordEncoder);

        when(userRepository.findByUsername("alex")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret123")).thenReturn("hashed-pass");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(1L);
            return user;
        });

        LoginRequest request = new LoginRequest();
        request.setUsername("alex");
        request.setPassword("secret123");

        ResponseEntity<Map<String, Object>> response = controller.register(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("alex", response.getBody().get("username"));
        assertEquals(1L, response.getBody().get("userId"));
    }
}
