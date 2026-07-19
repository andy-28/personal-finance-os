using MediatR;
using Microsoft.AspNetCore.Mvc;
using PersonalFinance.Application.CreditCards;
using PersonalFinance.Application.CreditCards.Models;

namespace PersonalFinance.Api.Endpoints;

public static class CreditCardEndpoints
{
    public static IEndpointRouteBuilder MapCreditCardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/credit-cards").RequireAuthorization().WithTags("Credit Cards");
        group.MapGet("/", async (ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetCreditCardsQuery(), ct)).ToHttpResult());
        group.MapGet("/{accountId:guid}", async (Guid accountId, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetCreditCardDetailQuery(accountId), ct)).ToHttpResult());
        group.MapGet("/{accountId:guid}/summary", async (Guid accountId, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetCreditCardSummaryQuery(accountId), ct)).ToHttpResult());
        group.MapGet("/{accountId:guid}/transactions", async (Guid accountId, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetCreditCardTransactionsQuery(accountId), ct)).ToHttpResult());
        group.MapPost("/", async ([FromBody] CreditCardRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new CreateCreditCardCommand(request), ct)).ToHttpResult(value => Results.Created($"/api/credit-cards/{value.AccountId}", value)));
        group.MapPut("/{accountId:guid}", async (Guid accountId, [FromBody] CreditCardRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new UpdateCreditCardCommand(accountId, request), ct)).ToHttpResult());
        group.MapPost("/purchase", async ([FromBody] CreditCardPurchaseRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new CreateCreditCardPurchaseCommand(request), ct)).ToHttpResult(value => Results.Created($"/api/transactions/{value.Id}", value)));
        group.MapPost("/refund", async ([FromBody] CreditCardRefundRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new CreateCreditCardRefundCommand(request), ct)).ToHttpResult(value => Results.Created($"/api/transactions/{value.Id}", value)));
        group.MapPost("/payment", async ([FromBody] CreditCardPaymentRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new CreateCreditCardPaymentCommand(request), ct)).ToHttpResult(value => Results.Created($"/api/transactions/{value.Id}", value)));
        group.MapGet("/installment-plans", async ([FromQuery] Guid? creditCardAccountId, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetInstallmentPlansQuery(creditCardAccountId), ct)).ToHttpResult());
        group.MapPost("/installment-plans", async ([FromBody] InstallmentPlanRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new CreateInstallmentPlanCommand(request), ct)).ToHttpResult(value => Results.Created($"/api/credit-cards/installment-plans/{value.Id}", value)));
        group.MapPost("/installments/{planId:guid}/schedule-items/{itemId:guid}/post", async (Guid planId, Guid itemId, [FromBody] PostInstallmentScheduleItemRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new PostInstallmentScheduleItemCommand(planId, itemId, request), ct)).ToHttpResult(value => Results.Created($"/api/transactions/{value.Id}", value)));
        return app;
    }
}
