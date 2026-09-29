using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.FinancialEvents;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class FinancialEventActivityConfiguration : IEntityTypeConfiguration<FinancialEventActivity>
{
    public void Configure(EntityTypeBuilder<FinancialEventActivity> builder)
    {
        builder.ToTable("financial_event_activities");
        builder.HasKey(activity => activity.Id);
        builder.Property(activity => activity.Id).HasColumnName("id");
        builder.Property(activity => activity.FinancialEventId).HasColumnName("financial_event_id").IsRequired();
        builder.Property(activity => activity.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(40).IsRequired();
        builder.Property(activity => activity.Description).HasColumnName("description").HasMaxLength(300).IsRequired();
        builder.Property(activity => activity.OccurredAtUtc).HasColumnName("occurred_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.HasIndex(activity => new { activity.FinancialEventId, activity.OccurredAtUtc });
        builder.HasOne<FinancialEvent>().WithMany().HasForeignKey(activity => activity.FinancialEventId).OnDelete(DeleteBehavior.Cascade);
    }
}
