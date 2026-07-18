using FluentValidation;
using MediatR;
using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Application.Categories.Models;
using PersonalFinance.Application.Common;
using PersonalFinance.Domain.Categories;

namespace PersonalFinance.Application.Categories;

public sealed record CreateCategoryCommand(string Name, CategoryType Type, Guid? ParentCategoryId, string? Icon) : IRequest<Result<CategoryDetailDto>>;
public sealed record GetCategoriesQuery(CategoryType? Type, bool IncludeArchived) : IRequest<Result<IReadOnlyList<CategoryDto>>>;
public sealed record GetCategoryByIdQuery(Guid Id) : IRequest<Result<CategoryDetailDto>>;
public sealed record UpdateCategoryCommand(Guid Id, string Name, CategoryType Type, Guid? ParentCategoryId, string? Icon) : IRequest<Result<CategoryDetailDto>>;
public sealed record ReorderCategoriesCommand(Guid? ParentCategoryId, IReadOnlyList<Guid> CategoryIds) : IRequest<Result>;
public sealed record ArchiveCategoryCommand(Guid Id) : IRequest<Result>;
public sealed record RestoreCategoryCommand(Guid Id) : IRequest<Result<CategoryDetailDto>>;

public sealed class CreateCategoryCommandValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Icon).MaximumLength(50);
    }
}

public sealed class UpdateCategoryCommandValidator : AbstractValidator<UpdateCategoryCommand>
{
    public UpdateCategoryCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Icon).MaximumLength(50);
    }
}

public sealed class ReorderCategoriesCommandValidator : AbstractValidator<ReorderCategoriesCommand>
{
    public ReorderCategoriesCommandValidator() => RuleFor(x => x.CategoryIds).NotEmpty().Must(ids => ids.Distinct().Count() == ids.Count).WithMessage("Category ids must be unique.");
}

