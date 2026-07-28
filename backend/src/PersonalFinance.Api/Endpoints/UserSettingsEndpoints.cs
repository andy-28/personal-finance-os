using MediatR;
using Microsoft.AspNetCore.Mvc;
using PersonalFinance.Application.UserSettings;
using PersonalFinance.Application.UserSettings.Models;

namespace PersonalFinance.Api.Endpoints;

public static class UserSettingsEndpoints
{
    public static IEndpointRouteBuilder MapUserSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/user-settings").RequireAuthorization().WithTags("User Settings");

        group.MapGet("/", async (ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetUserSettingsQuery(), ct)).ToHttpResult());

        group.MapPut("/", async ([FromBody] UserSettingsRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new PutUserSettingsCommand(request), ct)).ToHttpResult());

        group.MapPatch("/", async ([FromBody] UserSettingsPatchRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new PatchUserSettingsCommand(request), ct)).ToHttpResult());

        return app;
    }
}
