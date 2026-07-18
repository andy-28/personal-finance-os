namespace PersonalFinance.Application.Authentication.Models;

public sealed record UserDto(Guid Id, string Email, string DisplayName, DateTimeOffset CreatedAtUtc);
public sealed record AuthResponse(UserDto User, string AccessToken, string RefreshToken);
