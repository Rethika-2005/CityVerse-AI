package com.cityverse.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {
    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
    public record RegisterRequest(
        @NotBlank @Size(min = 2) String fullName,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 6) String password,
        String zonePreference
    ) {}
    public record AiChatRequest(@NotBlank String question) {}
}
