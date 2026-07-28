using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PersonalFinance.Api.Endpoints;
using PersonalFinance.Api.Services;
using PersonalFinance.Application;
using PersonalFinance.Application.Abstractions.Authentication;
using PersonalFinance.Infrastructure;
using PersonalFinance.Infrastructure.Authentication;
using PersonalFinance.Infrastructure.Seeding;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

var port = builder.Configuration["PORT"];
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console();
});

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter a JWT access token."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme
        {
            Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
        }] = []
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:3100"])
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
var jwtSigningKey = string.IsNullOrWhiteSpace(jwtOptions.SigningKey)
    ? builder.Configuration["Jwt:Key"] ?? string.Empty
    : jwtOptions.SigningKey;
if (string.IsNullOrWhiteSpace(jwtSigningKey) || jwtSigningKey.Length < 32)
{
    throw new InvalidOperationException("Jwt:SigningKey or Jwt:Key must be configured and at least 32 characters long.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization();

builder.Services
    .AddHealthChecks()
    .AddNpgSql(
        builder.Configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required."),
        name: "postgresql",
        tags: ["database", "postgresql"])
    .AddRedis(
        builder.Configuration.GetConnectionString("Redis")
            ?? throw new InvalidOperationException("ConnectionStrings:Redis is required."),
        name: "redis",
        tags: ["cache", "redis"]);

var app = builder.Build();

if (args.Contains("--seed-development", StringComparer.OrdinalIgnoreCase))
{
    if (!app.Environment.IsDevelopment())
    {
        Console.Error.WriteLine("Development seed can only run in the Development environment.");
        Environment.ExitCode = 1;
        return;
    }

    var dryRun = args.Contains("--dry-run", StringComparer.OrdinalIgnoreCase);
    using var scope = app.Services.CreateScope();
    var seeder = scope.ServiceProvider.GetRequiredService<DevelopmentDataSeeder>();
    var report = await seeder.SeedAsync(new DevelopmentSeedRunOptions(dryRun), CancellationToken.None);
    Console.WriteLine(report);
    return;
}
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exceptionFeature = context.Features.Get<IExceptionHandlerFeature>();
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();

        if (exceptionFeature?.Error is not null)
        {
            logger.LogError(exceptionFeature.Error, "Unhandled exception");
        }

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";

        await Results.Problem(
            title: "An unexpected error occurred.",
            statusCode: StatusCodes.Status500InternalServerError)
            .ExecuteAsync(context);
    });
});

app.UseForwardedHeaders();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => Results.Redirect("/health"))
    .ExcludeFromDescription();

app.MapAuthEndpoints();
app.MapAccountEndpoints();
app.MapCategoryEndpoints();
app.MapTransactionEndpoints();
app.MapCreditCardEndpoints();
app.MapRecurringTransactionEndpoints();
app.MapStatementImportEndpoints();
app.MapUserSettingsEndpoints();

var exposeDetailedHealth = app.Environment.IsDevelopment();
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";

        object payload = exposeDetailedHealth
            ? new
            {
                status = report.Status.ToString(),
                totalDuration = report.TotalDuration.TotalMilliseconds,
                checks = report.Entries.Select(entry => new
                {
                    name = entry.Key,
                    status = entry.Value.Status.ToString(),
                    duration = entry.Value.Duration.TotalMilliseconds,
                    description = entry.Value.Description,
                    error = entry.Value.Exception?.Message,
                    tags = entry.Value.Tags
                })
            }
            : new
            {
                status = report.Status.ToString()
            };

        await JsonSerializer.SerializeAsync(
            context.Response.Body,
            payload,
            new JsonSerializerOptions(JsonSerializerDefaults.Web));
    }
});

app.Run();

public partial class Program;

