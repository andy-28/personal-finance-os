using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.Recurring;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class RecurringTransactionOccurrenceConfiguration : IEntityTypeConfiguration<RecurringTransactionOccurrence>
{
    public void Configure(EntityTypeBuilder<RecurringTransactionOccurrence> builder)
    {
        builder.ToTable("recurring_transaction_occurrences");
        builder.HasKey(occurrence => occurrence.Id);
        builder.Property(occurrence => occurrence.Id).HasColumnName("id");
        builder.Property(occurrence => occurrence.TemplateId).HasColumnName("template_id").IsRequired();
        builder.Property(occurrence => occurrence.ScheduledDate).HasColumnName("scheduled_date").HasColumnType("date").IsRequired();
        builder.Property(occurrence => occurrence.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(occurrence => occurrence.PostedTransactionId).HasColumnName("posted_transaction_id");
        builder.Property(occurrence => occurrence.SkippedAtUtc).HasColumnName("skipped_at_utc").HasColumnType("timestamp with time zone");
        builder.Property(occurrence => occurrence.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(occurrence => occurrence.UpdatedAtUtc).HasColumnName("updated_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.HasOne<RecurringTransactionTemplate>().WithMany().HasForeignKey(occurrence => occurrence.TemplateId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<PersonalFinance.Domain.Transactions.Transaction>().WithMany().HasForeignKey(occurrence => occurrence.PostedTransactionId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(occurrence => new { occurrence.TemplateId, occurrence.ScheduledDate }).IsUnique();
        builder.HasIndex(occurrence => new { occurrence.Status, occurrence.ScheduledDate });
    }
}
