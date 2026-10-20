package com.bot.botback.controller;

import com.bot.botback.service.AiService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final AiService aiService;

    public HealthController(AiService aiService) {
        this.aiService = aiService;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.put("geminiConfigured", aiService.isGeminiConfigured());
        return body;
    }
}
