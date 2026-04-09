using System.Security.Cryptography;
using System.Text;
using Bogus;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SampleApp.API.DTOs;
using SampleApp.API.Entities;
using SampleApp.API.Interfaces;
using SampleApp.API.Mappers;
using SampleApp.API.Models;
using SampleApp.API.Validations;
using Swashbuckle.AspNetCore.Annotations;

namespace SampleApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController(IUserRepository _repo, ITokenService _tokenService, IRelationRepository _relationRepo, IMicropostRepository _postRepo) : ControllerBase
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
            Token = _tokenService.CreateToken(loginDto.Login),
        };

        return Created("", _repo.CreateUser(user).ToDto());
    }

    [HttpPost("Login")]
    public ActionResult<UserDto> Login(LoginDto loginDto)
    {
        var user = _repo.FindUserByLogin(loginDto.Login);
        return CheckPasswordHash(loginDto, user);
    }

    private ActionResult<UserDto> CheckPasswordHash(LoginDto loginDto, User user)
    {
        using var hmac = new HMACSHA256(user.PasswordSalt);
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(loginDto.Password));

        for (int i = 0; i < computedHash.Length; i++)
        {
            if (computedHash[i] != user.PasswordHash[i])
                return Unauthorized("Неправильный пароль");
        }

        user.Token = _tokenService.CreateToken(user.Login);
        _repo.EditUser(user, user.Id);
        return Ok(user.ToDto());
    }

    [Authorize]
    [HttpGet]
    [SwaggerOperation(Summary = "Получение списка пользователей", OperationId = "GetUsers")]
    [SwaggerResponse(200, "Список пользователей получен успешно", typeof(List<UserDto>))]
    public ActionResult GetUsers()
    {
        return Ok(_repo.GetUsers().Select(u => u.ToDto()));
    }

    [Authorize]
    [HttpGet("option")]
    [SwaggerOperation(Summary = "Получение списка пользователей c параметрами", Description = "Возвращает ApiResult<UserDto> с пагинацией", OperationId = "GetUsersByParams")]
    [SwaggerResponse(200, "Список пользователей получен успешно", typeof(ApiResult<UserDto>))]
    public ActionResult<ApiResult<UserDto>> GetUsersByParams([FromQuery] Option opt)
    {
        return Ok(new ApiResult<UserDto>
        {
            PageNumber = opt.PageNumber,
            PageSize = opt.PageSize,
            Count = _repo.GetUsers().Count,
            Data = _repo.GetUsers(opt).Select(u => u.ToDto()).ToList(),
        });
    }

    [Authorize]
    [HttpPut]
    [SwaggerOperation(Summary = "Обновление пользователя", OperationId = "UpdateUser")]
    public ActionResult UpdateUser(EditUserDto editUserDto)
    {
        var current = _repo.FindUserById(editUserDto.Id);
        current.Login = editUserDto.Login;
        current.Name = editUserDto.Name;
        current.UpdatedAt = DateTime.UtcNow;
        return Ok(_repo.EditUser(current, current.Id).ToDto());
    }

    [Authorize]
    [HttpGet("{id}")]
    public ActionResult GetUserById(int id)
    {
        return Ok(_repo.FindUserById(id).ToDto());
    }

    [Authorize]
    [HttpDelete("{id}")]
    public ActionResult DeleteUser(int id)
    {
        return Ok(_repo.DeleteUser(id));
    }

    [Authorize]
    [HttpGet("{id}/followers")]
    [SwaggerOperation(Summary = "Получить подписчиков пользователя")]
    public ActionResult GetFollowers(int id)
    {
        return Ok(_repo.GetFollowers(id).Select(u => u.ToDto()));
    }

    [Authorize]
    [HttpGet("{id}/followeds")]
    [SwaggerOperation(Summary = "Получить подписки пользователя")]
    public ActionResult GetFolloweds(int id)
    {
        return Ok(_repo.GetFolloweds(id).Select(u => u.ToDto()));
    }

    [Authorize]
    [HttpPost("{id}/follow/{userId}")]
    [SwaggerOperation(Summary = "Подписаться на пользователя")]
    public ActionResult Follow(int id, int userId)
    {
        var relation = new Relation(id, userId);
        return Ok(_relationRepo.CreateRelation(relation));
    }

    [Authorize]
    [HttpDelete("{id}/unfollow/{userId}")]
    [SwaggerOperation(Summary = "Отписаться от пользователя")]
    public ActionResult Unfollow(int id, int userId)
    {
        var relation = _relationRepo.FindRelation(id, userId);
        return Ok(_relationRepo.DeleteRelation(relation));
    }

    [Authorize]
    [HttpGet("{userId}/microposts")]
    [SwaggerOperation(Summary = "Найти все сообщения пользователя по id", Description = "Возвращает список сообщений пользователя", OperationId = "GetMicropostByUser")]
    public ActionResult<List<MicropostDto>> GetMicropostByUser(int userId)
    {
        return _postRepo.GetMicropostsByUser(userId).Select(m => m.ToDto()).ToList();
    }

    [Authorize]
    [HttpGet("{id}/feedMessages")]
    [SwaggerOperation(Summary = "Лента сообщений пользователя", Description = "Возвращает сообщения подписок + свои", OperationId = "GetFeedMessages")]
    public ActionResult<List<MicropostDto>> GetFeedMessages(int id)
    {
        var followedUsers = _repo.GetFolloweds(id).Select(u => u.Id);
        var microposts = new List<Entities.Micropost>();

        foreach (var followedId in followedUsers)
            microposts.AddRange(_postRepo.GetMicropostsByUser(followedId));

        microposts.AddRange(_postRepo.GetMicropostsByUser(id));

        return microposts.OrderByDescending(m => m.CreatedAt).Select(m => m.ToDto()).ToList();
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
            .DistinctBy(u => u.Login)
            .Take(50);

        var users = new List<User>();
        foreach (var dto in logins)
        {
            users.Add(new User
            {
                Name = dto.Name,
                Login = dto.Login,
                PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dto.Password)),
                PasswordSalt = hmac.Key,
                Token = _tokenService.CreateToken(dto.Login),
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
