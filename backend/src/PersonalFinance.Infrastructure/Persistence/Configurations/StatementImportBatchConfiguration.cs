using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.StatementImports;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class StatementImportBatchConfiguration : IEntityTypeConfiguration<StatementImportBatch>
{
    public void Configure(EntityTypeBuilder<StatementImportBatch> builder)
    {
        builder.ToTable("statement_import_batches");
        builder.HasKey(batch => batch.Id);
        builder.Property(batch => batch.Id).HasColumnName("id");
        builder.Property(batch => batch.UserId).HasColumnName("user_id");
        builder.Property(batch => batch.CreditCardAccountId).HasColumnName("credit_card_account_id");
        builder.Property(batch => batch.Provider).HasColumnName("provider").HasMaxLength(80).IsRequired();
        builder.Property(batch => batch.OriginalFileName).HasColumnName("original_file_name").HasMaxLength(260).IsRequired();
        builder.Property(batch => batch.FileHash).HasColumnName("file_hash").HasMaxLength(128).IsRequired();
        builder.Property(batch => batch.StatementPeriodStart).HasColumnName("statement_period_start");
        builder.Property(batch => batch.StatementPeriodEnd).HasColumnName("statement_period_end");
        builder.Property(batch => batch.PaymentDueDate).HasColumnName("payment_due_date");
        builder.Property(batch => batch.PreviousBalance).HasColumnName("previous_balance").HasPrecision(18, 2);
        builder.Property(batch => batch.PaymentAmount).HasColumnName("payment_amount").HasPrecision(18, 2);
        builder.Property(batch => batch.NewCharges).HasColumnName("new_charges").HasPrecision(18, 2);
        builder.Property(batch => batch.StatementAmount).HasColumnName("statement_amount").HasPrecision(18, 2);
        builder.Property(batch => batch.MinimumPayment).HasColumnName("minimum_payment").HasPrecision(18, 2);
        builder.Property(batch => batch.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(40).IsRequired();
        builder.Property(batch => batch.ParserVersion).HasColumnName("parser_version").HasMaxLength(80).IsRequired();
        builder.Property(batch => batch.CreatedAtUtc).HasColumnName("created_at_utc");
        builder.Property(batch => batch.ParsedAtUtc).HasColumnName("parsed_at_utc");
        builder.Property(batch => batch.PostedAtUtc).HasColumnName("posted_at_utc");
        builder.Property(batch => batch.ErrorCode).HasColumnName("error_code").HasMaxLength(80);
        builder.Property(batch => batch.ErrorMessage).HasColumnName("error_message").HasMaxLength(1000);
        builder.HasIndex(batch => new { batch.UserId, batch.CreditCardAccountId, batch.FileHash }).IsUnique();
        builder.HasIndex(batch => new { batch.UserId, batch.CreditCardAccountId, batch.Status });
        builder.HasIndex(batch => batch.CreatedAtUtc);
    }
}
