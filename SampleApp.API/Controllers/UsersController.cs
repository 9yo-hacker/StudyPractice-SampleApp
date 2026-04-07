using Microsoft.AspNetCore.Mvc;
using SampleApp.API.Entities;
using SampleApp.API.Interfaces;
using SampleApp.API.Validations;
using Swashbuckle.AspNetCore.Annotations;

namespace SampleApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _repo;

    public UsersController(IUserRepository repo)
    {
        _repo = repo;
    }

    [HttpPost]
    public ActionResult CreateUser(User user)
    {
        var validator = new UserValidator();
        var result = validator.Validate(user);

        if (!result.IsValid)
            return BadRequest(result.Errors.First().ErrorMessage);

        var createdUser = _repo.CreateUser(user);
        return CreatedAtAction(nameof(GetUserById), new { id = createdUser.Id }, createdUser);
    }

    [HttpGet]
    [SwaggerOperation(Summary = "Получение списка пользователей", Description = "Возвращает всех пользователей", OperationId = "GetUsers")]
    [SwaggerResponse(200, "Список пользователей получен успешно", typeof(List<User>))]
    [SwaggerResponse(404, "Пользователи не найдены")]
    public ActionResult GetUsers()
    {
        return Ok(_repo.GetUsers());
    }

    [HttpPut]
    public ActionResult UpdateUser(User user)
    {
        return Ok(_repo.EditUser(user, user.Id));
    }

    [HttpGet("{id}")]
    public ActionResult GetUserById(int id)
    {
        return Ok(_repo.FindUserById(id));
    }

    [HttpDelete("{id}")]
    public ActionResult DeleteUser(int id)
    {
        return Ok(_repo.DeleteUser(id));
    }
}
