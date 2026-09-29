using MediatR;
using Microsoft.AspNetCore.Mvc;
using PersonalFinance.Application.FinancialOperations;
using PersonalFinance.Application.FinancialOperations.Models;

namespace PersonalFinance.Api.Endpoints;

public static class FinancialOperationsEndpoints
{
    public static IEndpointRouteBuilder MapFinancialOperationsEndpoints(this IEndpointRouteBuilder app)
    {
        var operations = app.MapGroup("/api/financial-operations").RequireAuthorization().WithTags("Financial Operations");
        operations.MapGet("/", async ([FromQuery] int? days, [FromQuery] string? currency, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetFinancialOperationsQuery(days ?? 45, currency ?? "TWD"), ct)).ToHttpResult());

        var events = app.MapGroup("/api/financial-events").RequireAuthorization().WithTags("Financial Events");
        events.MapGet("/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetFinancialEventByIdQuery(id), ct)).ToHttpResult());
        events.MapPost("/", async ([FromBody] FinancialEventRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new CreateFinancialEventCommand(request), ct)).ToHttpResult(value => Results.Created($"/api/financial-events/{value.Id}", value)));
        events.MapPut("/{id:guid}", async (Guid id, [FromBody] FinancialEventRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new UpdateFinancialEventCommand(id, request), ct)).ToHttpResult());
        events.MapPatch("/{id:guid}/status", async (Guid id, [FromBody] FinancialEventStatusRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new SetFinancialEventStatusCommand(id, request.Status), ct)).ToHttpResult());
        events.MapPost("/{id:guid}/checklist", async (Guid id, [FromBody] FinancialEventChecklistRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new AddFinancialEventChecklistItemCommand(id, request.Text), ct)).ToHttpResult());
        events.MapPatch("/{id:guid}/checklist/{itemId:guid}", async (Guid id, Guid itemId, [FromBody] FinancialEventChecklistToggleRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new SetFinancialEventChecklistItemCommand(id, itemId, request.IsCompleted), ct)).ToHttpResult());
        events.MapPost("/{id:guid}/captures/{captureId:guid}", async (Guid id, Guid captureId, ISender sender, CancellationToken ct) =>
            (await sender.Send(new LinkFinancialEventCaptureCommand(id, captureId), ct)).ToHttpResult());
        events.MapDelete("/{id:guid}/captures/{captureId:guid}", async (Guid id, Guid captureId, ISender sender, CancellationToken ct) =>
            (await sender.Send(new UnlinkFinancialEventCaptureCommand(id, captureId), ct)).ToHttpResult());
        events.MapPost("/from-transaction/{transactionId:guid}", async (Guid transactionId, [FromBody] PromoteTransactionRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new PromoteTransactionToFinancialEventCommand(transactionId, request), ct))
                .ToHttpResult(value => Results.Created($"/api/financial-events/{value.Id}", value)));
        events.MapPost("/{id:guid}/transactions/{transactionId:guid}", async (Guid id, Guid transactionId, ISender sender, CancellationToken ct) =>
            (await sender.Send(new LinkFinancialEventTransactionCommand(id, transactionId), ct)).ToHttpResult());
        events.MapDelete("/{id:guid}/transactions/{transactionId:guid}", async (Guid id, Guid transactionId, ISender sender, CancellationToken ct) =>
            (await sender.Send(new UnlinkFinancialEventTransactionCommand(id, transactionId), ct)).ToHttpResult());
        return app;
    }
}
