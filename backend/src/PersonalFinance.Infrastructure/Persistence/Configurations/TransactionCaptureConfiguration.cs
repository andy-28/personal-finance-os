using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.TransactionCaptures;
using PersonalFinance.Domain.Users;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class TransactionCaptureConfiguration : IEntityTypeConfiguration<TransactionCapture>
{
    public void Configure(EntityTypeBuilder<TransactionCapture> builder)
    {
        builder.ToTable("transaction_captures", table => table.HasCheckConstraint("ck_transaction_captures_amount", "amount > 0"));
        builder.HasKey(item => item.Id);
        builder.Property(item => item.Id).HasColumnName("id");
        builder.Property(item => item.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(item => item.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(item => item.Amount).HasColumnName("amount").HasPrecision(18, 2).IsRequired();
        builder.Property(item => item.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsRequired();
        builder.Property(item => item.OccurredAtUtc).HasColumnName("occurred_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(item => item.CapturedAtUtc).HasColumnName("captured_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(item => item.Description).HasColumnName("description").HasMaxLength(160).IsRequired();
        builder.Property(item => item.MerchantRaw).HasColumnName("merchant_raw").HasMaxLength(200);
        builder.Property(item => item.PaymentInstrumentType).HasColumnName("payment_instrument_type").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(item => item.PaymentInstrumentId).HasColumnName("payment_instrument_id").IsRequired();
        builder.Property(item => item.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(24).IsRequired();
        builder.Property(item => item.SourceReference).HasColumnName("source_reference").HasMaxLength(120);
        builder.Property(item => item.Note).HasColumnName("note").HasMaxLength(1000);
        builder.Property(item => item.DismissedAtUtc).HasColumnName("dismissed_at_utc").HasColumnType("timestamp with time zone");
        builder.HasIndex(item => new { item.UserId, item.Status, item.CapturedAtUtc });
        builder.HasIndex(item => new { item.UserId, item.Source, item.SourceReference }).IsUnique().HasFilter("source_reference IS NOT NULL");
        builder.HasOne<User>().WithMany().HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Account>().WithMany().HasForeignKey(item => item.PaymentInstrumentId).OnDelete(DeleteBehavior.Restrict);
    }
}
