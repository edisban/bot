package com.bot.botback.service;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertTrue;

class GeminiServiceTest {

    @Test
    void generateReplyReturnsFallbackWhenApiKeyMissing() {
        GeminiService service = new GeminiService();
        ReflectionTestUtils.setField(service, "apiKey", "");

        String reply = service.generateReply("Hello there");

        assertTrue(reply.contains("not configured") || reply.contains("unavailable") || reply.contains("API key"));
    }
}
