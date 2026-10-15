package com.bot.botback.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    private final RestClient restClient;

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.model:gemini-3.8-flash}")
    private String model;

    private static final int MAX_RETRIES = 3;
    private static final long RETRY_DELAY_MS = 2000;

    public GeminiService() {
        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .build();
    }

    public String generateReply(String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            return "Please provide a message to continue.";
        }

        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Gemini API key is missing; returning a fallback reply instead of failing the request.");
            return "AI is unavailable right now because the Gemini API key is not configured. Add GEMINI_API_KEY to enable live responses.";
        }

        try {
            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(Map.of("text", userMessage)))
                    )
            );

            RestClientException lastException = null;
            for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    return callGemini(requestBody);
                } catch (RestClientException e) {
                    lastException = e;
                    log.warn("Gemini attempt {}/{} failed: {}", attempt, MAX_RETRIES, e.getMessage());
                    if (attempt < MAX_RETRIES) {
                        try {
                            Thread.sleep(RETRY_DELAY_MS * attempt);
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                            break;
                        }
                    }
                }
            }
            log.error("Gemini call failed after {} attempts: {}", MAX_RETRIES, lastException.getMessage(), lastException);
            return "AI is unavailable right now. The Gemini API request failed or the key is invalid.";
        } catch (IllegalStateException e) {
            log.error("Gemini call failed: {}", e.getMessage(), e);
            return "AI is unavailable right now. The Gemini API request failed or the key is invalid.";
        }
    }

    private String callGemini(Map<String, Object> requestBody) {
        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri("/v1/models/{model}:generateContent?key={apiKey}", model, apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(Map.class);

        if (response == null || response.get("candidates") == null) {
            throw new IllegalStateException("Gemini response did not contain candidates");
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");

        if (candidates == null || candidates.isEmpty()) {
            throw new IllegalStateException("Gemini response was empty");
        }

        Map<String, Object> candidate = candidates.get(0);
        @SuppressWarnings("unchecked")
        Map<String, Object> content = (Map<String, Object>) candidate.get("content");

        if (content == null || content.get("parts") == null) {
            throw new IllegalStateException("Gemini response content was empty");
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");

        StringBuilder reply = new StringBuilder();
        for (Map<String, Object> part : parts) {
            if (part.get("text") != null) {
                reply.append(part.get("text"));
            }
        }

        String finalReply = reply.toString().trim();
        return finalReply.isBlank() ? "I couldn't generate a response right now." : finalReply;
    }
}
