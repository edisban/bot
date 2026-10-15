package com.bot.botback.service;

import com.bot.botback.model.MemoryVault;
import com.bot.botback.model.Reminder;
import com.bot.botback.repository.MemoryVaultRepository;
import com.bot.botback.repository.ReminderRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AiService {

    private final MemoryVaultRepository memoryVaultRepository;
    private final ReminderRepository reminderRepository;
    private final RestClient restClient;

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.model:gemini-1.5-flash}")
    private String modelName;

    public AiService(MemoryVaultRepository memoryVaultRepository, ReminderRepository reminderRepository) {
        this.memoryVaultRepository = memoryVaultRepository;
        this.reminderRepository = reminderRepository;
        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .build();
    }

    public String generateReply(Long userId, String userMessage) {
        List<String> relatedFacts = getRelevantFacts(userId, userMessage);
        String prompt = buildPrompt(userMessage, relatedFacts);

        if (apiKey != null && !apiKey.isBlank()) {
            try {
                return callGemini(prompt);
            } catch (Exception ignored) {
                // Fall back gracefully if Gemini is unreachable.
            }
        }

        return buildLocalReply(userMessage, relatedFacts);
    }

    public void extractReminderIfPresent(Long userId, String rawMessage) {
        if (rawMessage == null || rawMessage.isBlank()) {
            return;
        }

        String lower = rawMessage.toLowerCase(Locale.ROOT);
        boolean containsDateSignal = lower.contains("tomorrow")
                || lower.contains("today")
                || lower.contains("monday")
                || lower.contains("tuesday")
                || lower.contains("wednesday")
                || lower.contains("thursday")
                || lower.contains("friday")
                || lower.contains("saturday")
                || lower.contains("sunday")
                || lower.contains("next")
                || lower.matches(".*\\b\\d{1,2}(:\\d{2})?\\s*(am|pm)?\\b.*");

        if (!containsDateSignal) {
            return;
        }

        OffsetDateTime scheduledAt = parseDateTime(rawMessage);
        if (scheduledAt == null) {
            return;
        }

        String title = rawMessage.length() > 80
                ? rawMessage.substring(0, 80).trim() + "..."
                : rawMessage.trim();

        Reminder reminder = new Reminder();
        reminder.setUserId(userId);
        reminder.setTitle(title);
        reminder.setScheduledAt(scheduledAt);
        reminder.setStatus("PENDING");
        reminder.setNotes(rawMessage);
        reminderRepository.save(reminder);
    }

    private List<String> getRelevantFacts(Long userId, String userMessage) {
        String embedding = buildEmbedding(userMessage);
        List<MemoryVault> matches = memoryVaultRepository.findTopSimilarFacts(userId, embedding, 3);
        if (matches == null || matches.isEmpty()) {
            return List.of();
        }

        List<String> facts = new ArrayList<>();
        for (MemoryVault memory : matches) {
            if (memory != null && memory.getFact() != null && !memory.getFact().isBlank()) {
                facts.add(memory.getFact());
            }
        }
        return facts;
    }

    private String buildPrompt(String userMessage, List<String> facts) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a helpful personal assistant. Use the memory context below when relevant.\n\n");
        if (facts.isEmpty()) {
            prompt.append("Memory context: none\n");
        } else {
            prompt.append("Memory context:\n");
            for (String fact : facts) {
                prompt.append("- ").append(fact).append("\n");
            }
        }
        prompt.append("\nUser message: ").append(userMessage).append("\n\n");
        prompt.append("Reply briefly, naturally, and helpfully in Greek or English depending on the user's message.");
        return prompt.toString();
    }

    private String callGemini(String prompt) {
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
        );

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri("/v1beta/models/{model}:generateContent?key={key}", modelName, apiKey)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class);

        if (response == null || response.get("candidates") == null) {
            throw new IllegalStateException("Gemini response did not contain candidates");
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
        Map<String, Object> candidate = candidates.get(0);
        @SuppressWarnings("unchecked")
        Map<String, Object> content = (Map<String, Object>) candidate.get("content");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");

        StringBuilder answer = new StringBuilder();
        for (Map<String, Object> part : parts) {
            if (part.get("text") != null) {
                answer.append(part.get("text"));
            }
        }

        return answer.toString();
    }

    private String buildLocalReply(String userMessage, List<String> facts) {
        StringBuilder response = new StringBuilder();
        if (!facts.isEmpty()) {
            response.append("I remembered: ");
            response.append(String.join("; ", facts)).append(". ");
        }
        response.append("Response to: \"").append(userMessage).append("\". Let’s handle it together.");
        return response.toString();
    }

    private String buildEmbedding(String text) {
        double[] vector = new double[768];
        for (int i = 0; i < vector.length; i++) {
            int hash = (text + i).hashCode() * (i + 17);
            double normalized = ((hash % 1000) / 1000.0) - 0.5;
            vector[i] = normalized;
        }

        StringBuilder builder = new StringBuilder();
        builder.append('[');
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append(String.format(Locale.US, "%.6f", vector[i]));
        }
        builder.append(']');
        return builder.toString();
    }

    private OffsetDateTime parseDateTime(String message) {
        String lower = message.toLowerCase(Locale.ROOT);
        LocalDate date = LocalDate.now();
        LocalTime time = LocalTime.of(9, 0);

        if (lower.contains("tomorrow")) {
            date = date.plusDays(1);
        }
        if (lower.contains("monday")) {
            date = nextOccurrenceOf(DayOfWeek.MONDAY, date);
        } else if (lower.contains("tuesday")) {
            date = nextOccurrenceOf(DayOfWeek.TUESDAY, date);
        } else if (lower.contains("wednesday")) {
            date = nextOccurrenceOf(DayOfWeek.WEDNESDAY, date);
        } else if (lower.contains("thursday")) {
            date = nextOccurrenceOf(DayOfWeek.THURSDAY, date);
        } else if (lower.contains("friday")) {
            date = nextOccurrenceOf(DayOfWeek.FRIDAY, date);
        } else if (lower.contains("saturday")) {
            date = nextOccurrenceOf(DayOfWeek.SATURDAY, date);
        } else if (lower.contains("sunday")) {
            date = nextOccurrenceOf(DayOfWeek.SUNDAY, date);
        }

        Matcher matcher = Pattern.compile("(?i)\\b(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)?\\b").matcher(message);
        if (matcher.find()) {
            int hour = Integer.parseInt(matcher.group(1));
            int minute = matcher.group(2) != null ? Integer.parseInt(matcher.group(2)) : 0;
            String amPm = matcher.group(3);
            if (amPm != null && amPm.equalsIgnoreCase("pm") && hour < 12) {
                hour += 12;
            }
            if (amPm != null && amPm.equalsIgnoreCase("am") && hour == 12) {
                hour = 0;
            }
            time = LocalTime.of(hour, minute);
        }

        if ((lower.contains("today") || !lower.contains("tomorrow"))
                && !lower.contains("monday") && !lower.contains("tuesday") && !lower.contains("wednesday")
                && !lower.contains("thursday") && !lower.contains("friday") && !lower.contains("saturday")
                && !lower.contains("sunday") && !lower.contains("next")) {
            date = LocalDate.now();
        }

        return OffsetDateTime.of(date, time, ZoneOffset.UTC);
    }

    private LocalDate nextOccurrenceOf(DayOfWeek dayOfWeek, LocalDate referenceDate) {
        LocalDate next = referenceDate;
        while (next.getDayOfWeek() != dayOfWeek) {
            next = next.plusDays(1);
        }
        return next;
    }
}

