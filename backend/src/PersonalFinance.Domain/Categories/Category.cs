using PersonalFinance.Domain.Common;

namespace PersonalFinance.Domain.Categories;

public sealed class Category : AuditableEntity
{
    private Category() { }

    private Category(Guid id, Guid userId, string name, CategoryType type, Guid? parentCategoryId, string? icon, int displayOrder, DateTimeOffset utcNow)
    {
        Id = id;
        UserId = userId == Guid.Empty ? throw new ArgumentException("User id is required.", nameof(userId)) : userId;
        Name = ValidateName(name);
        NormalizedName = NormalizeName(Name);
        Type = type;
        ParentCategoryId = parentCategoryId;
        Icon = ValidateIcon(icon);
        DisplayOrder = displayOrder < 0 ? throw new ArgumentOutOfRangeException(nameof(displayOrder)) : displayOrder;
        IsArchived = false;
        SetCreated(utcNow);
    }

    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string NormalizedName { get; private set; } = string.Empty;
    public CategoryType Type { get; private set; }
    public Guid? ParentCategoryId { get; private set; }
    public string? Icon { get; private set; }
    public int DisplayOrder { get; private set; }
    public bool IsArchived { get; private set; }
    public Category? ParentCategory { get; private set; }
    public IReadOnlyCollection<Category> Children => _children;
    private readonly List<Category> _children = [];

    public bool IsParent => ParentCategoryId is null;

    public static Category Create(Guid userId, string name, CategoryType type, Guid? parentCategoryId, string? icon, int displayOrder, DateTimeOffset utcNow)
    {
        return new Category(Guid.NewGuid(), userId, name, type, parentCategoryId, icon, displayOrder, utcNow);
    }

    public void Update(string name, CategoryType type, Guid? parentCategoryId, string? icon, DateTimeOffset utcNow)
    {
        if (parentCategoryId == Id)
        {
            throw new InvalidOperationException("A category cannot be its own parent.");
        }

        Name = ValidateName(name);
        NormalizedName = NormalizeName(Name);
        Type = type;
        ParentCategoryId = parentCategoryId;
        Icon = ValidateIcon(icon);
        Touch(utcNow);
    }

    public void SetDisplayOrder(int displayOrder, DateTimeOffset utcNow)
    {
        DisplayOrder = displayOrder < 0 ? throw new ArgumentOutOfRangeException(nameof(displayOrder)) : displayOrder;
        Touch(utcNow);
    }

    public void Archive(DateTimeOffset utcNow)
    {
        IsArchived = true;
        Touch(utcNow);
    }

    public void Restore(int displayOrder, DateTimeOffset utcNow)
    {
        IsArchived = false;
        SetDisplayOrder(displayOrder, utcNow);
    }

    public static string NormalizeName(string name) => ValidateName(name).ToUpperInvariant();

    private static string ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Name is required.", nameof(name));
        }

        var trimmed = name.Trim();
        return trimmed.Length > 100 ? throw new ArgumentException("Name must be 100 characters or fewer.", nameof(name)) : trimmed;
    }

    private static string? ValidateIcon(string? icon)
    {
        if (string.IsNullOrWhiteSpace(icon))
        {
            return null;
        }

        var trimmed = icon.Trim();
        return trimmed.Length > 50 ? throw new ArgumentException("Icon must be 50 characters or fewer.", nameof(icon)) : trimmed;
    }
}
