using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SampleApp.API.Exceptions;
using SampleApp.API.Response;

namespace SampleApp.API.Middlewares;

public class ExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlerMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlerMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlerMiddleware> logger,
        IHostEnvironment env)
    {
        _env = env;
        _logger = logger;
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Возникла ошибка...");
            _logger.LogError(ex, ex.Message);
            await ConvertExceptionAsync(context, ex);
        }
    }

    private Task ConvertExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        var httpStatusCode = HttpStatusCode.InternalServerError;
        var message = string.Empty;
        var detail = string.Empty;

        switch (exception)
        {
            case DbUpdateException dbUpdateEx:
                if (dbUpdateEx.InnerException is Npgsql.PostgresException pgEx)
                {
                    httpStatusCode = HttpStatusCode.BadRequest;
                    message = pgEx.SqlState switch
                    {
                        "23505" => "Пользователь с таким логином уже существует",
                        "23503" => "Foreign key constraint violation. The referenced record does not exist.",
                        _ => "Database error occurred"
                    };
                    detail = pgEx.Message;
                    break;
                }
                httpStatusCode = HttpStatusCode.BadRequest;
                message = "Error occurred while saving data";
                detail = dbUpdateEx.Message;
                break;

            case BadHttpRequestException badEx:
                httpStatusCode = HttpStatusCode.BadRequest;
                message = badEx.Message;
                detail = badEx.StackTrace?.ToString();
                break;

            case NotFoundException notFoundEx:
                httpStatusCode = HttpStatusCode.NotFound;
                message = notFoundEx.Message;
                detail = notFoundEx.StackTrace?.ToString();
                break;

            default:
                httpStatusCode = HttpStatusCode.InternalServerError;
                message = exception.Message;
                detail = exception.StackTrace?.ToString();
                break;
        }

        context.Response.StatusCode = (int)httpStatusCode;

        var response = _env.IsDevelopment()
            ? new ErrorResponse(context.Response.StatusCode.ToString(), message, detail)
            : new ErrorResponse(context.Response.StatusCode.ToString(), "Internal Server Error");

        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        return context.Response.WriteAsync(JsonSerializer.Serialize(response, options));
    }
}
