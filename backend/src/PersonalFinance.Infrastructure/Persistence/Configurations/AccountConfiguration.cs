using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.Accounts;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> builder)
    {
        builder.ToTable("accounts");
        builder.HasKey(account => account.Id);
        builder.Property(account => account.Id).HasColumnName("id");
        builder.Property(account => account.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(account => account.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(account => account.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(account => account.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsRequired();
        builder.Property(account => account.InstitutionName).HasColumnName("institution_name").HasMaxLength(100);
        builder.Property(account => account.DisplayOrder).HasColumnName("display_order").IsRequired();
        builder.Property(account => account.IsArchived).HasColumnName("is_archived").IsRequired();
        builder.Property(account => account.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(account => account.UpdatedAtUtc).HasColumnName("updated_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.HasIndex(account => account.UserId);
        builder.HasIndex(account => new { account.UserId, account.IsArchived });
        builder.HasIndex(account => new { account.UserId, account.DisplayOrder });
    }
}
