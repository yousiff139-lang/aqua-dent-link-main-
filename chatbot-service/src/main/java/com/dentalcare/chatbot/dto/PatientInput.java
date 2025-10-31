package com.dentalcare.chatbot.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Builder;
import lombok.Data;

/**
 * DTO for patient input data when creating/updating patient records.
 */
@Data
@Builder
public class PatientInput {
    /**
     * Patient's full name
     */
    @NotBlank(message = "Name is required")
    private String name;
    
    /**
     * Patient's email address
     */
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
    
    /**
     * Patient's phone number (10-15 digits)
     */
    @Pattern(regexp = "^[0-9]{10,15}$", message = "Phone number must be 10-15 digits")
    private String phone;
}
