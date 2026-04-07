using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SampleApp.API.DTOs;
using SampleApp.API.Entities;
using SampleApp.API.Interfaces;
using SampleApp.API.Models;
using Swashbuckle.AspNetCore.Annotations;

namespace SampleApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MicropostsController(IMicropostRepository repo) : ControllerBase
{
    [Authorize]
    [HttpGet]
    [SwaggerOperation(Summary = "Получение списка сообщений", Description = "Возвращает все сообщения", OperationId = "GetMicroposts")]
    [SwaggerResponse(200, "Список сообщений получен успешно", typeof(List<Micropost>))]
    public ActionResult<List<Micropost>> GetMicroposts() => Ok(repo.GetMicroposts());

    [Authorize]
    [HttpGet("option")]
    [SwaggerOperation(Summary = "Получение сообщений с пагинацией", OperationId = "GetMicropostsByParams")]
    [SwaggerResponse(200, "Список сообщений получен успешно", typeof(ApiResult<Micropost>))]
    public ActionResult<ApiResult<Micropost>> GetMicropostsByParams([FromQuery] Option opt)
    {
        return Ok(new ApiResult<Micropost>
        {
            PageNumber = opt.PageNumber,
            PageSize = opt.PageSize,
            Count = repo.GetMicroposts().Count,
            Data = repo.GetMicroposts(opt),
        });
    }

    [Authorize]
    [HttpPost]
    [SwaggerOperation(Summary = "Создание сообщения")]
    [SwaggerResponse(201, "Сообщение успешно создано", typeof(Micropost))]
    public ActionResult<Micropost> CreateMicropost(MicropostDto postDto)
    {
        var post = new Micropost { Content = postDto.Content, UserId = postDto.UserId };
        return Created("", repo.CreateMicropost(post));
    }

    [Authorize]
    [HttpGet("{id}")]
    public ActionResult<Micropost> GetMicropost(int id) => Ok(repo.FindMicropostById(id));

    [Authorize]
    [HttpPut("{id}")]
    public ActionResult<Micropost> UpdateMicropost(EditMicropostDto editMicropostDto, int id)
    {
        var micropost = new Micropost { Id = id, Content = editMicropostDto.Content };
        return Ok(repo.EditMicropost(micropost, id));
    }

    [Authorize]
    [HttpDelete("{id}")]
    public ActionResult<Micropost> DeleteMicropost(int id) => Ok(repo.DeleteMicropost(id));
}
