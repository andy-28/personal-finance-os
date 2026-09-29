namespace PersonalFinance.Api.Authentication;

public static class CaptureTokenAuthenticationDefaults
{
    public const string Scheme = "CaptureToken";
    public const string Policy = "CaptureCreate";
    public const string ScopeClaim = "scope";
    public const string CaptureScope = "transaction-capture:create";
}