public sealed class CategoriesHandler :
    IRequestHandler<CreateCategoryCommand, Result<CategoryDetailDto>>,
    IRequestHandler<GetCategoriesQuery, Result<IReadOnlyList<CategoryDto>>>,
    IRequestHandler<GetCategoryByIdQuery, Result<CategoryDetailDto>>,
    IRequestHandler<UpdateCategoryCommand, Result<CategoryDetailDto>>,
    IRequestHandler<ReorderCategoriesCommand, Result>,
    IRequestHandler<ArchiveCategoryCommand, Result>,
    IRequestHandler<RestoreCategoryCommand, Result<CategoryDetailDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;

    public CategoriesHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTimeProvider dateTimeProvider)
    {
        _db = db;
        _currentUser = currentUser;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<Result<CategoryDetailDto>> Handle(CreateCategoryCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Unauthorized<CategoryDetailDto>();
        var validation = ValidateParent(userId.Value, request.Type, request.ParentCategoryId, null);
        if (validation.IsFailure) return Result<CategoryDetailDto>.Failure(validation.Errors.ToArray());
        var duplicate = HasDuplicate(userId.Value, request.Type, request.ParentCategoryId, request.Name, null);
        if (duplicate) return Result<CategoryDetailDto>.Failure(Error.Conflict("Category", "A category with the same name already exists in this scope."));
        var order = NextDisplayOrder(userId.Value, request.ParentCategoryId);
        var category = Category.Create(userId.Value, request.Name, request.Type, request.ParentCategoryId, request.Icon, order, _dateTimeProvider.UtcNow);
        _db.AddCategory(category);
        await _db.SaveChangesAsync(cancellationToken);
        return Result<CategoryDetailDto>.Success(ToDetailDto(category));
    }

    public Task<Result<IReadOnlyList<CategoryDto>>> Handle(GetCategoriesQuery request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Task.FromResult(Result<IReadOnlyList<CategoryDto>>.Failure(Error.Unauthorized("Auth", "Authentication is required.")));
        var all = _db.Categories
            .Where(category => category.UserId == userId && (request.IncludeArchived || !category.IsArchived) && (request.Type == null || category.Type == request.Type))
            .ToArray();
        var childrenByParent = all
            .Where(category => category.ParentCategoryId is not null)
            .GroupBy(category => category.ParentCategoryId!.Value)
            .ToDictionary(group => group.Key, group => group.OrderBy(category => category.DisplayOrder).ThenBy(category => category.CreatedAtUtc).Select(ToChildDto).ToArray());
        var parents = all
            .Where(category => category.ParentCategoryId is null)
            .OrderBy(category => category.DisplayOrder)
            .ThenBy(category => category.CreatedAtUtc)
            .Select(category => new CategoryDto(category.Id, category.Name, category.Type, category.Icon, category.DisplayOrder, category.IsArchived, childrenByParent.GetValueOrDefault(category.Id, [])))
            .ToArray();
        return Task.FromResult(Result<IReadOnlyList<CategoryDto>>.Success(parents));
    }

    public Task<Result<CategoryDetailDto>> Handle(GetCategoryByIdQuery request, CancellationToken cancellationToken)
    {
        var category = FindOwned(request.Id);
        return Task.FromResult(category is null ? NotFound<CategoryDetailDto>() : Result<CategoryDetailDto>.Success(ToDetailDto(category)));
    }

    public async Task<Result<CategoryDetailDto>> Handle(UpdateCategoryCommand request, CancellationToken cancellationToken)
    {
        var category = FindOwned(request.Id);
        if (category is null) return NotFound<CategoryDetailDto>();
        var userId = RequireUserId()!.Value;
        var validation = ValidateParent(userId, request.Type, request.ParentCategoryId, request.Id);
        if (validation.IsFailure) return Result<CategoryDetailDto>.Failure(validation.Errors.ToArray());
        if (category.ParentCategoryId is null && _db.Categories.Any(child => child.UserId == userId && child.ParentCategoryId == category.Id && child.Type != request.Type))
        {
            return Result<CategoryDetailDto>.Failure(Error.Conflict("Category", "Parent category type cannot change while children have another type."));
        }

        if (HasDuplicate(userId, request.Type, request.ParentCategoryId, request.Name, request.Id))
        {
            return Result<CategoryDetailDto>.Failure(Error.Conflict("Category", "A category with the same name already exists in this scope."));
        }

        category.Update(request.Name, request.Type, request.ParentCategoryId, request.Icon, _dateTimeProvider.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        return Result<CategoryDetailDto>.Success(ToDetailDto(category));
    }

    public async Task<Result> Handle(ReorderCategoriesCommand request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null) return Result.Failure(Error.Unauthorized("Auth", "Authentication is required."));
        var scope = _db.Categories.Where(category => category.UserId == userId && !category.IsArchived && category.ParentCategoryId == request.ParentCategoryId).ToArray();
        if (request.CategoryIds.Count != scope.Length || request.CategoryIds.Except(scope.Select(category => category.Id)).Any())
        {
            return Result.Failure(Error.Validation("CategoryIds", "Category ids must exactly match the active categories in this scope."));
        }

        var utcNow = _dateTimeProvider.UtcNow;
        await _db.ExecuteInTransactionAsync(async ct =>
        {
            for (var i = 0; i < request.CategoryIds.Count; i++)
            {
                scope.First(category => category.Id == request.CategoryIds[i]).SetDisplayOrder(i, utcNow);
            }

            await _db.SaveChangesAsync(ct);
        }, cancellationToken);
        return Result.Success();
    }

    public async Task<Result> Handle(ArchiveCategoryCommand request, CancellationToken cancellationToken)
    {
        var category = FindOwned(request.Id);
        if (category is null) return Result.Failure(Error.NotFound("Category", "Category was not found."));
        var utcNow = _dateTimeProvider.UtcNow;
        category.Archive(utcNow);
        if (category.ParentCategoryId is null)
        {
            foreach (var child in _db.Categories.Where(child => child.UserId == category.UserId && child.ParentCategoryId == category.Id))
            {
                child.Archive(utcNow);
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<CategoryDetailDto>> Handle(RestoreCategoryCommand request, CancellationToken cancellationToken)
    {
        var category = FindOwned(request.Id);
        if (category is null) return NotFound<CategoryDetailDto>();
        if (category.ParentCategoryId is { } parentId)
        {
            var parent = FindOwned(parentId);
            if (parent is null || parent.IsArchived)
            {
                return Result<CategoryDetailDto>.Failure(Error.Conflict("Category", "Parent category must be active before restoring this category."));
            }
        }

        category.Restore(NextDisplayOrder(category.UserId, category.ParentCategoryId), _dateTimeProvider.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);
        return Result<CategoryDetailDto>.Success(ToDetailDto(category));
    }

    private Result ValidateParent(Guid userId, CategoryType type, Guid? parentCategoryId, Guid? selfId)
    {
        if (parentCategoryId is null) return Result.Success();
        if (selfId == parentCategoryId) return Result.Failure(Error.Validation("ParentCategoryId", "A category cannot be its own parent."));
        var parent = _db.Categories.FirstOrDefault(category => category.Id == parentCategoryId && category.UserId == userId);
        if (parent is null || parent.ParentCategoryId is not null || parent.IsArchived) return Result.Failure(Error.Validation("ParentCategoryId", "Parent category is invalid."));
        if (parent.Type != type) return Result.Failure(Error.Validation("ParentCategoryId", "Parent and child category types must match."));
        if (selfId is { } id && _db.Categories.Any(child => child.UserId == userId && child.ParentCategoryId == id)) return Result.Failure(Error.Conflict("Category", "A parent with children cannot become a child."));
        return Result.Success();
    }

    private bool HasDuplicate(Guid userId, CategoryType type, Guid? parentCategoryId, string name, Guid? exceptId)
    {
        var normalized = Category.NormalizeName(name);
        return _db.Categories.Any(category => category.UserId == userId && category.Type == type && category.ParentCategoryId == parentCategoryId && category.NormalizedName == normalized && category.Id != exceptId);
    }

    private int NextDisplayOrder(Guid userId, Guid? parentCategoryId) => _db.Categories.Where(category => category.UserId == userId && !category.IsArchived && category.ParentCategoryId == parentCategoryId).Select(category => category.DisplayOrder).ToArray().DefaultIfEmpty(-1).Max() + 1;
    private Guid? RequireUserId() => _currentUser.IsAuthenticated ? _currentUser.UserId : null;
    private Category? FindOwned(Guid id) => RequireUserId() is { } userId ? _db.Categories.FirstOrDefault(category => category.Id == id && category.UserId == userId) : null;
    private static Result<T> Unauthorized<T>() => Result<T>.Failure(Error.Unauthorized("Auth", "Authentication is required."));
    private static Result<T> NotFound<T>() => Result<T>.Failure(Error.NotFound("Category", "Category was not found."));
    private static CategoryChildDto ToChildDto(Category category) => new(category.Id, category.Name, category.Type, category.Icon, category.DisplayOrder, category.IsArchived);
    private static CategoryDetailDto ToDetailDto(Category category) => new(category.Id, category.Name, category.Type, category.ParentCategoryId, category.Icon, category.DisplayOrder, category.IsArchived, category.CreatedAtUtc, category.UpdatedAtUtc);
}
