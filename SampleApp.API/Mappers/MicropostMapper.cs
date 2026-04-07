using SampleApp.API.DTOs;
using SampleApp.API.Entities;

namespace SampleApp.API.Mappers;

public static class MicropostMapper
{
    public static MicropostDto ToDto(this Micropost micropost)
    {
        return new MicropostDto(micropost.Content, micropost.UserId);
    }
}
