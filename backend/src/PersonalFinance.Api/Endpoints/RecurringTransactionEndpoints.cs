using MediatR;
using Microsoft.AspNetCore.Mvc;
using PersonalFinance.Application.Recurring;
using PersonalFinance.Application.Recurring.Models;

namespace PersonalFinance.Api.Endpoints;

public static class RecurringTransactionEndpoints
{
    public static IEndpointRouteBuilder MapRecurringTransactionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/recurring-transactions").RequireAuthorization().WithTags("Recurring Transactions");
        group.MapGet("/", async ([FromQuery] bool? includeArchived, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetRecurringTemplatesQuery(includeArchived ?? false), ct)).ToHttpResult());
        group.MapGet("/upcoming", async (ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetUpcomingQuery(), ct)).ToHttpResult());
        group.MapGet("/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetRecurringTemplateByIdQuery(id), ct)).ToHttpResult());
        group.MapPost("/", async ([FromBody] RecurringTemplateRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new CreateRecurringTemplateCommand(request), ct)).ToHttpResult(value => Results.Created($"/api/recurring-transactions/{value.Id}", value)));
        group.MapPut("/{id:guid}", async (Guid id, [FromBody] RecurringTemplateRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new UpdateRecurringTemplateCommand(id, request), ct)).ToHttpResult());
        group.MapPost("/{id:guid}/archive", async (Guid id, ISender sender, CancellationToken ct) =>
            (await sender.Send(new ArchiveRecurringTemplateCommand(id), ct)).ToHttpResult());
        group.MapPost("/{id:guid}/restore", async (Guid id, ISender sender, CancellationToken ct) =>
            (await sender.Send(new RestoreRecurringTemplateCommand(id), ct)).ToHttpResult());
        group.MapPost("/occurrences/{occurrenceId:guid}/post", async (Guid occurrenceId, ISender sender, CancellationToken ct) =>
            (await sender.Send(new PostRecurringOccurrenceCommand(occurrenceId), ct)).ToHttpResult(value => Results.Ok(new { transactionId = value })));
        group.MapPost("/occurrences/{occurrenceId:guid}/skip", async (Guid occurrenceId, ISender sender, CancellationToken ct) =>
            (await sender.Send(new SkipRecurringOccurrenceCommand(occurrenceId), ct)).ToHttpResult());
        return app;
    }
}
