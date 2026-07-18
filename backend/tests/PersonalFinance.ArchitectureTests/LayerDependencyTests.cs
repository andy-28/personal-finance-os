using System.Reflection;
using NetArchTest.Rules;
using PersonalFinance.Domain.Accounts;
using PersonalFinance.Domain.Common;
using PersonalFinance.Domain.Transactions;

namespace PersonalFinance.ArchitectureTests;

public sealed class LayerDependencyTests
{
    [Fact]
    public void Domain_Should_Not_Depend_On_Application_Infrastructure_Api_Ef_Or_AspNetCore()
    {
        var result = Types
            .InAssembly(typeof(PersonalFinance.Domain.AssemblyMarker).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(
                typeof(PersonalFinance.Application.AssemblyMarker).Namespace!,
                typeof(PersonalFinance.Infrastructure.AssemblyMarker).Namespace!,
                "PersonalFinance.Api",
                "Microsoft.EntityFrameworkCore",
                "Microsoft.AspNetCore")
            .GetResult();

        Assert.True(result.IsSuccessful, GetFailingTypes(result));
    }

    [Fact]
    public void Application_Should_Not_Depend_On_Infrastructure_Or_Api()
    {
        var result = Types
            .InAssembly(typeof(PersonalFinance.Application.AssemblyMarker).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(
                typeof(PersonalFinance.Infrastructure.AssemblyMarker).Namespace!,
                "PersonalFinance.Api")
            .GetResult();

        Assert.True(result.IsSuccessful, GetFailingTypes(result));
    }

    [Fact]
    public void Domain_Entities_Should_Not_Expose_Public_Setters()
    {
        var offenders = typeof(Entity).Assembly.GetTypes()
            .Where(type => type.IsAssignableTo(typeof(Entity)) && !type.IsAbstract)
            .SelectMany(type => type.GetProperties(BindingFlags.Instance | BindingFlags.Public)
                .Where(property => property.SetMethod?.IsPublic == true)
                .Select(property => $"{type.FullName}.{property.Name}"))
            .ToArray();

        Assert.True(offenders.Length == 0, string.Join(Environment.NewLine, offenders));
    }

    [Fact]
    public void Account_Entity_Should_Not_Store_Balance_Columns()
    {
        var forbidden = new[] { "Balance", "CurrentBalance", "AvailableBalance", "InitialBalance", "OpeningBalance" };
        var offenders = typeof(Account).GetProperties(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
            .Where(property => forbidden.Any(name => property.Name.Contains(name, StringComparison.OrdinalIgnoreCase)))
            .Select(property => property.Name)
            .ToArray();

        Assert.True(offenders.Length == 0, string.Join(Environment.NewLine, offenders));
    }

    [Fact]
    public void Transaction_Entries_Should_Not_Have_Public_Setter()
    {
        var property = typeof(Transaction).GetProperty(nameof(Transaction.Entries));
        Assert.NotNull(property);
        Assert.False(property!.SetMethod?.IsPublic == true);
    }

    [Fact]
    public void Api_Should_Not_Expose_TransactionEntry_Endpoints()
    {
        var offenders = typeof(Program).Assembly.GetTypes()
            .Where(type => type.FullName?.Contains("TransactionEntry", StringComparison.OrdinalIgnoreCase) == true)
            .Select(type => type.FullName)
            .ToArray();

        Assert.True(offenders.Length == 0, string.Join(Environment.NewLine, offenders));
    }
    private static string GetFailingTypes(TestResult result)
    {
        return result.FailingTypes is null
            ? "No failing type details were returned."
            : string.Join(Environment.NewLine, result.FailingTypes.Select(type => type.FullName));
    }
}

