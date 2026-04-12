using HexaAway.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? ["http://localhost:4200"];
        policy.WithOrigins(origins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// JWT Auth — supports HS256 (plain string) or ES256 (JWK JSON string)
var jwtSecretValue = builder.Configuration["Supabase:JwtSecret"]
    ?? throw new InvalidOperationException("JWT secret not configured");

SecurityKey signingKey = jwtSecretValue.TrimStart().StartsWith("{")
    ? new Microsoft.IdentityModel.Tokens.JsonWebKey(jwtSecretValue)
    : new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretValue));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = ctx =>
            {
                Console.WriteLine($"[JWT] Auth failed: {ctx.Exception.GetType().Name}: {ctx.Exception.Message}");
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// Typed HttpClient for Supabase REST API (avoids IPv6/pooler issues with direct Postgres)
builder.Services.AddHttpClient<SupabaseService>((sp, client) =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var url = (cfg["Supabase:Url"] ?? throw new InvalidOperationException("Supabase:Url not configured"))
              .TrimEnd('/');
    var anonKey = cfg["Supabase:AnonKey"] ?? throw new InvalidOperationException("Supabase:AnonKey not configured");

    client.BaseAddress = new Uri(url + "/rest/v1/");
    client.DefaultRequestHeaders.Add("apikey", anonKey);
    client.DefaultRequestHeaders.Authorization =
        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", anonKey);
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
