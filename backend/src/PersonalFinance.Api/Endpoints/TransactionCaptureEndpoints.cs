using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using PersonalFinance.Api.Authentication;
using PersonalFinance.Application.TransactionCaptures;
using PersonalFinance.Application.TransactionCaptures.Models;
using PersonalFinance.Domain.TransactionCaptures;

namespace PersonalFinance.Api.Endpoints;

public static class TransactionCaptureEndpoints
{
    public static IEndpointRouteBuilder MapTransactionCaptureEndpoints(this IEndpointRouteBuilder app)
    {
        var captures = app.MapGroup("/api/transaction-captures").WithTags("Transaction Capture");

        captures.MapGet("/", async ([FromQuery] TransactionCaptureStatus? status, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetTransactionCapturesQuery(status), ct)).ToHttpResult())
            .RequireAuthorization(policy => policy.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme).RequireAuthenticatedUser());

        captures.MapPost("/", async ([FromBody] TransactionCaptureRequest request, HttpContext context, ISender sender, CancellationToken ct) =>
        {
            var source = context.User.Identities.Any(identity => identity.AuthenticationType == CaptureTokenAuthenticationDefaults.Scheme)
                ? TransactionCaptureSource.IosShortcut
                : TransactionCaptureSource.Manual;
            return (await sender.Send(new CreateTransactionCaptureCommand(request, source), ct))
                .ToHttpResult(value => Results.Created($"/api/transaction-captures/{value.Id}", value));
        })
            .RequireAuthorization(CaptureTokenAuthenticationDefaults.Policy)
            .RequireRateLimiting("capture")
            .WithMetadata(new RequestSizeLimitAttribute(16 * 1024));

        captures.MapPatch("/{id:guid}/dismiss", async (Guid id, ISender sender, CancellationToken ct) =>
            (await sender.Send(new DismissTransactionCaptureCommand(id), ct)).ToHttpResult())
            .RequireAuthorization(policy => policy.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme).RequireAuthenticatedUser());

        var tokens = app.MapGroup("/api/capture-tokens")
            .RequireAuthorization(policy => policy.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme).RequireAuthenticatedUser())
            .WithTags("Capture Tokens");
        tokens.MapGet("/", async (ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetCaptureApiTokensQuery(), ct)).ToHttpResult());
        tokens.MapPost("/", async ([FromBody] CreateCaptureTokenRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new CreateCaptureApiTokenCommand(request.Name), ct))
                .ToHttpResult(value => Results.Created($"/api/capture-tokens/{value.Token.Id}", value)));
        tokens.MapPost("/{id:guid}/revoke", async (Guid id, ISender sender, CancellationToken ct) =>
            (await sender.Send(new RevokeCaptureApiTokenCommand(id), ct)).ToHttpResult());

        return app;
    }
}
