using MediatR;
using Microsoft.AspNetCore.Mvc;
using PersonalFinance.Application.StatementImports;
using PersonalFinance.Application.StatementImports.Models;

namespace PersonalFinance.Api.Endpoints;

public static class StatementImportEndpoints
{
    public static IEndpointRouteBuilder MapStatementImportEndpoints(this IEndpointRouteBuilder app)
    {
        var creditCardGroup = app.MapGroup("/api/credit-cards/{cardId:guid}/statement-imports").RequireAuthorization().WithTags("Statement Imports");
        creditCardGroup.MapPost("/parse", async (Guid cardId, IFormFile file, [FromForm] string? password, ISender sender, CancellationToken ct) =>
        {
            await using var stream = file.OpenReadStream();
            return (await sender.Send(new ParseStatementImportCommand(cardId, file.FileName, file.ContentType, file.Length, stream, password), ct)).ToHttpResult(value => Results.Created($"/api/statement-imports/{value.Id}", value));
        })
        .DisableAntiforgery()
        .Accepts<IFormFile>("multipart/form-data");

        creditCardGroup.MapGet("/", async (Guid cardId, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetStatementImportsQuery(cardId), ct)).ToHttpResult());

        var group = app.MapGroup("/api/statement-imports").RequireAuthorization().WithTags("Statement Imports");
        group.MapGet("/{batchId:guid}", async (Guid batchId, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetStatementImportQuery(batchId), ct)).ToHttpResult());
        group.MapPut("/{batchId:guid}/rows/{rowId:guid}", async (Guid batchId, Guid rowId, [FromBody] StatementImportRowUpdateRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new UpdateStatementImportRowCommand(batchId, rowId, request), ct)).ToHttpResult());
        group.MapPost("/{batchId:guid}/post", async (Guid batchId, [FromBody] StatementImportPostRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new PostStatementImportCommand(batchId, request), ct)).ToHttpResult());
        group.MapPost("/{batchId:guid}/discard", async (Guid batchId, ISender sender, CancellationToken ct) =>
            (await sender.Send(new DiscardStatementImportCommand(batchId), ct)).ToHttpResult());
        return app;
    }
}
