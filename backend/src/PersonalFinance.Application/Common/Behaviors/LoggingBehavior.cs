using MediatR;
using Microsoft.Extensions.Logging;

namespace PersonalFinance.Application.Common.Behaviors;

public sealed class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private static readonly string[] SensitiveNames = ["password", "token", "passwordhash", "accesstoken", "refreshtoken"];
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        var hasSensitiveName = SensitiveNames.Any(name => requestName.Contains(name, StringComparison.OrdinalIgnoreCase));
        _logger.LogInformation("Handling {RequestName}{Redacted}", requestName, hasSensitiveName ? " with sensitive fields redacted" : string.Empty);
        var response = await next();
        _logger.LogInformation("Handled {RequestName}", requestName);
        return response;
    }
}
