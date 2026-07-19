using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.CreditCards;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class CreditCardAccountConfiguration : IEntityTypeConfiguration<CreditCardAccount>
{
    public void Configure(EntityTypeBuilder<CreditCardAccount> builder)
    {
        builder.ToTable("credit_card_accounts");
        builder.HasKey(card => card.Id);
        builder.Property(card => card.Id).HasColumnName("id");
        builder.Property(card => card.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(card => card.AccountId).HasColumnName("account_id").IsRequired();
        builder.Property(card => card.IssuerName).HasColumnName("issuer_name").HasMaxLength(100).IsRequired();
        builder.Property(card => card.CardName).HasColumnName("card_name").HasMaxLength(100).IsRequired();
        builder.Property(card => card.LastFourDigits).HasColumnName("last_four_digits").HasMaxLength(4);
        builder.Property(card => card.CreditLimit).HasColumnName("credit_limit").HasColumnType("numeric(18,2)");
        builder.Property(card => card.StatementClosingDay).HasColumnName("statement_closing_day").IsRequired();
        builder.Property(card => card.PaymentDueDay).HasColumnName("payment_due_day").IsRequired();
        builder.Property(card => card.PaymentAccountId).HasColumnName("payment_account_id");
        builder.Property(card => card.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(card => card.UpdatedAtUtc).HasColumnName("updated_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.ToTable(table =>
        {
            table.HasCheckConstraint("ck_credit_card_accounts_statement_closing_day", "statement_closing_day BETWEEN 1 AND 31");
            table.HasCheckConstraint("ck_credit_card_accounts_payment_due_day", "payment_due_day BETWEEN 1 AND 31");
            table.HasCheckConstraint("ck_credit_card_accounts_credit_limit_positive", "credit_limit IS NULL OR credit_limit > 0");
            table.HasCheckConstraint("ck_credit_card_accounts_payment_not_self", "payment_account_id IS NULL OR payment_account_id <> account_id");
        });
        builder.HasOne<PersonalFinance.Domain.Users.User>().WithMany().HasForeignKey(card => card.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<PersonalFinance.Domain.Accounts.Account>().WithMany().HasForeignKey(card => card.AccountId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<PersonalFinance.Domain.Accounts.Account>().WithMany().HasForeignKey(card => card.PaymentAccountId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(card => card.AccountId).IsUnique();
        builder.HasIndex(card => new { card.UserId, card.AccountId });
    }
}
