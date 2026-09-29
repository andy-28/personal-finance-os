using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.FinancialEvents;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class FinancialEventChecklistItemConfiguration : IEntityTypeConfiguration<FinancialEventChecklistItem>
{
    public void Configure(EntityTypeBuilder<FinancialEventChecklistItem> builder)
    {
        builder.ToTable("financial_event_checklist_items");
        builder.HasKey(item => item.Id);
        builder.Property(item => item.Id).HasColumnName("id");
        builder.Property(item => item.FinancialEventId).HasColumnName("financial_event_id").IsRequired();
        builder.Property(item => item.Text).HasColumnName("text").HasMaxLength(240).IsRequired();
        builder.Property(item => item.IsCompleted).HasColumnName("is_completed").IsRequired();
        builder.Property(item => item.SortOrder).HasColumnName("sort_order").IsRequired();
        builder.Property(item => item.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(item => item.CompletedAtUtc).HasColumnName("completed_at_utc").HasColumnType("timestamp with time zone");
        builder.HasIndex(item => new { item.FinancialEventId, item.SortOrder });
        builder.HasOne<FinancialEvent>().WithMany().HasForeignKey(item => item.FinancialEventId).OnDelete(DeleteBehavior.Cascade);
    }
}
