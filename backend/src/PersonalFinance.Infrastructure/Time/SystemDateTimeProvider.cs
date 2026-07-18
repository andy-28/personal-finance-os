using PersonalFinance.Application.Abstractions.Time;

namespace PersonalFinance.Infrastructure.Time;

public sealed class SystemDateTimeProvider : IDateTimeProvider
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
