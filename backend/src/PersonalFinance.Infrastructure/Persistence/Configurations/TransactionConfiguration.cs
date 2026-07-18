using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.Transactions;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable("transactions");
        builder.HasKey(transaction => transaction.Id);
        builder.Property(transaction => transaction.Id).HasColumnName("id");
        builder.Property(transaction => transaction.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(transaction => transaction.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(transaction => transaction.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(transaction => transaction.TransactionDate).HasColumnName("transaction_date").HasColumnType("date").IsRequired();
        builder.Property(transaction => transaction.CategoryId).HasColumnName("category_id");
        builder.Property(transaction => transaction.Payee).HasColumnName("payee").HasMaxLength(150);
        builder.Property(transaction => transaction.Note).HasColumnName("note").HasMaxLength(1000);
        builder.Property(transaction => transaction.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(transaction => transaction.UpdatedAtUtc).HasColumnName("updated_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(transaction => transaction.VoidedAtUtc).HasColumnName("voided_at_utc").HasColumnType("timestamp with time zone");
        builder.HasMany(transaction => transaction.Entries).WithOne(entry => entry.Transaction).HasForeignKey(entry => entry.TransactionId).OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(transaction => transaction.Entries).UsePropertyAccessMode(PropertyAccessMode.Field);
        builder.HasOne<PersonalFinance.Domain.Users.User>().WithMany().HasForeignKey(transaction => transaction.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<PersonalFinance.Domain.Categories.Category>().WithMany().HasForeignKey(transaction => transaction.CategoryId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(transaction => new { transaction.UserId, transaction.TransactionDate });
        builder.HasIndex(transaction => new { transaction.UserId, transaction.Status, transaction.TransactionDate });
        builder.HasIndex(transaction => new { transaction.UserId, transaction.Type, transaction.TransactionDate });
        builder.HasIndex(transaction => transaction.CategoryId);
    }
}
