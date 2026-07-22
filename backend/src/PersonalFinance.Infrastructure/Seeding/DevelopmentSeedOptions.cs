namespace PersonalFinance.Infrastructure.Seeding;

public sealed class DevelopmentSeedOptions
{
    public const string SectionName = "DevelopmentSeed";

    public bool Enabled { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
    public string DisplayName { get; set; } = "admin01";
}

public sealed record DevelopmentSeedRunOptions(bool DryRun);
