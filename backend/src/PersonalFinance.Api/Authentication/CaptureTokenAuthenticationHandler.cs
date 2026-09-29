using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Application.TransactionCaptures;

namespace PersonalFinance.Api.Authentication;

public sealed class CaptureTokenAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IApplicationDbContext _db;
    private readonly IDateTimeProvider _clock;

    public CaptureTokenAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IApplicationDbContext db,
        IDateTimeProvider clock) : base(options, logger, encoder)
    {
        _db = db;
        _clock = clock;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authorization = Request.Headers.Authorization.ToString();
        if (!authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return AuthenticateResult.NoResult();

        var plaintext = authorization["Bearer ".Length..].Trim();
        if (!plaintext.StartsWith(CaptureTokenSecret.Prefix, StringComparison.Ordinal))
            return AuthenticateResult.NoResult();

        var tokenHash = CaptureTokenSecret.Hash(plaintext);
        var token = _db.CaptureApiTokens.FirstOrDefault(item => item.TokenHash == tokenHash && item.RevokedAtUtc == null);
        if (token is null)
            return AuthenticateResult.Fail("The capture token is invalid or has been revoked.");

        token.MarkUsed(_clock.UtcNow);
        await _db.SaveChangesAsync(Context.RequestAborted);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, token.UserId.ToString()),
            new Claim(CaptureTokenAuthenticationDefaults.ScopeClaim, CaptureTokenAuthenticationDefaults.CaptureScope)
        };
        var identity = new ClaimsIdentity(claims, CaptureTokenAuthenticationDefaults.Scheme);
        var principal = new ClaimsPrincipal(identity);
        return AuthenticateResult.Success(new AuthenticationTicket(principal, CaptureTokenAuthenticationDefaults.Scheme));
    }
}
