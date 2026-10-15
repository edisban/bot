package com.bot.botback.dto;

import lombok.Data;

@Data
public class MessageRequest {
    private Long userId;
    private String message;
}