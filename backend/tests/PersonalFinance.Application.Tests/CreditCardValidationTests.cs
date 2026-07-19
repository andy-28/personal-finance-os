using PersonalFinance.Application.CreditCards;
using PersonalFinance.Application.CreditCards.Models;

namespace PersonalFinance.Application.Tests;

public sealed class CreditCardValidationTests
{
    [Theory]
    [InlineData(0, 20)]
    [InlineData(32, 20)]
    [InlineData(2, 0)]
    [InlineData(2, 32)]
    public void CreditCard_Request_Requires_Valid_Statement_And_Due_Days(int closingDay, int dueDay)
    {
        var validator = new CreditCardRequestValidator();
        var result = validator.Validate(new CreditCardRequest(null, "Card", "TWD", "Issuer", "Card", "1234", 100000m, closingDay, dueDay, null));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void CreditCard_Request_Validates_Last_Four_Digits()
    {
        var validator = new CreditCardRequestValidator();
        var result = validator.Validate(new CreditCardRequest(null, "Card", "TWD", "Issuer", "Card", "12AB", 100000m, 2, 20, null));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Installment_Request_Requires_Positive_Count_And_Amount()
    {
        var validator = new InstallmentPlanRequestValidator();
        var result = validator.Validate(new InstallmentPlanRequest(Guid.NewGuid(), "Merchant", null, new DateOnly(2026, 7, 18), 0m, 0, new DateOnly(2026, 8, 2)));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void CreditCard_Request_Validates_Currency_Code()
    {
        var validator = new CreditCardRequestValidator();
        var result = validator.Validate(new CreditCardRequest(null, "Card", "TW", "Issuer", "Card", "1234", 100000m, 2, 20, null));

        Assert.False(result.IsValid);
    }
}
