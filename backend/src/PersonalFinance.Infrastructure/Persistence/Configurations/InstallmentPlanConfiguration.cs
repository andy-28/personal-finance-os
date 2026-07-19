using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.CreditCards;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class InstallmentPlanConfiguration : IEntityTypeConfiguration<InstallmentPlan>
{
    public void Configure(EntityTypeBuilder<InstallmentPlan> builder)
    {
        builder.ToTable("installment_plans");
        builder.HasKey(plan => plan.Id);
        builder.Property(plan => plan.Id).HasColumnName("id");
        builder.Property(plan => plan.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(plan => plan.CreditCardAccountId).HasColumnName("credit_card_account_id").IsRequired();
        builder.Property(plan => plan.Merchant).HasColumnName("merchant").HasMaxLength(150).IsRequired();
        builder.Property(plan => plan.Description).HasColumnName("description").HasMaxLength(500);
        builder.Property(plan => plan.PurchaseDate).HasColumnName("purchase_date").HasColumnType("date").IsRequired();
        builder.Property(plan => plan.OriginalAmount).HasColumnName("original_amount").HasColumnType("numeric(18,2)").IsRequired();
        builder.Property(plan => plan.InstallmentCount).HasColumnName("installment_count").IsRequired();
        builder.Property(plan => plan.InstallmentAmount).HasColumnName("installment_amount").HasColumnType("numeric(18,2)").IsRequired();
        builder.Property(plan => plan.FirstInstallmentDate).HasColumnName("first_installment_date").HasColumnType("date").IsRequired();
        builder.Property(plan => plan.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(plan => plan.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(plan => plan.UpdatedAtUtc).HasColumnName("updated_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.ToTable(table =>
        {
            table.HasCheckConstraint("ck_installment_plans_original_amount_positive", "original_amount > 0");
            table.HasCheckConstraint("ck_installment_plans_installment_count_positive", "installment_count > 0");
        });
        builder.HasMany(plan => plan.ScheduleItems).WithOne().HasForeignKey(item => item.InstallmentPlanId).OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(plan => plan.ScheduleItems).UsePropertyAccessMode(PropertyAccessMode.Field);
        builder.HasOne<PersonalFinance.Domain.Users.User>().WithMany().HasForeignKey(plan => plan.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<PersonalFinance.Domain.Accounts.Account>().WithMany().HasForeignKey(plan => plan.CreditCardAccountId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(plan => new { plan.UserId, plan.CreditCardAccountId, plan.Status });
    }
}
