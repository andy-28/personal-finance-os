using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.Transactions;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class TransactionEntryConfiguration : IEntityTypeConfiguration<TransactionEntry>
{
    public void Configure(EntityTypeBuilder<TransactionEntry> builder)
    {
        builder.ToTable("transaction_entries");
        builder.HasKey(entry => entry.Id);
        builder.Property(entry => entry.Id).HasColumnName("id");
        builder.Property(entry => entry.TransactionId).HasColumnName("transaction_id").IsRequired();
        builder.Property(entry => entry.AccountId).HasColumnName("account_id").IsRequired();
        builder.Property(entry => entry.Amount).HasColumnName("amount").HasColumnType("numeric(18,2)").IsRequired();
        builder.Property(entry => entry.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.ToTable(table => table.HasCheckConstraint("ck_transaction_entries_amount_non_zero", "amount <> 0"));
        builder.HasOne(entry => entry.Account).WithMany().HasForeignKey(entry => entry.AccountId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(entry => entry.TransactionId);
        builder.HasIndex(entry => entry.AccountId);
        builder.HasIndex(entry => new { entry.AccountId, entry.TransactionId });
        builder.HasIndex(entry => new { entry.TransactionId, entry.AccountId }).IsUnique();
    }
}
