using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.FinancialEvents;
using PersonalFinance.Domain.Transactions;
using PersonalFinance.Domain.Users;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class FinancialEventConfiguration : IEntityTypeConfiguration<FinancialEvent>
{
    public void Configure(EntityTypeBuilder<FinancialEvent> builder)
    {
        builder.ToTable("financial_events", table => table.HasCheckConstraint("ck_financial_events_amount", "amount > 0"));
        builder.HasKey(item => item.Id);
        builder.Property(item => item.Id).HasColumnName("id");
        builder.Property(item => item.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(item => item.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
        builder.Property(item => item.Kind).HasColumnName("kind").HasConversion<string>().HasMaxLength(40).IsRequired();
        builder.Property(item => item.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(40).IsRequired();
        builder.Property(item => item.Amount).HasColumnName("amount").HasPrecision(18, 2).IsRequired();
        builder.Property(item => item.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsRequired();
        builder.Property(item => item.EventDate).HasColumnName("event_date").HasColumnType("date").IsRequired();
        builder.Property(item => item.ResultDate).HasColumnName("result_date").HasColumnType("date");
        builder.Property(item => item.PaymentSourceAccountId).HasColumnName("payment_source_account_id");
        builder.Property(item => item.RelatedTransactionId).HasColumnName("related_transaction_id");
        builder.Property(item => item.IsCashFlowRealized).HasColumnName("is_cash_flow_realized").IsRequired().HasDefaultValue(false);
        builder.Property(item => item.Note).HasColumnName("note").HasMaxLength(1000);
        builder.Property(item => item.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(item => item.UpdatedAtUtc).HasColumnName("updated_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.HasIndex(item => new { item.UserId, item.EventDate });
        builder.HasIndex(item => item.RelatedTransactionId).IsUnique().HasFilter("related_transaction_id IS NOT NULL");
        builder.HasOne<User>().WithMany().HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Account>().WithMany().HasForeignKey(item => item.PaymentSourceAccountId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne<Transaction>().WithMany().HasForeignKey(item => item.RelatedTransactionId).OnDelete(DeleteBehavior.SetNull);
    }
}
