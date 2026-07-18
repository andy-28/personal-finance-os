using PersonalFinance.Domain.Users;

namespace PersonalFinance.Application.Abstractions.Authentication;

public sealed record TokenPair(string AccessToken, string RefreshToken, string RefreshTokenHash, DateTimeOffset RefreshTokenExpiresAtUtc);

public interface ITokenService
{
    TokenPair CreateTokenPair(User user);
    string HashRefreshToken(string refreshToken);
}
