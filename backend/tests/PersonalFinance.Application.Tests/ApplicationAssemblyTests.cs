namespace PersonalFinance.Application.Tests;

public sealed class ApplicationAssemblyTests
{
    [Fact]
    public void Application_Assembly_Is_Loadable()
    {
        Assert.Equal("PersonalFinance.Application", typeof(PersonalFinance.Application.AssemblyMarker).Assembly.GetName().Name);
    }
}
