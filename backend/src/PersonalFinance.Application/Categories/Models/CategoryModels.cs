using PersonalFinance.Domain.Categories;

namespace PersonalFinance.Application.Categories.Models;

public sealed record CategoryChildDto(Guid Id, string Name, CategoryType Type, string? Icon, int DisplayOrder, bool IsArchived);
public sealed record CategoryDto(Guid Id, string Name, CategoryType Type, string? Icon, int DisplayOrder, bool IsArchived, IReadOnlyList<CategoryChildDto> Children);
public sealed record CategoryDetailDto(Guid Id, string Name, CategoryType Type, Guid? ParentCategoryId, string? Icon, int DisplayOrder, bool IsArchived, DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc);
