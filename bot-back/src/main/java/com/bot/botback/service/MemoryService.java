package com.bot.botback.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class MemoryService {

    private static final Logger log = LoggerFactory.getLogger(MemoryService.class);

    private final String memoryServiceUrl;
    private final String serviceToken;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public MemoryService(@Value("${memory.service.url}") String memoryServiceUrl,
                         @Value("${memory.service.token}") String serviceToken) {
        this.memoryServiceUrl = memoryServiceUrl;
        this.serviceToken = serviceToken;
        this.objectMapper = new ObjectMapper();
        this.restClient = RestClient.builder()
                .baseUrl(memoryServiceUrl)
                .requestFactory(requestFactory())
                .build();
    }

    private static org.springframework.http.client.ClientHttpRequestFactory requestFactory() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(10));
        return factory;
    }

    public List<String> searchFacts(Long userId, String query, int limit) {
        try {
            Map<String, Object> payload = Map.of(
                    "query", query == null ? "" : query,
                    "user_id", userId,
                    "limit", limit);

            String response = restClient.post()
                    .uri("/search")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-Service-Token", serviceToken)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            if (response == null || response.isBlank()) {
                return List.of();
            }

            JsonNode root = objectMapper.readTree(response);
            List<String> facts = new ArrayList<>();
            for (JsonNode node : root) {
                JsonNode fact = node.get("fact");
                if (fact != null && !fact.asText().isBlank()) {
                    facts.add(fact.asText());
                }
            }
            return facts;
        } catch (Exception e) {
            log.warn("Memory search failed for user {}: {}", userId, e.getMessage());
            return List.of();
        }
    }

    public void ingestFact(Long userId, String fact, String category) {
        if (fact == null || fact.isBlank()) {
            return;
        }
        try {
            URI uri = UriComponentsBuilder.fromUriString(memoryServiceUrl + "/ingest")
                    .queryParam("user_id", userId)
                    .queryParam("message", fact)
                    .queryParam("category", category == null ? "General" : category)
                    .build()
                    .encode()
                    .toUri();

            restClient.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-Service-Token", serviceToken)
                    .retrieve()
                    .toBodilessEntity();

            log.info("Ingested fact for user {}", userId);
        } catch (Exception e) {
            log.warn("Memory ingest failed for user {}: {}", userId, e.getMessage());
        }
    }
}
