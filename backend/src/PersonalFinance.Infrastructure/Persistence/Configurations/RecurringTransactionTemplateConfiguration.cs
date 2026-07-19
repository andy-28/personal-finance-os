using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.Recurring;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class RecurringTransactionTemplateConfiguration : IEntityTypeConfiguration<RecurringTransactionTemplate>
{
    public void Configure(EntityTypeBuilder<RecurringTransactionTemplate> builder)
    {
        builder.ToTable("recurring_transaction_templates");
        builder.HasKey(template => template.Id);
        builder.Property(template => template.Id).HasColumnName("id");
        builder.Property(template => template.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(template => template.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
        builder.Property(template => template.TransactionType).HasColumnName("transaction_type").HasConversion<string>().HasMaxLength(40).IsRequired();
        builder.Property(template => template.Amount).HasColumnName("amount").HasColumnType("numeric(18,2)").IsRequired();
        builder.Property(template => template.CurrencyCode).HasColumnName("currency").HasMaxLength(3).IsRequired();
        builder.Property(template => template.SourceAccountId).HasColumnName("source_account_id");
        builder.Property(template => template.DestinationAccountId).HasColumnName("destination_account_id");
        builder.Property(template => template.CategoryId).HasColumnName("category_id");
        builder.Property(template => template.Merchant).HasColumnName("merchant").HasMaxLength(150);
        builder.Property(template => template.Description).HasColumnName("description").HasMaxLength(150);
        builder.Property(template => template.Note).HasColumnName("note").HasMaxLength(1000);
        builder.Property(template => template.Frequency).HasColumnName("frequency").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(template => template.Interval).HasColumnName("interval").IsRequired();
        builder.Property(template => template.DayOfMonth).HasColumnName("day_of_month");
        builder.Property(template => template.DayOfWeek).HasColumnName("day_of_week").HasConversion<string>().HasMaxLength(20);
        builder.Property(template => template.StartDate).HasColumnName("start_date").HasColumnType("date").IsRequired();
        builder.Property(template => template.EndDate).HasColumnName("end_date").HasColumnType("date");
        builder.Property(template => template.NextOccurrenceDate).HasColumnName("next_occurrence_date").HasColumnType("date");
        builder.Property(template => template.IsActive).HasColumnName("is_active").IsRequired();
        builder.Property(template => template.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(template => template.UpdatedAtUtc).HasColumnName("updated_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.ToTable(table =>
        {
            table.HasCheckConstraint("ck_recurring_transaction_templates_amount_positive", "amount > 0");
            table.HasCheckConstraint("ck_recurring_transaction_templates_interval_positive", "interval > 0");
            table.HasCheckConstraint("ck_recurring_transaction_templates_day_of_month", "day_of_month IS NULL OR day_of_month BETWEEN 1 AND 31");
        });
        builder.HasOne<PersonalFinance.Domain.Users.User>().WithMany().HasForeignKey(template => template.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<PersonalFinance.Domain.Accounts.Account>().WithMany().HasForeignKey(template => template.SourceAccountId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<PersonalFinance.Domain.Accounts.Account>().WithMany().HasForeignKey(template => template.DestinationAccountId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<PersonalFinance.Domain.Categories.Category>().WithMany().HasForeignKey(template => template.CategoryId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(template => new { template.UserId, template.IsActive, template.NextOccurrenceDate });
    }
}
