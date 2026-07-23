using MediatR;
using Microsoft.AspNetCore.Mvc;
using PersonalFinance.Application.Transactions;
using PersonalFinance.Application.Transactions.Models;
using PersonalFinance.Domain.Transactions;

namespace PersonalFinance.Api.Endpoints;

public static class TransactionEndpoints
{
    public static IEndpointRouteBuilder MapTransactionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/transactions").RequireAuthorization().WithTags("Transactions");
        group.MapGet("/", async ([AsParameters] TransactionQuery query, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetTransactionsQuery(query.From, query.To, query.AccountId, query.CategoryId, query.Type, query.Status, query.Page ?? 1, query.PageSize ?? 50), ct)).ToHttpResult());
        group.MapGet("/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetTransactionByIdQuery(id), ct)).ToHttpResult());
        group.MapPost("/income", async ([FromBody] IncomeExpenseRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new CreateIncomeCommand(request.AccountId, request.CategoryId, request.Amount, request.TransactionDate, request.Payee, request.Note), ct))
                .ToHttpResult(value => Results.Created($"/api/transactions/{value.Id}", value)));
        group.MapPost("/expense", async ([FromBody] IncomeExpenseRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new CreateExpenseCommand(request.AccountId, request.CategoryId, request.Amount, request.TransactionDate, request.Payee, request.Note), ct))
                .ToHttpResult(value => Results.Created($"/api/transactions/{value.Id}", value)));
        group.MapPost("/transfer", async ([FromBody] TransferRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new CreateTransferCommand(request.FromAccountId, request.ToAccountId, request.Amount, request.TransactionDate, request.Note), ct))
                .ToHttpResult(value => Results.Created($"/api/transactions/{value.Id}", value)));
        group.MapPost("/opening-balance", async ([FromBody] OpeningBalanceRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new CreateOpeningBalanceCommand(request.AccountId, request.Amount, request.TransactionDate, request.Note), ct))
                .ToHttpResult(value => Results.Created($"/api/transactions/{value.Id}", value)));
        group.MapPut("/{id:guid}", async (Guid id, [FromBody] TransactionMutationDto request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new UpdateTransactionCommand(id, request), ct)).ToHttpResult());
        group.MapDelete("/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
            (await sender.Send(new VoidTransactionCommand(id), ct)).ToHttpResult());
        return app;
    }

    public sealed record TransactionQuery(DateOnly? From, DateOnly? To, Guid? AccountId, Guid? CategoryId, TransactionType? Type, TransactionStatus? Status, int? Page, int? PageSize);
    public sealed record IncomeExpenseRequest(Guid AccountId, Guid CategoryId, decimal Amount, DateOnly TransactionDate, string? Payee, string? Note);
    public sealed record TransferRequest(Guid FromAccountId, Guid ToAccountId, decimal Amount, DateOnly TransactionDate, string? Note);
    public sealed record OpeningBalanceRequest(Guid AccountId, decimal Amount, DateOnly TransactionDate, string? Note);
}
