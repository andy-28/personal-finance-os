using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.TransactionCaptures;
using PersonalFinance.Domain.Users;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class CaptureApiTokenConfiguration : IEntityTypeConfiguration<CaptureApiToken>
{
    public void Configure(EntityTypeBuilder<CaptureApiToken> builder)
    {
        builder.ToTable("capture_api_tokens");
        builder.HasKey(token => token.Id);
        builder.Property(token => token.Id).HasColumnName("id");
        builder.Property(token => token.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(token => token.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(token => token.TokenHash).HasColumnName("token_hash").HasMaxLength(64).IsRequired();
        builder.Property(token => token.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(token => token.LastUsedAtUtc).HasColumnName("last_used_at_utc").HasColumnType("timestamp with time zone");
        builder.Property(token => token.RevokedAtUtc).HasColumnName("revoked_at_utc").HasColumnType("timestamp with time zone");
        builder.HasIndex(token => token.TokenHash).IsUnique();
        builder.HasIndex(token => new { token.UserId, token.RevokedAtUtc });
        builder.HasOne<User>().WithMany().HasForeignKey(token => token.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
