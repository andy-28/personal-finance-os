using PersonalFinance.Domain.TransactionCaptures;

namespace PersonalFinance.Domain.Tests;

public sealed class TransactionCaptureDomainTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 18, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Create_Is_Pending_Unverified_Input()
    {
        var capture = TransactionCapture.Create(Guid.NewGuid(), TransactionCaptureSource.IosShortcut, 15960m, "twd", Now,
            "BIGBANG", null, PaymentInstrumentType.CreditCard, Guid.NewGuid(), "shortcut-uuid", null, Now);

        Assert.Equal(TransactionCaptureStatus.Pending, capture.Status);
        Assert.Equal("TWD", capture.CurrencyCode);
        Assert.Equal(15960m, capture.Amount);
    }

    [Fact]
    public void Create_Normalizes_Timestamps_To_Utc()
    {
        var occurredAt = new DateTimeOffset(2026, 9, 20, 9, 30, 0, TimeSpan.FromHours(8));
        var capturedAt = new DateTimeOffset(2026, 9, 20, 10, 0, 0, TimeSpan.FromHours(8));

        var capture = TransactionCapture.Create(Guid.NewGuid(), TransactionCaptureSource.IosShortcut, 1200m, "TWD",
            occurredAt, "Shortcut capture", null, PaymentInstrumentType.Account, Guid.NewGuid(), "shortcut-utc", null, capturedAt);

        Assert.Equal(TimeSpan.Zero, capture.OccurredAtUtc.Offset);
        Assert.Equal(occurredAt.UtcDateTime, capture.OccurredAtUtc.UtcDateTime);
        Assert.Equal(TimeSpan.Zero, capture.CapturedAtUtc.Offset);
        Assert.Equal(capturedAt.UtcDateTime, capture.CapturedAtUtc.UtcDateTime);
    }

    [Fact]
    public void Invalid_Amount_Is_Rejected()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => TransactionCapture.Create(Guid.NewGuid(), TransactionCaptureSource.Manual,
            0m, "TWD", Now, "Invalid", null, PaymentInstrumentType.Account, Guid.NewGuid(), null, null, Now));
    }

    [Fact]
    public void Dismiss_Changes_Only_Capture_Status()
    {
        var capture = TransactionCapture.Create(Guid.NewGuid(), TransactionCaptureSource.Manual, 100m, "TWD", Now,
            "Coffee", null, PaymentInstrumentType.Account, Guid.NewGuid(), null, null, Now);

        capture.Dismiss(Now.AddMinutes(1));

        Assert.Equal(TransactionCaptureStatus.Dismissed, capture.Status);
        Assert.Equal(Now.AddMinutes(1), capture.DismissedAtUtc);
    }
}
