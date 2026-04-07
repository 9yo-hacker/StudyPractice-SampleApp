using SampleApp.API.DTOs;
using SampleApp.API.Entities;

namespace SampleApp.API.Mappers;

public static class UserMapper
{
    public static UserDto ToDto(this User user)
    {
        return new UserDto
        {
            Id = user.Id,
            Login = user.Login,
            Name = user.Name,
            Token = user.Token,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
        };
    }

    public static User ToEntity(this UserDto userDto)
    {
        return new User
        {
            Id = userDto.Id,
            Login = userDto.Login,
            Name = userDto.Name,
            Token = userDto.Token,
            CreatedAt = userDto.CreatedAt,
            UpdatedAt = userDto.UpdatedAt,
            PasswordHash = null!,
            PasswordSalt = null!,
        };
    }
}
