using SampleApp.API.Interfaces;
using SampleApp.API.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSwaggerGen(c =>
{
    c.EnableAnnotations();
    c.SwaggerDoc("v1", new() { Title = "SampleApp", Version = "v1", Description = "API для пользователей" });
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

builder.Services.AddSingleton<IUserRepository, UsersMemoryRepository>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.MapControllers();
app.Run();
