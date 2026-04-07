namespace SampleApp.API.DTOs;

public record MicropostDto(string Content, int UserId);
public record EditMicropostDto(string Content);
