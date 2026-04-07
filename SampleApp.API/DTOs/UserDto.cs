using SampleApp.API.Entities;

namespace SampleApp.API.DTOs;

public class UserDto : Base
{
    public string Name { get; set; } = string.Empty;
    public required string Login { get; set; }
}
