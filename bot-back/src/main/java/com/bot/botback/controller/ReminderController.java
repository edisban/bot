package com.bot.botback.controller;

import com.bot.botback.model.Reminder;
import com.bot.botback.repository.ReminderRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reminders")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:80"})
public class ReminderController {

    private final ReminderRepository reminderRepository;

    public ReminderController(ReminderRepository reminderRepository) {
        this.reminderRepository = reminderRepository;
    }

    @GetMapping("/{userId}")
    public List<Reminder> getReminders(@PathVariable Long userId) {
        return reminderRepository.findByUserIdOrderByScheduledAtAsc(userId);
    }

    @PatchMapping("/{reminderId}")
    public ResponseEntity<Map<String, String>> updateStatus(@PathVariable Long reminderId,
                                                           @RequestBody Map<String, String> body) {
        Reminder reminder = reminderRepository.findById(reminderId).orElse(null);
        if (reminder == null) {
            return ResponseEntity.notFound().build();
        }
        String status = body == null ? null : body.get("status");
        if (status == null || !status.matches("(?i)PENDING|SENT|DONE")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid reminder status."));
        }
        reminder.setStatus(status.toUpperCase());
        reminderRepository.save(reminder);
        return ResponseEntity.ok(Map.of("status", reminder.getStatus()));
    }

    @DeleteMapping("/{reminderId}")
    public ResponseEntity<Void> deleteReminder(@PathVariable Long reminderId) {
        if (!reminderRepository.existsById(reminderId)) {
            return ResponseEntity.notFound().build();
        }
        reminderRepository.deleteById(reminderId);
        return ResponseEntity.noContent().build();
    }
}
