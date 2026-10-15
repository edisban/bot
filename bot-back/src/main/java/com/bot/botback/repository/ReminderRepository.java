package com.bot.botback.repository;

import com.bot.botback.model.Reminder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {
    List<Reminder> findByUserIdOrderByScheduledAtAsc(Long userId);
}
