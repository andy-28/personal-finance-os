namespace PersonalFinance.Application.UserSettings.Models;

public sealed record UserSettingsDto(
    Guid Id,
    Guid UserId,
    string Theme,
    UserWorkshopSettingsDto WorkshopSettings,
    UserVisualSettingsDto VisualSettings,
    UserGoalSettingsDto GoalSettings,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record UserWorkshopSettingsDto(string FaviconAssetId, bool HeaderDividerEnabled);

public sealed record UserVisualSettingsDto(string HeaderDividerAssetId);

public sealed record UserGoalSettingsDto(IReadOnlyList<UserGoalBarDto> GoalBars, bool Collapsed, string DisplayStyle);

public sealed record UserGoalBarDto(string Id, Guid AccountId, string Title, decimal TargetAmount, string Color);

public sealed record UserSettingsRequest(
    string Theme,
    UserWorkshopSettingsDto WorkshopSettings,
    UserVisualSettingsDto VisualSettings,
    UserGoalSettingsDto GoalSettings);

public sealed record UserSettingsPatchRequest(
    string? Theme,
    UserWorkshopSettingsDto? WorkshopSettings,
    UserVisualSettingsDto? VisualSettings,
    UserGoalSettingsDto? GoalSettings);
