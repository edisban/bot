package com.bot.botback.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class LocalReminderParser {

    public record ParsedReminder(String title, LocalDateTime scheduledAt) {}

    private static final Pattern TRIGGER = Pattern.compile(
            "(?i)(?:\\bremind\\s+me\\s+(?:(?:to|about|for|of)\\s+)?"
                    + "|\\b(?:set|create|add|make)\\s+(?:a\\s+)?reminder\\s+(?:(?:to|for|about|that)\\s+)?"
                    + "|\\bmake\\s+me\\s+(?:a\\s+)?reminder\\s+(?:(?:to|for|about|that)\\s+)?"
                    + "|\\breminder\\s*[:\\-]\\s*)");

    private static final Pattern ISO_DATE = Pattern.compile(
            "(?i)\\b(\\d{4})-(\\d{1,2})-(\\d{1,2})\\b");

    private static final Pattern MONTH_DAY = Pattern.compile(
            "(?i)\\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b");

    private static final Pattern DAY_MONTH = Pattern.compile(
            "(?i)\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\b(?:,?\\s*(\\d{4}))?");

    private static final Pattern SLASH_DATE = Pattern.compile(
            "(?i)\\b(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?\\b");

    private static final Pattern QUESTION_START = Pattern.compile(
            "(?i)^\\s*(what|when|where|who|whom|why|how|which|is|are|was|were|do|does|did|can|could|should|would|will|if)\\b");

    private static final Pattern RELATIVE_DAY = Pattern.compile(
            "(?i)\\b(day\\s+after\\s+tomorrow|tomorrow|today|tonight"
                    + "|this\\s+(?:morning|afternoon|evening|night)"
                    + "|next\\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)"
                    + "|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\b");

    private static final Pattern TIME = Pattern.compile(
            "(?i)\\b(?:(at|from)\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|a\\.m\\.|p\\.m\\.|o'?clock)?\\b");

    private static final Pattern ORDINAL_DAY = Pattern.compile(
            "(?i)\\b(?:on\\s+)?the\\s+(\\d{1,2})(?:st|nd|rd|th)\\b");

    private static final Pattern FILLER = Pattern.compile(
            "(?i)\\b(please|ok|okay|thanks|thank you|thx)\\b");

    private static final String[] MONTH_NAMES = {
            "january", "february", "march", "april", "may", "june",
            "july", "august", "september", "october", "november", "december"
    };


    private LocalReminderParser() {
    }

    public static Optional<ParsedReminder> parse(String message) {
        if (message == null || message.isBlank()) {
            return Optional.empty();
        }

        Matcher trigger = TRIGGER.matcher(message);
        if (!trigger.find()) {
            return Optional.empty();
        }

        String work = message.substring(trigger.end()).trim();
        if (work.isEmpty()) {
            return Optional.empty();
        }

        if (QUESTION_START.matcher(work).find()) {
            return Optional.empty();
        }

        LocalDate date = null;
        LocalTime explicitTime = null;
        LocalTime impliedTime = null;
        int rollDays = 0;

        Matcher iso = ISO_DATE.matcher(work);
        if (iso.find()) {
            LocalDate parsed = safeDate(iso.group(1), iso.group(2), iso.group(3));
            if (parsed != null) {
                date = parsed;
                work = remove(work, iso.start(), iso.end());
            }
        }

        if (date == null) {
            Matcher slash = SLASH_DATE.matcher(work);
            if (slash.find()) {
                LocalDate parsed = slash.group(3) == null
                        ? toDateByNumber(Integer.parseInt(slash.group(1)), Integer.parseInt(slash.group(2)), null)
                        : safeDate(slash.group(3), slash.group(1), slash.group(2));
                if (parsed != null) {
                    date = parsed;
                    work = remove(work, slash.start(), slash.end());
                }
            }
        }

        if (date == null) {
            Matcher monthDay = MONTH_DAY.matcher(work);
            if (monthDay.find()) {
                LocalDate parsed = toDate(monthDay.group(1), monthDay.group(2), monthDay.group(3));
                if (parsed != null) {
                    date = parsed;
                    work = remove(work, monthDay.start(), monthDay.end());
                }
            }
        }

        if (date == null) {
            Matcher dayMonth = DAY_MONTH.matcher(work);
            if (dayMonth.find()) {
                LocalDate parsed = toDate(dayMonth.group(2), dayMonth.group(1), dayMonth.group(3));
                if (parsed != null) {
                    date = parsed;
                    work = remove(work, dayMonth.start(), dayMonth.end());
                }
            }
        }

        if (date == null) {
            Matcher relative = RELATIVE_DAY.matcher(work);
            if (relative.find()) {
                String token = relative.group(1).toLowerCase(Locale.US);
                LocalDate parsed = toRelativeDate(token, LocalDate.now(ZoneOffset.UTC));
                if (parsed != null) {
                    date = parsed;
                    impliedTime = impliedTimeFor(token);
                    rollDays = isWeekdayToken(token) ? 7 : 1;
                    work = remove(work, relative.start(), relative.end());
                }
            }
        }

        if (date == null) {
            Matcher ordinal = ORDINAL_DAY.matcher(work);
            if (ordinal.find()) {
                LocalDate parsed = toOrdinalDay(ordinal.group(1), LocalDate.now(ZoneOffset.UTC));
                if (parsed != null) {
                    date = parsed;
                    work = remove(work, ordinal.start(), ordinal.end());
                }
            }
        }

        TimeMatch timeMatch = findTime(work);
        if (timeMatch != null) {
            explicitTime = timeMatch.time;
            work = removeAllTimes(work);
        }

        if (explicitTime != null && impliedTime != null && impliedTime.getHour() >= 18 && explicitTime.getHour() < 12) {
            explicitTime = explicitTime.plusHours(12);
        }

        if (date == null && explicitTime == null) {
            return Optional.empty();
        }

        LocalDateTime scheduledAt = resolveSchedule(date, explicitTime, impliedTime, rollDays);

        String title = buildTitle(work);
        if (title == null) {
            return Optional.empty();
        }

        return Optional.of(new ParsedReminder(title, scheduledAt));
    }

    private static LocalDateTime resolveSchedule(LocalDate date, LocalTime explicitTime, LocalTime impliedTime, int rollDays) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        if (date != null && explicitTime != null) {
            return LocalDateTime.of(date, explicitTime);
        }
        if (date != null && impliedTime != null) {
            return LocalDateTime.of(date, impliedTime);
        }
        if (date != null) {
            LocalDateTime candidate = LocalDateTime.of(date, LocalTime.of(9, 0));
            if (!candidate.isAfter(now) && rollDays > 0) {
                candidate = candidate.plusDays(rollDays);
            }
            return candidate;
        }

        LocalTime time = explicitTime != null ? explicitTime : LocalTime.of(9, 0);
        LocalDateTime candidate = LocalDateTime.of(now.toLocalDate(), time);
        return candidate.isAfter(now) ? candidate : candidate.plusDays(1);
    }

    private static boolean isWeekdayToken(String token) {
        return token.equals("monday") || token.equals("tuesday") || token.equals("wednesday")
                || token.equals("thursday") || token.equals("friday") || token.equals("saturday")
                || token.equals("sunday");
    }

    private static LocalTime impliedTimeFor(String token) {
        switch (token) {
            case "tonight":
            case "this evening":
            case "this night":
                return LocalTime.of(20, 0);
            case "this afternoon":
                return LocalTime.of(14, 0);
            case "this morning":
                return LocalTime.of(9, 0);
            default:
                return null;
        }
    }

    private static TimeMatch findTime(String work) {
        Matcher matcher = TIME.matcher(work);
        TimeMatch best = null;
        while (matcher.find()) {
            boolean anchored = matcher.group(1) != null;
            boolean meridiem = matcher.group(4) != null;
            boolean hasMinutes = matcher.group(3) != null;
            if (!anchored && !meridiem && !hasMinutes) {
                continue;
            }
            LocalTime time = toTime(matcher.group(2), matcher.group(3), matcher.group(4));
            if (time == null) {
                continue;
            }
            if (anchored) {
                return new TimeMatch(time);
            }
            if (best == null) {
                best = new TimeMatch(time);
            }
        }
        return best;
    }

    private static String removeAllTimes(String work) {
        Matcher matcher = TIME.matcher(work);
        StringBuilder cleaned = new StringBuilder();
        int last = 0;
        while (matcher.find()) {
            boolean anchored = matcher.group(1) != null;
            boolean meridiem = matcher.group(4) != null;
            boolean hasMinutes = matcher.group(3) != null;
            if (!anchored && !meridiem && !hasMinutes) {
                continue;
            }
            cleaned.append(work, last, matcher.start()).append(' ');
            last = matcher.end();
        }
        cleaned.append(work, last, work.length());
        return cleaned.toString();
    }

    private static LocalDate safeDate(String yearToken, String monthToken, String dayToken) {
        try {
            int year = Integer.parseInt(yearToken);
            if (year < 100) {
                year += 2000;
            }
            return LocalDate.of(year, Integer.parseInt(monthToken), Integer.parseInt(dayToken));
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static LocalDate toDateByNumber(int month, int day, String yearToken) {
        try {
            if (month < 1 || month > 12 || day < 1 || day > 31) {
                return null;
            }
            int year = LocalDate.now(ZoneOffset.UTC).getYear();
            if (yearToken != null && !yearToken.isBlank()) {
                year = Integer.parseInt(yearToken);
                if (year < 100) {
                    year += 2000;
                }
            } else if (LocalDate.of(year, month, day).isBefore(LocalDate.now(ZoneOffset.UTC))) {
                year = year + 1;
            }
            return LocalDate.of(year, month, day);
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static LocalDate toDate(String monthToken, String dayToken, String yearToken) {
        try {
            String monthKey = monthToken.toLowerCase(Locale.US).substring(0, 3);
            int month = -1;
            for (int i = 0; i < MONTH_NAMES.length; i++) {
                if (MONTH_NAMES[i].startsWith(monthKey)) {
                    month = i + 1;
                    break;
                }
            }
            if (month < 0) {
                return null;
            }
            int day = Integer.parseInt(dayToken);
            int year = LocalDate.now(ZoneOffset.UTC).getYear();
            if (yearToken != null && !yearToken.isBlank()) {
                year = Integer.parseInt(yearToken);
            } else if (LocalDate.of(year, month, day).isBefore(LocalDate.now(ZoneOffset.UTC))) {
                year = year + 1;
            }
            return LocalDate.of(year, month, day);
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static LocalDate toOrdinalDay(String dayToken, LocalDate today) {
        try {
            int day = Integer.parseInt(dayToken);
            LocalDate thisMonth = today.withDayOfMonth(1);
            LocalDate candidate = thisMonth.withDayOfMonth(Math.min(day, thisMonth.lengthOfMonth()));
            if (candidate.isBefore(today)) {
                candidate = candidate.plusMonths(1);
            }
            return candidate;
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static LocalDate toRelativeDate(String token, LocalDate today) {
        switch (token) {
            case "day after tomorrow":
                return today.plusDays(2);
            case "tomorrow":
                return today.plusDays(1);
            case "today":
            case "tonight":
            case "this evening":
            case "this night":
            case "this morning":
            case "this afternoon":
                return today;
            case "next monday":
                return nextWeekday(today, DayOfWeek.MONDAY);
            case "monday":
                return comingWeekday(today, DayOfWeek.MONDAY);
            case "next tuesday":
                return nextWeekday(today, DayOfWeek.TUESDAY);
            case "tuesday":
                return comingWeekday(today, DayOfWeek.TUESDAY);
            case "next wednesday":
                return nextWeekday(today, DayOfWeek.WEDNESDAY);
            case "wednesday":
                return comingWeekday(today, DayOfWeek.WEDNESDAY);
            case "next thursday":
                return nextWeekday(today, DayOfWeek.THURSDAY);
            case "thursday":
                return comingWeekday(today, DayOfWeek.THURSDAY);
            case "next friday":
                return nextWeekday(today, DayOfWeek.FRIDAY);
            case "friday":
                return comingWeekday(today, DayOfWeek.FRIDAY);
            case "next saturday":
                return nextWeekday(today, DayOfWeek.SATURDAY);
            case "saturday":
                return comingWeekday(today, DayOfWeek.SATURDAY);
            case "next sunday":
                return nextWeekday(today, DayOfWeek.SUNDAY);
            case "sunday":
                return comingWeekday(today, DayOfWeek.SUNDAY);
            default:
                return null;
        }
    }

    private static LocalDate nextWeekday(LocalDate today, DayOfWeek day) {
        return today.with(TemporalAdjusters.next(day));
    }

    private static LocalDate comingWeekday(LocalDate today, DayOfWeek day) {
        return today.with(TemporalAdjusters.nextOrSame(day));
    }

    private static LocalTime toTime(String hourToken, String minuteToken, String meridiemToken) {
        try {
            int hour = Integer.parseInt(hourToken);
            int minute = minuteToken == null ? 0 : Integer.parseInt(minuteToken);
            if (hour > 23 || minute > 59) {
                return null;
            }
            if (meridiemToken != null) {
                String meridiem = meridiemToken.toLowerCase(Locale.US).replace(".", "");
                if (meridiem.startsWith("p")) {
                    if (hour < 12) {
                        hour += 12;
                    }
                } else if (meridiem.startsWith("a")) {
                    if (hour == 12) {
                        hour = 0;
                    }
                }
            } else if (minuteToken == null && hour >= 1 && hour <= 7) {
                hour += 12;
            }
            return LocalTime.of(hour, minute);
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static String buildTitle(String source) {
        String cleaned = FILLER.matcher(source).replaceAll(" ");
        cleaned = cleaned.replaceAll("[\\s,;:\\-–—]+", " ").trim();
        cleaned = cleaned.replaceAll("^(?:on|at|by|in|for|to|about)\\s+", "").trim();
        cleaned = cleaned.replaceAll("\\s+(?:on|at|by|in|for|to|about)$", "").trim();
        cleaned = cleaned.replaceAll("^[\\s\\p{Punct}]+", "").replaceAll("[\\s\\p{Punct}]+$", "").trim();
        if (cleaned.isEmpty()) {
            return null;
        }
        return Character.toUpperCase(cleaned.charAt(0)) + cleaned.substring(1);
    }

    private static String remove(String source, int start, int end) {
        return source.substring(0, start) + " " + source.substring(end);
    }

    private record TimeMatch(LocalTime time) {
    }
}
