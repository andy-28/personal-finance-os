using System.Security.Cryptography;
using System.Text;

namespace PersonalFinance.Application.TransactionCaptures;

public static class CaptureTokenSecret
{
    public const string Prefix = "ce_capture_";

    public static string Create()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Prefix + Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    public static string Hash(string plaintext)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(plaintext));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
