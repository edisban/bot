package com.bot.botback.controller;

import com.bot.botback.model.Reminder;
import com.bot.botback.repository.ReminderRepository;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class ReminderController {

    private final ReminderRepository reminderRepository;

    public ReminderController(ReminderRepository reminderRepository) {
        this.reminderRepository = reminderRepository;
    }

    @GetMapping("/reminders/{userId}")
    public List<Reminder> getReminders(@PathVariable Long userId) {
        return reminderRepository.findByUserIdOrderByScheduledAtAsc(userId);
    }
}
