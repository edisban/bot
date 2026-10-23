package com.bot.botback.util;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtUtilTest {
    @Test
    void generatesValidToken() {
        JwtUtil jwt = new JwtUtil();
        ReflectionTestUtils.setField(jwt, "secret", "change-me-secret-key-please-32chars!");
        ReflectionTestUtils.setField(jwt, "expirationMs", 86400000L);
        String t = jwt.generate("user");
        assertTrue(jwt.isValid(t));
    }
}
