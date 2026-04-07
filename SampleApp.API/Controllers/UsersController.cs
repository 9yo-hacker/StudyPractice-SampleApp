using System.Security.Cryptography;
using System.Text;
using Bogus;
using Microsoft.AspNetCore.Mvc;
using SampleApp.API.DTOs;
using SampleApp.API.Entities;
using SampleApp.API.Interfaces;
using SampleApp.API.Mappers;
using SampleApp.API.Validations;
using Swashbuckle.AspNetCore.Annotations;

namespace SampleApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController(IUserRepository _repo) : ControllerBase
{
    [HttpPost]
    public ActionResult CreateUser(LoginDto loginDto)
    {
        var validator = new UserValidator();
        var result = validator.Validate(loginDto);

        if (!result.IsValid)
            return BadRequest(result.Errors.First().ErrorMessage);

        using var hmac = new HMACSHA256();
        var user = new User
        {
            Name = loginDto.Name,
            Login = loginDto.Login,
            PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(loginDto.Password)),
            PasswordSalt = hmac.Key,
        };

        return Created("", _repo.CreateUser(user).ToDto());
    }

    [HttpGet]
    [SwaggerOperation(Summary = "Получение списка пользователей", Description = "Возвращает всех пользователей", OperationId = "GetUsers")]
    [SwaggerResponse(200, "Список пользователей получен успешно", typeof(List<UserDto>))]
    [SwaggerResponse(404, "Пользователи не найдены")]
    public ActionResult GetUsers()
    {
        return Ok(_repo.GetUsers().Select(u => u.ToDto()));
    }

    [HttpPut]
    [SwaggerOperation(Summary = "Обновление пользователя", OperationId = "UpdateUser")]
    [SwaggerResponse(200, "Пользователь обновлён", typeof(UserDto))]
    [SwaggerResponse(404, "Пользователь не найден")]
    public ActionResult UpdateUser(EditUserDto editUserDto)
    {
        var current = _repo.FindUserById(editUserDto.Id);
        current.Login = editUserDto.Login;
        current.Name = editUserDto.Name;
        current.UpdatedAt = DateTime.UtcNow;
        return Ok(_repo.EditUser(current, current.Id).ToDto());
    }

    [HttpGet("{id}")]
    public ActionResult GetUserById(int id)
    {
        return Ok(_repo.FindUserById(id).ToDto());
    }

    [HttpDelete("{id}")]
    public ActionResult DeleteUser(int id)
    {
        return Ok(_repo.DeleteUser(id));
    }

    [HttpPost("seed")]
    [SwaggerOperation(Summary = "Заполнить БД тестовыми данными")]
    public ActionResult SeedUsers()
    {
        using var hmac = new HMACSHA256();

        var faker = new Faker<LoginDto>("en")
            .RuleFor(u => u.Name, f => f.Name.FirstName())
            .RuleFor(u => u.Login, f => (f.Random.Word() + f.Random.Number(3, 99)).Trim())
            .RuleFor(u => u.Password, f => (f.Random.Word() + f.Random.Number(3, 99)).Trim().Replace(" ", ""));

        var logins = faker.Generate(100)
            .Where(u => u.Login.Length >= 2 && u.Login.Length <= 50)
            .DistinctBy(u => u.Login);

        var users = new List<User>();
        foreach (var dto in logins)
        {
            users.Add(new User
            {
                Name = dto.Name,
                Login = dto.Login,
                PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dto.Password)),
                PasswordSalt = hmac.Key,
            });
        }

        try
        {
            foreach (var u in users) _repo.CreateUser(u);
            return Ok(users.Select(u => u.ToDto()));
        }
        catch (Exception ex)
        {
            return BadRequest(ex.InnerException?.Message ?? ex.Message);
        }
    }
}
