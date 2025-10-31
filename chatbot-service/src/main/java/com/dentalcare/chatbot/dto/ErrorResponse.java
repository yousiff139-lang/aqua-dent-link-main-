package com.dentalcare.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * DTO for error responses.
 */
@Data
@AllArgsConstructor
public class ErrorResponse {
    private String code;
    private String message;
}
