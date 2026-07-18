using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.Categories;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("categories");
        builder.HasKey(category => category.Id);
        builder.Property(category => category.Id).HasColumnName("id");
        builder.Property(category => category.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(category => category.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(category => category.NormalizedName).HasColumnName("normalized_name").HasMaxLength(100).IsRequired();
        builder.Property(category => category.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(category => category.ParentCategoryId).HasColumnName("parent_category_id");
        builder.Property(category => category.Icon).HasColumnName("icon").HasMaxLength(50);
        builder.Property(category => category.DisplayOrder).HasColumnName("display_order").IsRequired();
        builder.Property(category => category.IsArchived).HasColumnName("is_archived").IsRequired();
        builder.Property(category => category.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(category => category.UpdatedAtUtc).HasColumnName("updated_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.HasOne(category => category.ParentCategory).WithMany(category => category.Children).HasForeignKey(category => category.ParentCategoryId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(category => category.UserId);
        builder.HasIndex(category => new { category.UserId, category.Type });
        builder.HasIndex(category => category.ParentCategoryId);
        builder.HasIndex(category => new { category.UserId, category.Type, category.ParentCategoryId, category.NormalizedName }).IsUnique();
        builder.HasIndex(category => new { category.UserId, category.DisplayOrder });
    }
}
