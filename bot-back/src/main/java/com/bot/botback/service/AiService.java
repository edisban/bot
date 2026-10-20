package com.bot.botback.service;

import com.bot.botback.model.Reminder;
import com.bot.botback.repository.ReminderRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    private final MemoryService memoryService;
    private final ReminderRepository reminderRepository;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.model:gemini-3.8-flash}")
    private String modelName;

    private static final int MAX_RETRIES = 3;
    private static final long RETRY_DELAY_MS = 2000;
    private static final Set<Integer> NON_RETRYABLE_STATUSES = Set.of(400, 401, 402, 403, 404);

    public AiService(MemoryService memoryService, ReminderRepository reminderRepository) {
        this.memoryService = memoryService;
        this.reminderRepository = reminderRepository;
        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .build();
        this.objectMapper = new ObjectMapper();
    }

    @PostConstruct
    void warnIfGeminiUnavailable() {
        if (!isGeminiConfigured()) {
            log.warn("GEMINI_API_KEY is not configured. RoboFriend will reply using local fallbacks "
                    + "and will not extract facts or reminders from new messages.");
        }
    }

    public boolean isGeminiConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String generateReply(Long userId, String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            return "Please provide a message to continue.";
        }

        List<String> relatedFacts = getRelevantFacts(userId, userMessage);
        List<Reminder> dueReminders = getDueRemindersSafely(userId);

        if (!isGeminiConfigured()) {
            log.warn("Gemini API key is missing; returning a local fallback reply.");
            markRemindersAsSent(dueReminders);
            boolean reminderCreated = saveLocalReminderIfPresent(userId, userMessage);
            return buildLocalReply(userMessage, relatedFacts, null, reminderCreated, dueReminders);
        }

        try {
            ExtractionResult result = callGeminiWithRetry(userId, userMessage, relatedFacts, dueReminders);

            markRemindersAsSent(dueReminders);
            persistExtraction(userId, result);

            return result.getReply();
        } catch (Exception e) {
            int status = e instanceof RestClientResponseException responseException
                    ? responseException.getStatusCode().value()
                    : -1;
            String body = e instanceof RestClientResponseException responseException
                    ? responseException.getResponseBodyAsString()
                    : e.getMessage();
            log.warn("Gemini API failed with HTTP {}; falling back to local reply. Body: {}", status, body);

            markRemindersAsSent(dueReminders);
            boolean reminderCreated = saveLocalReminderIfPresent(userId, userMessage);
            return buildLocalReply(userMessage, relatedFacts, describeFailure(status), reminderCreated, dueReminders);
        }
    }

    private void persistExtraction(Long userId, ExtractionResult result) {
        try {
            saveFacts(userId, result.getFactsToRemember());
        } catch (Exception e) {
            log.error("Failed to persist extracted facts: {}", e.getMessage());
        }
        try {
            saveReminderIfPresent(userId, result.getReminder());
        } catch (Exception e) {
            log.error("Failed to persist extracted reminder: {}", e.getMessage());
        }
    }

    private String describeFailure(int status) {
        switch (status) {
            case 402:
                return "Heads up: my AI provider account has run out of prepaid credits, so I could not analyze that message. Please add credits at https://ai.studio/projects to restore full functionality.";
            case 429:
                return "Heads up: my AI provider is rate-limiting requests right now, so I could not analyze that message. Please try again in a moment.";
            case 401:
            case 403:
                return "Heads up: my AI provider rejected the API key, so I could not analyze that message. Please check the GEMINI_API_KEY configuration.";
            default:
                return "Heads up: I could not reach my AI service just now, so I could not analyze that message. Please try again in a moment.";
        }
    }

    private boolean saveLocalReminderIfPresent(Long userId, String userMessage) {
        try {
            LocalReminderParser.ParsedReminder parsed = LocalReminderParser.parse(userMessage).orElse(null);
            if (parsed == null) {
                return false;
            }
            Reminder entity = new Reminder();
            entity.setUserId(userId);
            entity.setTitle(parsed.title());
            entity.setScheduledAt(parsed.scheduledAt().atOffset(ZoneOffset.UTC));
            entity.setStatus("PENDING");
            entity.setNotes("Auto-extracted locally (AI provider unavailable)");
            reminderRepository.save(entity);
            log.info("Saved local reminder for user {}: {} at {}", userId, parsed.title(), parsed.scheduledAt());
            return true;
        } catch (Exception e) {
            log.error("Failed to save locally extracted reminder: {}", e.getMessage());
            return false;
        }
    }

    private ExtractionResult callGeminiWithRetry(Long userId, String userMessage, List<String> facts, List<Reminder> dueReminders) {
        RestClientException lastException = null;
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                return callGemini(userId, userMessage, facts, dueReminders);
            } catch (RestClientException e) {
                lastException = e;
                int status = statusOf(e);
                if (status > 0) {
                    log.warn("Gemini attempt {}/{} failed: HTTP {} - {}", attempt, MAX_RETRIES, status, bodyOf(e));
                } else {
                    log.warn("Gemini attempt {}/{} failed: {}", attempt, MAX_RETRIES, e.getMessage());
                }
                if (status > 0 && NON_RETRYABLE_STATUSES.contains(status)) {
                    log.warn("Gemini error HTTP {} is not retryable; aborting attempts.", status);
                    throw e;
                }
                if (attempt < MAX_RETRIES) {
                    sleepQuietly(RETRY_DELAY_MS * attempt);
                }
            }
        }
        throw lastException != null ? lastException : new RestClientException("Gemini call failed");
    }

    private int statusOf(RestClientException exception) {
        if (exception instanceof RestClientResponseException responseException) {
            return responseException.getStatusCode().value();
        }
        return -1;
    }

    private String bodyOf(RestClientException exception) {
        if (exception instanceof RestClientResponseException responseException) {
            return responseException.getResponseBodyAsString();
        }
        return exception.getMessage();
    }

    private ExtractionResult callGemini(Long userId, String userMessage, List<String> facts, List<Reminder> dueReminders) {
        String memoryContext = facts.isEmpty()
                ? "None yet"
                : String.join("\n", facts.stream().map(f -> "- " + f).collect(Collectors.toList()));

        String currentTimestamp = OffsetDateTime.now(ZoneOffset.UTC)
                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);

        List<Reminder> upcomingReminders = reminderRepository
                .findByUserIdAndStatusAndScheduledAtAfterOrderByScheduledAtAsc(
                        userId, "PENDING", OffsetDateTime.now(ZoneOffset.UTC));
        String remindersContext = upcomingReminders.isEmpty()
                ? "None upcoming"
                : upcomingReminders.stream()
                        .map(r -> r.getTitle() + " at " + r.getScheduledAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                        .collect(Collectors.joining("\n"));

        String dueRemindersContext = dueReminders == null || dueReminders.isEmpty()
                ? "None"
                : dueReminders.stream()
                        .map(r -> r.getTitle() + " (was due at " + r.getScheduledAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + ")")
                        .collect(Collectors.joining("\n"));

        String prompt = String.format("""
                You are RoboFriend, a warm, encouraging, proactive life coach and personal companion.
                You are organized, concise, and always have the user's best interests at heart.
                You act like an attentive best friend who helps with daily life management.

                Current date/time: %s (UTC)

                What you can do:
                1. Extract and remember long-term facts about the user (preferences, habits, relationships, etc.)
                2. Create reminders for events, tasks, and appointments with accurate date/time parsing
                3. Provide proactive, context-aware advice and checklists
                4. Reference the user's existing facts and upcoming reminders when relevant

                Existing facts about the user:
                %s

                User's upcoming reminders:
                %s

                Reminders due now (mention these naturally in your reply):
                %s

                When the user shares something like "I'm going for a run", proactively suggest relevant items
                (e.g., "Don't forget your keys, water bottle! You also have a call at 4 PM.").
                Be concise - 1-2 short sentences max for proactive advice.
                If there are due reminders, gently remind the user at the start of your reply.

                Respond ONLY with valid JSON in this exact schema:
                {
                  "reply": "Your warm, encouraging, proactive response to the user",
                  "factsToRemember": ["Array of new permanent facts about the user"],
                  "reminder": {
                    "hasReminder": true or false,
                    "title": "Brief reminder title, e.g. 'Doctor appointment'",
                    "targetDateTime": "ISO 8601 datetime with timezone like 2026-11-06T10:00:00Z, or null"
                  }

                Rules:
                - If no new facts, return empty array []
                - If no reminder, set hasReminder to false and targetDateTime to null
                - Resolve relative dates (tomorrow, next Friday, November 6) using current date/time
                - Use UTC timezone for all datetimes
                - Be warm, concise, and proactive in your reply
                - If due reminders exist, start your reply by mentioning them naturally

                User message: %s
                """, currentTimestamp, memoryContext, remindersContext, dueRemindersContext, userMessage);

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri("/v1/models/{model}:generateContent?key={key}", modelName, apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))))
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

        StringBuilder text = new StringBuilder();
        for (Map<String, Object> part : parts) {
            if (part.get("text") != null) {
                text.append((String) part.get("text"));
            }
        }

        return parseExtractionResult(text.toString().trim());
    }

    private ExtractionResult parseExtractionResult(String jsonText) {
        try {
            String cleaned = extractJson(jsonText);
            JsonNode root = objectMapper.readTree(cleaned);

            String reply = root.has("reply") ? root.get("reply").asText() : "I couldn't generate a response right now.";

            List<String> facts = new ArrayList<>();
            if (root.has("factsToRemember")) {
                for (JsonNode factNode : root.get("factsToRemember")) {
                    facts.add(factNode.asText());
                }
            }

            ReminderInfo reminder = new ReminderInfo(false, null, null);
            if (root.has("reminder")) {
                JsonNode reminderNode = root.get("reminder");
                boolean hasReminder = reminderNode.has("hasReminder") && reminderNode.get("hasReminder").asBoolean();
                String title = reminderNode.has("title") ? reminderNode.get("title").asText() : null;
                String targetDateTime = reminderNode.has("targetDateTime") && !reminderNode.get("targetDateTime").isNull()
                        ? reminderNode.get("targetDateTime").asText() : null;
                reminder = new ReminderInfo(hasReminder, title, targetDateTime);
            }

            return new ExtractionResult(reply, facts, reminder);
        } catch (Exception e) {
            log.error("Failed to parse Gemini JSON response: {}", e.getMessage());
            throw new IllegalStateException("Failed to parse AI response", e);
        }
    }

    private String extractJson(String text) {
        int firstBrace = text.indexOf('{');
        int lastBrace = text.lastIndexOf('}');
        if (firstBrace > 0 && lastBrace > firstBrace) {
            return text.substring(firstBrace, lastBrace + 1);
        }
        return text;
    }

    private void saveFacts(Long userId, List<String> facts) {
        if (facts == null || facts.isEmpty()) {
            return;
        }
        for (String fact : facts) {
            memoryService.ingestFact(userId, fact, "General");
            log.info("Saved fact for user {}: {}", userId, fact);
        }
    }

    private void saveReminderIfPresent(Long userId, ReminderInfo reminder) {
        if (reminder == null || !reminder.getHasReminder() || reminder.getTargetDateTime() == null) {
            return;
        }
        try {
            OffsetDateTime scheduledAt = OffsetDateTime.parse(reminder.getTargetDateTime());
            Reminder entity = new Reminder();
            entity.setUserId(userId);
            entity.setTitle(reminder.getTitle());
            entity.setScheduledAt(scheduledAt);
            entity.setStatus("PENDING");
            entity.setNotes("Auto-extracted from conversation");
            reminderRepository.save(entity);
            log.info("Saved reminder for user {}: {} at {}", userId, reminder.getTitle(), scheduledAt);
        } catch (Exception e) {
            log.error("Failed to save reminder: {}", e.getMessage());
        }
    }

    public List<Reminder> getDueReminders(Long userId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        return reminderRepository
                .findByUserIdAndStatusAndScheduledAtBeforeOrderByScheduledAtAsc(userId, "PENDING", now);
    }

    private List<Reminder> getDueRemindersSafely(Long userId) {
        try {
            return getDueReminders(userId);
        } catch (Exception e) {
            log.warn("Reminder lookup failed for user {}: {}", userId, e.getMessage());
            return List.of();
        }
    }

    private void markRemindersAsSent(List<Reminder> reminders) {
        if (reminders == null) {
            return;
        }
        for (Reminder reminder : reminders) {
            reminder.setStatus("SENT");
            reminderRepository.save(reminder);
        }
    }

    private List<String> getRelevantFacts(Long userId, String userMessage) {
        try {
            return memoryService.searchFacts(userId, userMessage, 3);
        } catch (Exception e) {
            log.warn("Memory lookup failed for user {}: {}", userId, e.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("null")
    private String buildLocalReply(String userMessage,
                                   List<String> facts,
                                   String failureNote,
                                   boolean reminderCreated,
                                   List<Reminder> dueReminders) {
        StringBuilder response = new StringBuilder();

        if (dueReminders != null && !dueReminders.isEmpty()) {
            response.append("Before I forget - ");
            response.append(dueReminders.stream()
                    .map(Reminder::getTitle)
                    .collect(Collectors.joining(", ")));
            response.append(". ");
        }

        if (facts != null && !facts.isEmpty()) {
            response.append("Here's what I know about you: ");
            response.append(String.join("; ", facts)).append(". ");
        }

        if (reminderCreated) {
            response.append("I set that reminder for you. ");
        }

        if (failureNote != null && !failureNote.isBlank()) {
            response.append(failureNote);
        } else {
            response.append("I'm not sure how to help with that just yet. Could you tell me more?");
        }

        return response.toString();
    }

    private void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    public static class ExtractionResult {
        private final String reply;
        private final List<String> factsToRemember;
        private final ReminderInfo reminder;

        public ExtractionResult(String reply, List<String> factsToRemember, ReminderInfo reminder) {
            this.reply = reply;
            this.factsToRemember = factsToRemember;
            this.reminder = reminder;
        }

        public String getReply() { return reply; }
        public List<String> getFactsToRemember() { return factsToRemember; }
        public ReminderInfo getReminder() { return reminder; }
    }

    public static class ReminderInfo {
        private final boolean hasReminder;
        private final String title;
        private final String targetDateTime;

        public ReminderInfo(boolean hasReminder, String title, String targetDateTime) {
            this.hasReminder = hasReminder;
            this.title = title;
            this.targetDateTime = targetDateTime;
        }

        public boolean getHasReminder() { return hasReminder; }
        public String getTitle() { return title; }
        public String getTargetDateTime() { return targetDateTime; }
    }
}
