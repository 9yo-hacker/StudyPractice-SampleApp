using Microsoft.EntityFrameworkCore;
using SampleApp.API.Data;
using SampleApp.API.Extensions;
using SampleApp.API.Interfaces;
using SampleApp.API.Middlewares;
using SampleApp.API.Repositories;
using SampleApp.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllerServices();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

builder.Services.AddDbContext<SampleAppContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("PostgreSQL")));

builder.Services.AddFluentValidationServices();
builder.Services.AddJwtServices(builder.Configuration);

builder.Services.AddScoped<IUserRepository, UsersRepository>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IMicropostRepository, MicropostRepository>();
builder.Services.AddScoped<IRelationRepository, RelationRepository>();

var app = builder.Build();

app.UseMiddleware<ExceptionHandlerMiddleware>();
app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
