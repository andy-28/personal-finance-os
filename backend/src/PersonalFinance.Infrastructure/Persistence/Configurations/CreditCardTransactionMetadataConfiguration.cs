using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.CreditCards;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class CreditCardTransactionMetadataConfiguration : IEntityTypeConfiguration<CreditCardTransactionMetadata>
{
    public void Configure(EntityTypeBuilder<CreditCardTransactionMetadata> builder)
    {
        builder.ToTable("credit_card_transaction_metadata");
        builder.HasKey(metadata => metadata.Id);
        builder.Property(metadata => metadata.Id).HasColumnName("id");
        builder.Property(metadata => metadata.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(metadata => metadata.TransactionId).HasColumnName("transaction_id").IsRequired();
        builder.Property(metadata => metadata.CreditCardAccountId).HasColumnName("credit_card_account_id").IsRequired();
        builder.Property(metadata => metadata.PurchaseDate).HasColumnName("purchase_date").HasColumnType("date").IsRequired();
        builder.Property(metadata => metadata.PostedDate).HasColumnName("posted_date").HasColumnType("date");
        builder.Property(metadata => metadata.Merchant).HasColumnName("merchant").HasMaxLength(150);
        builder.Property(metadata => metadata.OriginalTransactionId).HasColumnName("original_transaction_id");
        builder.Property(metadata => metadata.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(metadata => metadata.UpdatedAtUtc).HasColumnName("updated_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.HasOne<PersonalFinance.Domain.Users.User>().WithMany().HasForeignKey(metadata => metadata.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<PersonalFinance.Domain.Transactions.Transaction>().WithMany().HasForeignKey(metadata => metadata.TransactionId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<PersonalFinance.Domain.Accounts.Account>().WithMany().HasForeignKey(metadata => metadata.CreditCardAccountId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<PersonalFinance.Domain.Transactions.Transaction>().WithMany().HasForeignKey(metadata => metadata.OriginalTransactionId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(metadata => metadata.TransactionId).IsUnique();
        builder.HasIndex(metadata => new { metadata.UserId, metadata.CreditCardAccountId, metadata.PurchaseDate });
    }
}
