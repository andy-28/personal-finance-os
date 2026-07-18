using MediatR;
using Microsoft.AspNetCore.Mvc;
using PersonalFinance.Application.Categories;
using PersonalFinance.Domain.Categories;

namespace PersonalFinance.Api.Endpoints;

public static class CategoryEndpoints
{
    public static IEndpointRouteBuilder MapCategoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/categories").RequireAuthorization().WithTags("Categories");
        group.MapGet("/", async ([FromQuery] CategoryType? type, [FromQuery] bool? includeArchived, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetCategoriesQuery(type, includeArchived ?? false), ct)).ToHttpResult());
        group.MapGet("/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
            (await sender.Send(new GetCategoryByIdQuery(id), ct)).ToHttpResult());
        group.MapPost("/", async ([FromBody] CategoryRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new CreateCategoryCommand(request.Name, request.Type, request.ParentCategoryId, request.Icon), ct))
                .ToHttpResult(value => Results.Created($"/api/categories/{value.Id}", value)));
        group.MapPut("/{id:guid}", async (Guid id, [FromBody] CategoryRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new UpdateCategoryCommand(id, request.Name, request.Type, request.ParentCategoryId, request.Icon), ct)).ToHttpResult());
        group.MapPut("/reorder", async ([FromBody] ReorderCategoriesRequest request, ISender sender, CancellationToken ct) =>
            (await sender.Send(new ReorderCategoriesCommand(request.ParentCategoryId, request.CategoryIds), ct)).ToHttpResult());
        group.MapDelete("/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
            (await sender.Send(new ArchiveCategoryCommand(id), ct)).ToHttpResult());
        group.MapPost("/{id:guid}/restore", async (Guid id, ISender sender, CancellationToken ct) =>
            (await sender.Send(new RestoreCategoryCommand(id), ct)).ToHttpResult());
        return app;
    }

    public sealed record CategoryRequest(string Name, CategoryType Type, Guid? ParentCategoryId, string? Icon);
    public sealed record ReorderCategoriesRequest(Guid? ParentCategoryId, IReadOnlyList<Guid> CategoryIds);
}
