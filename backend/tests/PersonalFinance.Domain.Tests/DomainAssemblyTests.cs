namespace PersonalFinance.Domain.Tests;

public sealed class DomainAssemblyTests
{
    [Fact]
    public void Domain_Assembly_Is_Loadable()
    {
        Assert.Equal("PersonalFinance.Domain", typeof(PersonalFinance.Domain.AssemblyMarker).Assembly.GetName().Name);
    }
}
