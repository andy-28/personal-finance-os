using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.CreditCards;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class InstallmentScheduleItemConfiguration : IEntityTypeConfiguration<InstallmentScheduleItem>
{
    public void Configure(EntityTypeBuilder<InstallmentScheduleItem> builder)
    {
        builder.ToTable("installment_schedule_items");
        builder.HasKey(item => item.Id);
        builder.Property(item => item.Id).HasColumnName("id");
        builder.Property(item => item.InstallmentPlanId).HasColumnName("installment_plan_id").IsRequired();
        builder.Property(item => item.InstallmentNumber).HasColumnName("installment_number").IsRequired();
        builder.Property(item => item.DueDate).HasColumnName("due_date").HasColumnType("date").IsRequired();
        builder.Property(item => item.Amount).HasColumnName("amount").HasColumnType("numeric(18,2)").IsRequired();
        builder.Property(item => item.TransactionId).HasColumnName("transaction_id");
        builder.Property(item => item.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(item => item.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.ToTable(table =>
        {
            table.HasCheckConstraint("ck_installment_schedule_items_number_positive", "installment_number > 0");
            table.HasCheckConstraint("ck_installment_schedule_items_amount_positive", "amount > 0");
        });
        builder.HasOne<PersonalFinance.Domain.Transactions.Transaction>().WithMany().HasForeignKey(item => item.TransactionId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(item => new { item.InstallmentPlanId, item.InstallmentNumber }).IsUnique();
        builder.HasIndex(item => item.TransactionId);
    }
}
