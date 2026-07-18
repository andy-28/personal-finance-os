using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace PersonalFinance.IntegrationTests;

public sealed class AuthenticationEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public AuthenticationEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Me_Without_Access_Token_Returns_401()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_Account_Without_Access_Token_Returns_401()
    {
        using var client = _factory.CreateClient();
        var response = await client.PostAsync("/api/accounts", new StringContent("{}", System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
