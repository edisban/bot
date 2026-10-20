package com.bot.botback.service;

import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LocalReminderParserTest {

    private static LocalDate today() {
        return LocalDate.now(ZoneOffset.UTC);
    }

    @Test
    void parsesTomorrowWithMorningTime() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to call the dentist tomorrow at 9am")
                .orElseThrow();

        assertEquals("Call the dentist", result.title());
        assertEquals(today().plusDays(1).atTime(9, 0), result.scheduledAt());
    }

    @Test
    void parsesTodayWithEveningTime() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("Remind me to take meds at 7:30 pm today")
                .orElseThrow();

        assertEquals("Take meds", result.title());
        assertEquals(today().atTime(19, 30), result.scheduledAt());
    }

    @Test
    void parsesDayAfterTomorrow() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to submit the report day after tomorrow at 5pm")
                .orElseThrow();

        assertEquals("Submit the report", result.title());
        assertEquals(today().plusDays(2).atTime(17, 0), result.scheduledAt());
    }

    @Test
    void parsesMonthAndDay() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to book the hotel on November 6 at 10am")
                .orElseThrow();

        assertEquals("Book the hotel", result.title());
        assertEquals(11, result.scheduledAt().getMonthValue());
        assertEquals(6, result.scheduledAt().getDayOfMonth());
        assertEquals(10, result.scheduledAt().getHour());
    }

    @Test
    void parsesSlashDate() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to see the dentist on 12/24 at 10am")
                .orElseThrow();

        assertEquals("See the dentist", result.title());
        assertEquals(12, result.scheduledAt().getMonthValue());
        assertEquals(24, result.scheduledAt().getDayOfMonth());
        assertEquals(10, result.scheduledAt().getHour());
    }

    @Test
    void parsesIsoDate() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to renew the passport on 2026-12-24 at 08:30")
                .orElseThrow();

        assertEquals("Renew the passport", result.title());
        assertEquals(LocalDate.of(2026, 12, 24), result.scheduledAt().toLocalDate());
        assertEquals(8, result.scheduledAt().getHour());
        assertEquals(30, result.scheduledAt().getMinute());
    }

    @Test
    void parsesSetAReminderWording() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("set a reminder for the team standup tomorrow at 10am")
                .orElseThrow();

        assertEquals("The team standup", result.title());
        assertEquals(today().plusDays(1).atTime(10, 0), result.scheduledAt());
    }

    @Test
    void parsesMakeMeAReminderWording() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("make me a reminder to call mom tomorrow at 9am")
                .orElseThrow();

        assertEquals("Call mom", result.title());
        assertEquals(today().plusDays(1).atTime(9, 0), result.scheduledAt());
    }

    @Test
    void dateWithoutTimeDefaultsToNineAm() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to water the plants tomorrow")
                .orElseThrow();

        assertEquals("Water the plants", result.title());
        assertEquals(today().plusDays(1).atTime(9, 0), result.scheduledAt());
    }

    @Test
    void dateOnlyTodayIsRolledForwardWhenTheTimeHasPassed() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to check the mail today")
                .orElseThrow();

        assertTrue(result.scheduledAt().isAfter(LocalDateTime.now(ZoneOffset.UTC)),
                "scheduled time must be in the future, was " + result.scheduledAt());
    }

    @Test
    void tonightResolvesToEvening() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to take medicine tonight")
                .orElseThrow();

        assertEquals("Take medicine", result.title());
        assertEquals(20, result.scheduledAt().getHour());
    }

    @Test
    void thisEveningResolvesToEvening() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to have dinner this evening")
                .orElseThrow();

        assertEquals(20, result.scheduledAt().getHour());
    }

    @Test
    void thisEveningWithBareHourUsesPm() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to have dinner this evening at 8")
                .orElseThrow();

        assertEquals(20, result.scheduledAt().getHour());
    }

    @Test
    void ignoresMessagesWithoutReminderIntent() {
        assertTrue(LocalReminderParser.parse("how are you doing today").isEmpty());
        assertTrue(LocalReminderParser.parse("remind me to think about it").isEmpty());
        assertTrue(LocalReminderParser.parse("").isEmpty());
        assertTrue(LocalReminderParser.parse(null).isEmpty());
    }

    @Test
    void questionsAreNotTreatedAsRequests() {
        assertTrue(LocalReminderParser
                .parse("Can you remind me what time the dentist is tomorrow at 9am?")
                .isEmpty());
    }

    @Test
    void bareHourIsTreatedAsAfternoon() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to pick up the kids at 3")
                .orElseThrow();

        assertEquals(15, result.scheduledAt().getHour());
    }

    @Test
    void minutePrecisionTimeWithoutMeridiemStaysAsWritten() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to take meds at 6:30")
                .orElseThrow();

        assertEquals(6, result.scheduledAt().getHour());
        assertEquals(30, result.scheduledAt().getMinute());
    }

    @Test
    void bareWeekdayUsesTheComingOccurrence() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to call mom on monday at 5pm")
                .orElseThrow();

        LocalDate scheduled = result.scheduledAt().toLocalDate();
        assertEquals(DayOfWeek.MONDAY, scheduled.getDayOfWeek());
        assertTrue(scheduled.isBefore(today().plusDays(7)),
                "a bare weekday must not jump a full week, was " + scheduled);
    }

    @Test
    void nextWeekdayIsStrictlyLater() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to call mom next monday at 5pm")
                .orElseThrow();

        LocalDate scheduled = result.scheduledAt().toLocalDate();
        assertEquals(DayOfWeek.MONDAY, scheduled.getDayOfWeek());
        assertTrue(scheduled.isAfter(today()), "next monday must be in the future, was " + scheduled);
    }

    @Test
    void anchoredTimeWinsOverTimeMentionedEarlierInTheTask() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to email Bob about the 3pm meeting tomorrow at 9am")
                .orElseThrow();

        assertEquals(9, result.scheduledAt().getHour());
        assertTrue(result.title().toLowerCase().contains("bob"), "title was " + result.title());
    }

    @Test
    void ordinalDayIsParsedAndStrippedFromTheTitle() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("remind me to pay rent on the 1st at 9am")
                .orElseThrow();

        assertEquals("Pay rent", result.title());
        assertEquals(1, result.scheduledAt().getDayOfMonth());
    }

    @Test
    void titleIsNullWhenNothingRemains() {
        Optional<LocalReminderParser.ParsedReminder> result =
                LocalReminderParser.parse("remind me to tomorrow at 9am");

        assertTrue(result.isEmpty());
    }

    @Test
    void returnsNullForUnparseableInput() {
        LocalReminderParser.ParsedReminder result = LocalReminderParser
                .parse("this is not a reminder at all")
                .orElse(null);

        assertNull(result);
    }
}
