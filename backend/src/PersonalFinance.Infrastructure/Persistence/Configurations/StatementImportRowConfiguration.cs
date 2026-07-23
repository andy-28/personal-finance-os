using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.StatementImports;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class StatementImportRowConfiguration : IEntityTypeConfiguration<StatementImportRow>
{
    public void Configure(EntityTypeBuilder<StatementImportRow> builder)
    {
        builder.ToTable("statement_import_rows");
        builder.HasKey(row => row.Id);
        builder.Property(row => row.Id).HasColumnName("id");
        builder.Property(row => row.BatchId).HasColumnName("batch_id");
        builder.Property(row => row.SourceRowNumber).HasColumnName("source_row_number");
        builder.Property(row => row.TransactionDate).HasColumnName("transaction_date");
        builder.Property(row => row.PostingDate).HasColumnName("posting_date");
        builder.Property(row => row.RawDescription).HasColumnName("raw_description").HasMaxLength(500).IsRequired();
        builder.Property(row => row.NormalizedDescription).HasColumnName("normalized_description").HasMaxLength(200).IsRequired();
        builder.Property(row => row.Amount).HasColumnName("amount").HasPrecision(18, 2);
        builder.Property(row => row.Currency).HasColumnName("currency").HasMaxLength(3).IsRequired();
        builder.Property(row => row.ForeignAmount).HasColumnName("foreign_amount").HasPrecision(18, 2);
        builder.Property(row => row.ForeignCurrency).HasColumnName("foreign_currency").HasMaxLength(3);
        builder.Property(row => row.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(40).IsRequired();
        builder.Property(row => row.IsInstallment).HasColumnName("is_installment");
        builder.Property(row => row.InstallmentCurrentNumber).HasColumnName("installment_current_number");
        builder.Property(row => row.InstallmentTotalNumber).HasColumnName("installment_total_number");
        builder.Property(row => row.RawText).HasColumnName("raw_text").HasMaxLength(1000);
        builder.Property(row => row.Fingerprint).HasColumnName("fingerprint").HasMaxLength(128).IsRequired();
        builder.Property(row => row.MatchStatus).HasColumnName("match_status").HasConversion<string>().HasMaxLength(40).IsRequired();
        builder.Property(row => row.MatchedTransactionId).HasColumnName("matched_transaction_id");
        builder.Property(row => row.ReviewStatus).HasColumnName("review_status").HasConversion<string>().HasMaxLength(40).IsRequired();
        builder.Property(row => row.CategoryId).HasColumnName("category_id");
        builder.Property(row => row.CreatedTransactionId).HasColumnName("created_transaction_id");
        builder.Property(row => row.FailureReason).HasColumnName("failure_reason").HasMaxLength(500);
        builder.Property(row => row.CreatedAtUtc).HasColumnName("created_at_utc");
        builder.HasIndex(row => row.BatchId);
        builder.HasIndex(row => row.Fingerprint);
        builder.HasIndex(row => row.ReviewStatus);
        builder.HasIndex(row => row.CreatedTransactionId);
    }
}
