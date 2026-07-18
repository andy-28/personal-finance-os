using MediatR;
using Microsoft.AspNetCore.Mvc;
using PersonalFinance.Application.Accounts;
using PersonalFinance.Application.Transactions;
using PersonalFinance.Domain.Accounts;

namespace PersonalFinance.Api.Endpoints;

public static class AccountEndpoints
{
    public static IEndpointRouteBuilder MapAccountEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/accounts").RequireAuthorization().WithTags("Accounts");
        group.MapGet("/", async ([FromQuery] bool? includeArchived, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetAccountsQuery(includeArchived ?? false), ct)).ToHttpResult());
        group.MapGet("/summary", async (ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetAccountSummaryQuery(), ct)).ToHttpResult());
        group.MapGet("/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetAccountByIdQuery(id), ct)).ToHttpResult());
        group.MapPost("/", async ([FromBody] AccountRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new CreateAccountCommand(request.Name, request.Type, request.CurrencyCode, request.InstitutionName), ct))
                .ToHttpResult(value => Results.Created($"/api/accounts/{value.Id}", value)));
        group.MapPut("/{id:guid}", async (Guid id, [FromBody] AccountRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new UpdateAccountCommand(id, request.Name, request.Type, request.CurrencyCode ?? "TWD", request.InstitutionName), ct)).ToHttpResult());
        group.MapPut("/reorder", async ([FromBody] ReorderAccountsRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new ReorderAccountsCommand(request.AccountIds), ct)).ToHttpResult());
        group.MapDelete("/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
            (await sender.Send(new ArchiveAccountCommand(id), ct)).ToHttpResult());
        group.MapPost("/{id:guid}/restore", async (Guid id, ISender sender, CancellationToken ct) =>
            (await sender.Send(new RestoreAccountCommand(id), ct)).ToHttpResult());
        group.MapPost("/{id:guid}/opening-balance", async (Guid id, [FromBody] OpeningBalanceRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new CreateOpeningBalanceCommand(id, request.Amount, request.TransactionDate, request.Note), ct))
                .ToHttpResult(value => Results.Created($"/api/transactions/{value.Id}", value)));
        return app;
    }

    public sealed record AccountRequest(string Name, AccountType Type, string? CurrencyCode, string? InstitutionName);
    public sealed record ReorderAccountsRequest(IReadOnlyList<Guid> AccountIds);
    public sealed record OpeningBalanceRequest(decimal Amount, DateOnly TransactionDate, string? Note);
}
