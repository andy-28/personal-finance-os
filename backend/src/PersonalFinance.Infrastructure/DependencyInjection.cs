using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Application.Abstractions.Persistence;
using PersonalFinance.Application.Abstractions.StatementImports;
using PersonalFinance.Application.Abstractions.Time;
using PersonalFinance.Infrastructure.Authentication;
using PersonalFinance.Infrastructure.Persistence;
using PersonalFinance.Infrastructure.Seeding;
using PersonalFinance.Infrastructure.StatementImports;
using PersonalFinance.Infrastructure.Time;

namespace PersonalFinance.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<DevelopmentSeedOptions>(configuration.GetSection(DevelopmentSeedOptions.SectionName));
        services.PostConfigure<DevelopmentSeedOptions>(options =>
        {
            options.Email = configuration["PFOS_SEED_EMAIL"] ?? options.Email;
            options.Password = configuration["PFOS_SEED_PASSWORD"] ?? options.Password;
        });
        var postgresConnectionString = configuration.GetConnectionString("Postgres")
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:Postgres or ConnectionStrings:DefaultConnection is required.");

        services.AddDbContext<PersonalFinanceDbContext>(options =>
            options.UseNpgsql(postgresConnectionString));
        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<PersonalFinanceDbContext>());
        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();
        services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<DevelopmentDataSeeder>();
        services.AddScoped<IStatementImporter, RichartPdfStatementImporter>();
        services.AddScoped<IStatementImporter, EsunPdfStatementImporter>();
        return services;
    }
}
