using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.UserSettings;

public sealed class UserSetting : AuditableEntity
{
    public Guid UserId { get; private set; }
    public string Theme { get; private set; } = "Aether";
    public string WorkshopSettingsJson { get; private set; } = "{}";
    public string VisualSettingsJson { get; private set; } = "{}";
    public string GoalSettingsJson { get; private set; } = "{}";

    private UserSetting()
    {
    }

    public static UserSetting Create(
        Guid userId,
        string theme,
        string workshopSettingsJson,
        string visualSettingsJson,
        string goalSettingsJson,
        DateTimeOffset utcNow)
    {
        var setting = new UserSetting
        {
            Id = Guid.NewGuid(),
            UserId = userId
        };

        setting.Update(theme, workshopSettingsJson, visualSettingsJson, goalSettingsJson, utcNow);
        setting.SetCreated(utcNow);
        return setting;
    }

    public void Update(
        string theme,
        string workshopSettingsJson,
        string visualSettingsJson,
        string goalSettingsJson,
        DateTimeOffset utcNow)
    {
        Theme = string.IsNullOrWhiteSpace(theme) ? "Aether" : theme.Trim();
        WorkshopSettingsJson = string.IsNullOrWhiteSpace(workshopSettingsJson) ? "{}" : workshopSettingsJson;
        VisualSettingsJson = string.IsNullOrWhiteSpace(visualSettingsJson) ? "{}" : visualSettingsJson;
        GoalSettingsJson = string.IsNullOrWhiteSpace(goalSettingsJson) ? "{}" : goalSettingsJson;
        Touch(utcNow);
    }
}
