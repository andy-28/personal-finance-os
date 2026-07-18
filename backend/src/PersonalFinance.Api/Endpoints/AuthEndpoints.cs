using MediatR;
using Microsoft.AspNetCore.Mvc;
using PersonalFinance.Application.Authentication;

namespace PersonalFinance.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Authentication");
        group.MapPost("/register", async ([FromBody] RegisterRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new RegisterCommand(request.Email, request.Password, request.DisplayName), ct))
                .ToHttpResult(value => Results.Created("/api/auth/me", value)));
        group.MapPost("/login", async ([FromBody] LoginRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new LoginCommand(request.Email, request.Password), ct)).ToHttpResult());
        group.MapPost("/refresh", async ([FromBody] RefreshRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new RefreshCommand(request.RefreshToken), ct)).ToHttpResult());
        group.MapPost("/logout", async ([FromBody] RefreshRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new LogoutCommand(request.RefreshToken), ct)).ToHttpResult());
        group.MapGet("/me", async (ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetCurrentUserQuery(), ct)).ToHttpResult()).RequireAuthorization();
        return app;
    }

    public sealed record RegisterRequest(string Email, string Password, string DisplayName);
    public sealed record LoginRequest(string Email, string Password);
    public sealed record RefreshRequest(string RefreshToken);
}
