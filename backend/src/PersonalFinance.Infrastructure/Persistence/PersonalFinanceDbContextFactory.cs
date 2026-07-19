using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PersonalFinance.Infrastructure.Persistence;

public sealed class PersonalFinanceDbContextFactory : IDesignTimeDbContextFactory<PersonalFinanceDbContext>
{
    public PersonalFinanceDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Postgres")
            ?? "Host=localhost;Port=55432;Database=personal_finance;Username=pfos;Password=pfos_dev_password";

        var options = new DbContextOptionsBuilder<PersonalFinanceDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new PersonalFinanceDbContext(options);
    }
}
