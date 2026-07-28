using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalFinance.Domain.UserSettings;
using PersonalFinance.Domain.Users;

namespace PersonalFinance.Infrastructure.Persistence.Configurations;

public sealed class UserSettingConfiguration : IEntityTypeConfiguration<UserSetting>
{
    public void Configure(EntityTypeBuilder<UserSetting> builder)
    {
        builder.ToTable("user_settings");
        builder.HasKey(setting => setting.Id);
        builder.Property(setting => setting.Id).HasColumnName("id");
        builder.Property(setting => setting.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(setting => setting.Theme).HasColumnName("theme").HasMaxLength(40).IsRequired();
        builder.Property(setting => setting.WorkshopSettingsJson).HasColumnName("workshop_settings").HasColumnType("jsonb").IsRequired();
        builder.Property(setting => setting.VisualSettingsJson).HasColumnName("visual_settings").HasColumnType("jsonb").IsRequired();
        builder.Property(setting => setting.GoalSettingsJson).HasColumnName("goal_settings").HasColumnType("jsonb").IsRequired();
        builder.Property(setting => setting.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(setting => setting.UpdatedAtUtc).HasColumnName("updated_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.HasIndex(setting => setting.UserId).IsUnique();
        builder.HasOne<User>().WithOne().HasForeignKey<UserSetting>(setting => setting.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

