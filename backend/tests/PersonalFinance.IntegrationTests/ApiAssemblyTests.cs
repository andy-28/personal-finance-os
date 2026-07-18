namespace PersonalFinance.IntegrationTests;

public sealed class ApiAssemblyTests
{
    [Fact]
    public void Api_Assembly_Is_Loadable()
    {
        Assert.Equal("PersonalFinance.Api", typeof(Program).Assembly.GetName().Name);
    }
}
