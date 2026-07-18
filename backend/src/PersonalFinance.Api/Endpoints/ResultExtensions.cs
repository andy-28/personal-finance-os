using PersonalFinance.Application.Common;

namespace PersonalFinance.Api.Endpoints;

public static class ResultExtensions
{
    public static IResult ToHttpResult(this Result result)
    {
        return result.IsSuccess ? Results.NoContent() : ToProblem(result);
    }

    public static IResult ToHttpResult<T>(this Result<T> result, Func<T, IResult>? onSuccess = null)
    {
        return result.IsSuccess ? (onSuccess?.Invoke(result.Value) ?? Results.Ok(result.Value)) : ToProblem(result);
    }

    private static IResult ToProblem(Result result)
    {
        var error = result.FirstError ?? Error.Failure("Failure", "Request failed.");
        var status = error.Type switch
        {
            ErrorType.Validation => StatusCodes.Status400BadRequest,
            ErrorType.NotFound => StatusCodes.Status404NotFound,
            ErrorType.Conflict => StatusCodes.Status409Conflict,
            ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
            ErrorType.Forbidden => StatusCodes.Status403Forbidden,
            _ => StatusCodes.Status500InternalServerError
        };

        return Results.Problem(
            title: error.Code,
            detail: error.Message,
            statusCode: status,
            extensions: new Dictionary<string, object?> { ["errors"] = result.Errors.Select(e => new { e.Code, e.Message, Type = e.Type.ToString() }).ToArray() });
    }
}
