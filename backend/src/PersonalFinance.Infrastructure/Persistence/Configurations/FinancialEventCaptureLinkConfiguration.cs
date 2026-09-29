using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.FinancialEvents;
using PersonalFinance.Domain.TransactionCaptures;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class FinancialEventCaptureLinkConfiguration : IEntityTypeConfiguration<FinancialEventCaptureLink>
{
    public void Configure(EntityTypeBuilder<FinancialEventCaptureLink> builder)
    {
        builder.ToTable("financial_event_capture_links");
        builder.HasKey(link => link.Id);
        builder.Property(link => link.Id).HasColumnName("id");
        builder.Property(link => link.FinancialEventId).HasColumnName("financial_event_id").IsRequired();
        builder.Property(link => link.TransactionCaptureId).HasColumnName("transaction_capture_id").IsRequired();
        builder.Property(link => link.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.HasIndex(link => new { link.FinancialEventId, link.TransactionCaptureId }).IsUnique();
        builder.HasIndex(link => link.TransactionCaptureId).IsUnique();
        builder.HasOne<FinancialEvent>().WithMany().HasForeignKey(link => link.FinancialEventId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<TransactionCapture>().WithMany().HasForeignKey(link => link.TransactionCaptureId).OnDelete(DeleteBehavior.Cascade);
    }
}
