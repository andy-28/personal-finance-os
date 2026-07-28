using System.Text.Json;
using MediatR;
using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Application.Common;
using PersonalFinance.Application.UserSettings.Models;
using PersonalFinance.Domain.UserSettings;

namespace PersonalFinance.Application.UserSettings;

public sealed record GetUserSettingsQuery : IRequest<Result<UserSettingsDto>>;
public sealed record PutUserSettingsCommand(UserSettingsRequest Request) : IRequest<Result<UserSettingsDto>>;
public sealed record PatchUserSettingsCommand(UserSettingsPatchRequest Request) : IRequest<Result<UserSettingsDto>>;

public sealed class UserSettingsHandler :
    IRequestHandler<GetUserSettingsQuery, Result<UserSettingsDto>>,
    IRequestHandler<PutUserSettingsCommand, Result<UserSettingsDto>>,
    IRequestHandler<PatchUserSettingsCommand, Result<UserSettingsDto>>
{
    private const string DefaultTheme = "Aether";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly UserWorkshopSettingsDto DefaultWorkshopSettings = new("default-favicon", true);
    private static readonly UserVisualSettingsDto DefaultVisualSettings = new("purple-energy-divider");
    private static readonly UserGoalSettingsDto DefaultGoalSettings = new(Array.Empty<UserGoalBarDto>(), false, "compact");

    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;

    public UserSettingsHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTimeProvider dateTimeProvider)
    {
        _db = db;
        _currentUser = currentUser;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<Result<UserSettingsDto>> Handle(GetUserSettingsQuery request, CancellationToken cancellationToken)
    {
        var setting = await GetOrCreateAsync(cancellationToken);
        if (setting is null) return Result<UserSettingsDto>.Failure(NotAuthenticated());
        return Result<UserSettingsDto>.Success(ToDto(setting));
    }

    public async Task<Result<UserSettingsDto>> Handle(PutUserSettingsCommand request, CancellationToken cancellationToken)
    {
        var setting = await GetOrCreateAsync(cancellationToken);
        if (setting is null) return Result<UserSettingsDto>.Failure(NotAuthenticated());

        var normalized = Normalize(request.Request);
        setting.Update(
            normalized.Theme,
            Serialize(normalized.WorkshopSettings),
            Serialize(normalized.VisualSettings),
            Serialize(normalized.GoalSettings),
            _dateTimeProvider.UtcNow);

        await _db.SaveChangesAsync(cancellationToken);
        return Result<UserSettingsDto>.Success(ToDto(setting));
    }

    public async Task<Result<UserSettingsDto>> Handle(PatchUserSettingsCommand request, CancellationToken cancellationToken)
    {
        var setting = await GetOrCreateAsync(cancellationToken);
        if (setting is null) return Result<UserSettingsDto>.Failure(NotAuthenticated());

        var current = ToDto(setting);
        var merged = new UserSettingsRequest(
            request.Request.Theme ?? current.Theme,
            request.Request.WorkshopSettings ?? current.WorkshopSettings,
            request.Request.VisualSettings ?? current.VisualSettings,
            request.Request.GoalSettings ?? current.GoalSettings);

        var normalized = Normalize(merged);
        setting.Update(
            normalized.Theme,
            Serialize(normalized.WorkshopSettings),
            Serialize(normalized.VisualSettings),
            Serialize(normalized.GoalSettings),
            _dateTimeProvider.UtcNow);

        await _db.SaveChangesAsync(cancellationToken);
        return Result<UserSettingsDto>.Success(ToDto(setting));
    }

    private async Task<UserSetting?> GetOrCreateAsync(CancellationToken cancellationToken)
    {
        if (!_currentUser.IsAuthenticated) return null;

        var setting = _db.UserSettings.FirstOrDefault(item => item.UserId == _currentUser.UserId);
        if (setting is not null) return setting;

        setting = UserSetting.Create(
            _currentUser.UserId,
            DefaultTheme,
            Serialize(DefaultWorkshopSettings),
            Serialize(DefaultVisualSettings),
            Serialize(DefaultGoalSettings),
            _dateTimeProvider.UtcNow);
        _db.AddUserSetting(setting);
        await _db.SaveChangesAsync(cancellationToken);
        return setting;
    }

    private static UserSettingsRequest Normalize(UserSettingsRequest request)
    {
        var theme = string.IsNullOrWhiteSpace(request.Theme) ? DefaultTheme : request.Theme.Trim();
        if (theme.Length > 40) theme = theme[..40];

        var workshop = request.WorkshopSettings ?? DefaultWorkshopSettings;
        var workshopSettings = new UserWorkshopSettingsDto(
            string.IsNullOrWhiteSpace(workshop.FaviconAssetId) ? DefaultWorkshopSettings.FaviconAssetId : workshop.FaviconAssetId.Trim(),
            workshop.HeaderDividerEnabled);

        var visual = request.VisualSettings ?? DefaultVisualSettings;
        var visualSettings = new UserVisualSettingsDto(
            string.IsNullOrWhiteSpace(visual.HeaderDividerAssetId) ? DefaultVisualSettings.HeaderDividerAssetId : visual.HeaderDividerAssetId.Trim());

        var goal = request.GoalSettings ?? DefaultGoalSettings;
        var goalBars = (goal.GoalBars ?? Array.Empty<UserGoalBarDto>())
            .Where(item => item.AccountId != Guid.Empty && item.TargetAmount >= 0)
            .Select(item => new UserGoalBarDto(
                string.IsNullOrWhiteSpace(item.Id) ? Guid.NewGuid().ToString("N") : item.Id.Trim(),
                item.AccountId,
                string.IsNullOrWhiteSpace(item.Title) ? "Goal" : item.Title.Trim(),
                item.TargetAmount,
                NormalizeGoalColor(item.Color)))
            .ToArray();
        var goalSettings = new UserGoalSettingsDto(goalBars, goal.Collapsed, string.IsNullOrWhiteSpace(goal.DisplayStyle) ? "compact" : goal.DisplayStyle.Trim());

        return new UserSettingsRequest(theme, workshopSettings, visualSettings, goalSettings);
    }

    private static string NormalizeGoalColor(string? value)
    {
        var color = string.IsNullOrWhiteSpace(value) ? "violet" : value.Trim().ToLowerInvariant();
        return color is "violet" or "cyan" or "emerald" or "amber" or "rose" ? color : "violet";
    }

    private static UserSettingsDto ToDto(UserSetting setting)
    {
        return new UserSettingsDto(
            setting.Id,
            setting.UserId,
            setting.Theme,
            Deserialize(setting.WorkshopSettingsJson, DefaultWorkshopSettings),
            Deserialize(setting.VisualSettingsJson, DefaultVisualSettings),
            Deserialize(setting.GoalSettingsJson, DefaultGoalSettings),
            setting.CreatedAtUtc,
            setting.UpdatedAtUtc);
    }

    private static T Deserialize<T>(string json, T fallback)
    {
        try
        {
            return JsonSerializer.Deserialize<T>(json, JsonOptions) ?? fallback;
        }
        catch
        {
            return fallback;
        }
    }

    private static string Serialize<T>(T value) => JsonSerializer.Serialize(value, JsonOptions);

    private static Error NotAuthenticated() => Error.Unauthorized("UserSettings.NotAuthenticated", "Authentication is required to read user settings.");
}


